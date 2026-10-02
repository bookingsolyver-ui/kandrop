import "server-only";
import { randomBytes } from "node:crypto";
import { db, isUniqueViolation, must } from "@/server/db/client";
import { ApiError } from "@/server/http/errors";
import type { CheckoutSession } from "@/server/modules/checkout/schema";
import { orderRepository } from "@/server/modules/orders/repository";
import type { OrderRecord } from "@/server/modules/orders/schema";
import type { PaymentRecord } from "@/server/modules/payments/schema";
import type { PaymentMethod } from "@/shared/checkout/schemas";
import { canAdvanceLogistics, type LogisticsStatus } from "@/shared/fulfilment/schemas";
import { CASH_ON_DELIVERY, canMovePayment, isCashOnDelivery, isPaymentVerified, normalizePaymentProvider, normalizePaymentStatus, type OrderPaymentProvider, type OrderPaymentStatus, type PaymentEvidence } from "@/shared/payments/orderPayment";
import { ORDER_STATUSES, canTransition, type OrderStatus } from "@/shared/orders/schemas";

import { storeRepository } from "@/server/modules/store/repository";
import { PLATFORM_COMMISSION_BPS } from "@/shared/products/schemas";
import { splitSale, type Split } from "./split";
export { splitSale, type Split };

// ── Rows ──────────────────────────────────────────────────────────────────────────────────

export interface SupplierOrder {
  id: string;
  orderId: string;
  orderNumber: number;
  storeId: string;
  storeName: string;
  supplierId: string;
  supplierName: string;
  supplierProductId: string | null;
  productTitle: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  saleTotal: number;
  costTotal: number;
  margin: number;
  commissionBps: number;
  commission: number;
  merchantNet: number;
  status: LogisticsStatus;
  /** Copy of the order's payment state: the supplier's money is released only when this is `paid_verified` AND delivered. */
  paymentStatus: OrderPaymentStatus;
  history: Array<{ status: LogisticsStatus; at: number }>;
  createdAt: number;
  updatedAt: number;
}

const SO_COLUMNS = "*, suppliers(company_name)";

function toSupplierOrder(r: Record<string, unknown>): SupplierOrder {
  return {
    id: String(r.id),
    orderId: String(r.order_id),
    orderNumber: Number(r.order_number),
    storeId: String(r.store_id),
    storeName: String(r.store_name),
    supplierId: String(r.supplier_id),
    supplierName: String((r.suppliers as { company_name?: string } | null)?.company_name ?? "—"),
    supplierProductId: r.supplier_product_id == null ? null : String(r.supplier_product_id),
    productTitle: String(r.product_title),
    quantity: Number(r.quantity),
    unitCost: Number(r.unit_cost),
    unitPrice: Number(r.unit_price),
    saleTotal: Number(r.sale_total),
    costTotal: Number(r.cost_total),
    margin: Number(r.margin),
    commissionBps: Number(r.commission_bps),
    commission: Number(r.commission),
    merchantNet: Number(r.merchant_net),
    status: r.logistics_status as LogisticsStatus,
    paymentStatus: normalizePaymentStatus(r.payment_status),
    history: (r.history as SupplierOrder["history"]) ?? [],
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}

export interface Invoice {
  id: string;
  number: string;
  party: "merchant" | "supplier";
  supplierOrderId: string;
  orderNumber: number;
  lines: Array<{ kind: "sale" | "supplier_cost" | "commission" | "discount" | "shipping" | "due"; description: string; quantity?: number; amount: number }>;
  saleTotal: number;
  costTotal: number;
  commission: number;
  net: number;
  createdAt: number;
}

const toInvoice = (r: Record<string, unknown>): Invoice => ({
  id: String(r.id),
  number: String(r.number),
  party: r.party as Invoice["party"],
  supplierOrderId: String(r.supplier_order_id),
  orderNumber: Number(r.order_number),
  lines: (r.lines as Invoice["lines"]) ?? [],
  saleTotal: Number(r.sale_total),
  costTotal: Number(r.cost_total),
  commission: Number(r.commission),
  net: Number(r.net),
  createdAt: Number(r.created_at),
});

async function nextNumber(sequence: string, prefix: string, year: number): Promise<string> {
  const value = Number(must("invoice.sequence", await db().rpc("next_sequence", { seq_name: `${sequence}:${year}` })));
  return `${prefix} ${year}/${String(value).padStart(6, "0")}`;
}

// ── Placing an order ──────────────────────────────────────────────────────────────────────

/** Next free order number of the store (unique on (store, number); a race is retried by the caller). */
async function nextOrderNumber(storeId: string): Promise<number> {
  const row = must("orders.max", await db().from("orders").select("number").eq("store_id", storeId).order("number", { ascending: false }).limit(1).maybeSingle());
  return (row ? Number(row.number) : 1000) + 1;
}

const REFERENCE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
/** The payment reference the shopper quotes on the WhatsApp slip: short, unambiguous, unique enough to search. */
const newPaymentReference = () => "KD-" + Array.from(randomBytes(8), (b) => REFERENCE_ALPHABET[b % REFERENCE_ALPHABET.length]).join("");

export interface PlaceOrderInput {
  storeId: string;
  storeName: string;
  /** The store product that is sold. */
  productId: string;
  item: { name: string; quantity: number; unitAmount: number };
  /** What the SHOPPER pays for delivery (0 when the merchant bears it). */
  shippingAmount: number;
  /** Delivery the MERCHANT absorbs: it comes out of their share, not the shopper's total. */
  merchantShipping?: number;
  buyer: { customer: { name: string; phone: string; email?: string }; address: { street: string; city: string; province: string; reference?: string; deliveryDate?: string } };
  /** An ALREADY VALIDATED coupon (see `coupons/service.ts`): its discount comes out of the merchant's margin only. */
  coupon?: { code: string; discount: number };
  /** Who will verify the payment. */
  provider: OrderPaymentProvider;
  method: PaymentMethod | typeof CASH_ON_DELIVERY;
  /** A reference that is already known (a provider's), or a fresh `KD-…` one is made. */
  reference?: string;
}

/**
 * Creates the order, UNPAID (`pending_payment`), and, when the product was imported from a supplier, the
 * supplier's line (to prepare), Kandrop's commission split computed NOW, the supplier's stock movement and the
 * two financial records. The supplier's money stays PENDING: it moves on only when the payment is verified
 * and the parcel delivered. Idempotent on `reference`: the same provider payment never creates a second order.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<{ order: OrderRecord; line: SupplierOrder | null }> {
  const reference = input.reference ?? newPaymentReference();
  if (input.reference) {
    const existing = must("orders.byReference", await db().from("orders").select("id,store_id").eq("store_id", input.storeId).eq("payment->>reference", reference).maybeSingle());
    if (existing) {
      const order = await orderRepository.get(input.storeId, String(existing.id));
      if (order) return { order, line: null };
    }
  }
  const now = Date.now();

  let order: OrderRecord | null = null;
  for (let attempt = 0; attempt < 5 && !order; attempt++) {
    const subtotal = input.item.unitAmount * input.item.quantity;
    const candidate: OrderRecord = {
      id: `ord_${randomBytes(12).toString("base64url")}`, // unguessable: it is also the shopper's link to the order page
      storeId: input.storeId,
      number: await nextOrderNumber(input.storeId),
      status: "pending",
      customer: { name: input.buyer.customer.name, phone: input.buyer.customer.phone, email: input.buyer.customer.email },
      address: { street: input.buyer.address.street, city: input.buyer.address.city, province: input.buyer.address.province, reference: input.buyer.address.reference, deliveryDate: input.buyer.address.deliveryDate },
      items: [{ name: input.item.name, productId: input.productId, quantity: input.item.quantity, unitAmount: input.item.unitAmount }],
      shippingAmount: input.shippingAmount,
      total: subtotal - (input.coupon?.discount ?? 0) + input.shippingAmount,
      currency: "AOA",
      payment: { method: input.method, reference, paidAt: 0, ...(input.coupon ? { coupon: { code: input.coupon.code, discount: input.coupon.discount } } : {}) },
      paymentStatus: "pending_payment",
      paymentProvider: input.provider,
      history: [{ status: "pending", at: now }],
      createdAt: now,
      updatedAt: now,
    };
    const { error } = await db().from("orders").insert({
      id: candidate.id, store_id: candidate.storeId, number: candidate.number, status: candidate.status,
      customer: candidate.customer, address: candidate.address, items: candidate.items,
      shipping_amount: candidate.shippingAmount, total: candidate.total, currency: candidate.currency,
      payment: candidate.payment, payment_status: candidate.paymentStatus, payment_provider: candidate.paymentProvider,
      tracking_code: null, history: candidate.history, created_at: candidate.createdAt, updated_at: candidate.updatedAt,
    });
    if (!error) order = candidate;
    else if (!isUniqueViolation(error)) must("orders.insert", { data: null, error });
  }
  if (!order) throw new Error("could not allocate an order number");

  // Was the product imported from a supplier? Then there is a line to prepare and money to split.
  const link = must("imports.byProduct", await db().from("supplier_imports").select("supplier_product_id").eq("store_id", input.storeId).eq("product_id", input.productId).maybeSingle());
  if (!link) return { order, line: null };
  const sp = must("supplier_products.forOrder", await db().from("supplier_products").select("id,supplier_id,name,cost_price").eq("id", link.supplier_product_id).maybeSingle());
  if (!sp) return { order, line: null };

  const split = splitSale(input.item.unitAmount, Number(sp.cost_price), input.item.quantity, PLATFORM_COMMISSION_BPS, input.coupon?.discount ?? 0, input.merchantShipping ?? 0);
  const { data: lineRow, error } = await db().from("supplier_orders").insert({
    order_id: order.id, order_number: order.number, store_id: input.storeId, store_name: input.storeName,
    supplier_id: sp.supplier_id, supplier_product_id: sp.id, product_title: input.item.name,
    quantity: input.item.quantity, unit_cost: Number(sp.cost_price), unit_price: input.item.unitAmount,
    sale_total: split.saleTotal, cost_total: split.costTotal, margin: split.margin,
    commission_bps: split.commissionBps, commission: split.commission, merchant_net: split.merchantNet,
    logistics_status: "pending", payment_status: "pending_payment", history: [{ status: "pending", at: now }], created_at: now, updated_at: now,
  }).select(SO_COLUMNS).single();
  if (error || !lineRow) {
    if (isUniqueViolation(error)) return { order, line: null }; // this order's line already exists
    must("supplier_orders.insert", { data: null, error });
    return { order, line: null };
  }

  // The supplier's stock is reserved with the order (atomic). Never negative: an oversold unit is logged for the team.
  const remaining = must("supplier_stock", await db().rpc("reserve_supplier_stock", { p_supplier_product_id: sp.id, p_qty: input.item.quantity }));
  if (remaining === null) console.error("[fulfilment] OVERSOLD: the supplier has less stock than was sold", { supplierProduct: sp.id, order: order.number });
  // Remember what was REALLY reserved: cancelling gives back exactly this (an oversold sale reserved nothing).
  else {
    const { error: reservedError } = await db().from("supplier_orders").update({ stock_reserved: input.item.quantity }).eq("id", lineRow.id);
    if (reservedError) console.error("[fulfilment] could not record the reserved stock (is the cancel_order migration applied?)", reservedError.code, reservedError.message);
  }

  const year = new Date(now).getUTCFullYear();
  const base = { supplier_order_id: lineRow.id, order_id: order.id, order_number: order.number, store_id: input.storeId, supplier_id: sp.supplier_id, sale_total: split.saleTotal, cost_total: split.costTotal, commission: split.commission, currency: "AOA", created_at: now };
  const merchantLines: Invoice["lines"] = [
    { kind: "sale", description: input.item.name, quantity: input.item.quantity, amount: split.saleTotal },
    { kind: "supplier_cost", description: input.item.name, quantity: input.item.quantity, amount: -split.costTotal },
    { kind: "commission", description: `${split.commissionBps / 100}%`, amount: -split.commission },
    ...(split.shipping > 0 ? [{ kind: "shipping" as const, description: input.buyer.address.province, amount: -split.shipping }] : []),
    ...(split.discount > 0 ? [{ kind: "discount" as const, description: input.coupon?.code ?? "", amount: -split.discount }] : []),
  ];
  const supplierLines: Invoice["lines"] = [{ kind: "due", description: input.item.name, quantity: input.item.quantity, amount: split.costTotal }];
  must("invoices.insert", await db().from("order_invoices").insert([
    { ...base, id: `inv_m_${lineRow.id.slice(0, 12)}`, number: await nextNumber("invoice-merchant", "EM", year), party: "merchant", lines: merchantLines, net: split.merchantNet },
    { ...base, id: `inv_s_${lineRow.id.slice(0, 12)}`, number: await nextNumber("invoice-supplier", "NR", year), party: "supplier", lines: supplierLines, net: split.costTotal },
  ]));
  return { order, line: toSupplierOrder(lineRow) };
}

// ── Verifying the payment (THE financial trigger) ─────────────────────────────────────────

/**
 * WHO may move an order's payment forward, by provider (the strategy):
 *  - `manual_whatsapp_transfer`: only a Kandrop administrator, who has seen the slip on WhatsApp;
 *  - `multicaixa_express_api`: only that provider itself (its signed webhook), never a person.
 * A future provider is one more entry here and one more caller of `confirmOrderPayment`.
 */
export type VerificationSource =
  | { kind: "admin"; operatorId: string; operatorEmail: string | null }
  | { kind: "provider"; provider: OrderPaymentProvider; reference: string };

const mayVerify = (provider: OrderPaymentProvider, source: VerificationSource) =>
  source.kind === "provider" ? source.provider === provider : provider === "manual_whatsapp_transfer";

async function paymentOrder(orderId: string) {
  const row = must("orders.payment.get", await db().from("orders").select("id,store_id,number,payment,payment_status,payment_provider,payment_evidence").eq("id", orderId).maybeSingle());
  if (!row) throw new ApiError("not_found");
  return {
    id: String(row.id), storeId: String(row.store_id), number: Number(row.number),
    payment: row.payment as OrderRecord["payment"],
    status: normalizePaymentStatus(row.payment_status),
    provider: normalizePaymentProvider(row.payment_provider),
    evidence: (row.payment_evidence ?? {}) as NonNullable<OrderRecord["paymentEvidence"]>,
  };
}

/** Only the fields that were given: an absent field must not overwrite what an earlier step recorded. */
const cleanEvidence = (e: PaymentEvidence | undefined): PaymentEvidence => {
  const out: PaymentEvidence = {};
  const reference = e?.reference?.trim().slice(0, 80);
  const note = e?.note?.trim().slice(0, 300);
  if (reference) out.reference = reference;
  if (note) out.note = note;
  return out;
};

/** The slip arrived on WhatsApp (optionally with its reference or a note). Administrators only; manual provider only. */
export async function registerPaymentProof(orderId: string, source: VerificationSource, evidence?: PaymentEvidence): Promise<{ before: OrderPaymentStatus }> {
  const o = await paymentOrder(orderId);
  if (!mayVerify(o.provider, source)) throw new ApiError("forbidden");
  if (!canMovePayment(o.status, "proof_submitted")) throw new ApiError("invalid_transition");
  const now = Date.now();
  const proofBy = source.kind === "admin" ? source.operatorEmail ?? source.operatorId : `provider:${source.provider}`;
  const updated = must("orders.proof", await db().from("orders").update({
    payment_status: "proof_submitted",
    payment_evidence: { ...o.evidence, ...cleanEvidence(evidence), proofAt: now, proofBy },
    updated_at: now,
  }).eq("id", orderId).eq("payment_status", "pending_payment").select("id").maybeSingle());
  if (!updated) throw new ApiError("invalid_transition");
  must("supplier_orders.proof", await db().from("supplier_orders").update({ payment_status: "proof_submitted" }).eq("order_id", orderId));
  return { before: o.status };
}

/**
 * THE method every provider ends in. The money is confirmed: the order becomes `paid_verified`, its supplier
 * lines follow, and from this moment the parcel may be delivered and the supplier's money released. Idempotent
 * (a repeated confirmation, e.g. a webhook retry, changes nothing) and race-safe (compare-and-set).
 */
export async function confirmOrderPayment(orderId: string, source: VerificationSource, evidence?: PaymentEvidence): Promise<{ before: OrderPaymentStatus; changed: boolean }> {
  const o = await paymentOrder(orderId);
  if (!mayVerify(o.provider, source)) throw new ApiError("forbidden");
  if (isPaymentVerified(o.status)) return { before: o.status, changed: false };
  if (!canMovePayment(o.status, "paid_verified")) throw new ApiError("invalid_transition");
  const now = Date.now();
  const verifiedBy = source.kind === "admin" ? source.operatorEmail ?? source.operatorId : `provider:${source.provider}`;
  const ev = cleanEvidence(evidence);
  if (source.kind === "provider") ev.reference = ev.reference ?? source.reference;
  const updated = must("orders.verify", await db().from("orders").update({
    payment_status: "paid_verified",
    payment: { ...o.payment, paidAt: now },
    payment_evidence: { ...o.evidence, ...ev, verifiedAt: now, verifiedBy },
    updated_at: now,
  }).eq("id", orderId).neq("payment_status", "paid_verified").select("id").maybeSingle());
  if (!updated) return { before: o.status, changed: false }; // someone else verified it a moment ago
  must("supplier_orders.verify", await db().from("supplier_orders").update({ payment_status: "paid_verified" }).eq("order_id", orderId));
  return { before: o.status, changed: true };
}

// ── The legacy (Multicaixa-style) paid checkout: same transition, different caller ────────

/**
 * A paid checkout session (the provider confirmed the payment) becomes an order and is verified through the very
 * same `confirmOrderPayment` the administrator's button uses. A failure never undoes the payment: it is logged.
 */
export async function fulfilPaidCheckout(session: CheckoutSession, payment: PaymentRecord): Promise<void> {
  if (session.subscription || !session.productId || !session.buyer) return;
  const item = session.items[0];
  if (!item) return;
  try {
    const { order } = await placeOrder({
      storeId: session.storeId, storeName: session.storeName, productId: session.productId, item,
      shippingAmount: session.shippingAmount, buyer: session.buyer,
      provider: "multicaixa_express_api", method: payment.method, reference: payment.reference,
    });
    await confirmOrderPayment(order.id, { kind: "provider", provider: "multicaixa_express_api", reference: payment.reference });
  } catch (err) {
    console.error("[fulfilment] FAILED to create the order for a paid checkout; needs manual recovery", { payment: payment.reference, session: session.id }, err instanceof Error ? err.message : err);
  }
}

// ── Reading ───────────────────────────────────────────────────────────────────────────────

export interface AdminOrderRow {
  orderId: string;
  orderNumber: number;
  orderStatus: OrderStatus;
  storeId: string;
  storeName: string;
  createdAt: number;
  total: number;
  paymentStatus: OrderPaymentStatus;
  paymentProvider: OrderPaymentProvider;
  paymentReference: string;
  evidence: { reference?: string; note?: string; proofAt?: number; verifiedAt?: number; verifiedBy?: string };
  customer: { name: string; phone: string; email?: string } | null;
  address: { street: string; city: string; province: string; reference?: string; deliveryDate?: string } | null;
  /** Cash on delivery: nothing to verify, the parcel may go and the payment is settled on delivery. */
  cashOnDelivery: boolean;
  coupon: string | null;
  productTitle: string;
  /** The supplier's line, when the product came from a supplier (logistics applies to it). */
  line: (SupplierOrder & { invoices: Array<{ party: "merchant" | "supplier"; number: string }> }) | null;
}

/** Admin: EVERY order of the platform (supplier products or not), newest first, with its payment and its parcel. */
export async function listAllLogistics(limit = 300): Promise<AdminOrderRow[]> {
  const orders = must("admin.orders", await db().from("orders").select("id,store_id,number,status,total,customer,address,items,payment,payment_status,payment_provider,payment_evidence,created_at").order("created_at", { ascending: false }).limit(limit)) ?? [];
  if (!orders.length) return [];
  const ids = orders.map((o) => String(o.id));
  const lines = (must("admin.lines", await db().from("supplier_orders").select(SO_COLUMNS).in("order_id", ids)) ?? []).map(toSupplierOrder);
  const invoices = lines.length ? must("admin.invoices", await db().from("order_invoices").select("supplier_order_id,party,number").in("supplier_order_id", lines.map((l) => l.id))) ?? [] : [];
  const storeIds = [...new Set(orders.map((o) => String(o.store_id)))];
  const stores = must("admin.stores", await db().from("stores").select("id,name").in("id", storeIds)) ?? [];
  const storeName = new Map<string, string>(stores.map((st) => [String(st.id), String(st.name)]));
  const lineOf = new Map(lines.map((l) => [l.orderId, l]));
  return orders.map((o) => {
    const line = lineOf.get(String(o.id)) ?? null;
    const items = (o.items as Array<{ name: string }>) ?? [];
    return {
      orderId: String(o.id),
      orderNumber: Number(o.number),
      orderStatus: (ORDER_STATUSES as readonly string[]).includes(String(o.status)) ? (o.status as OrderStatus) : "pending",
      storeId: String(o.store_id),
      storeName: line?.storeName ?? storeName.get(String(o.store_id)) ?? String(o.store_id),
      createdAt: Number(o.created_at),
      total: Number(o.total),
      paymentStatus: normalizePaymentStatus(o.payment_status),
      paymentProvider: normalizePaymentProvider(o.payment_provider),
      paymentReference: String((o.payment as { reference?: string } | null)?.reference ?? ""),
      evidence: (o.payment_evidence ?? {}) as AdminOrderRow["evidence"],
      customer: (o.customer as AdminOrderRow["customer"]) ?? null,
      address: (o.address as AdminOrderRow["address"]) ?? null,
      cashOnDelivery: isCashOnDelivery(o.payment as { method?: unknown } | null),
      coupon: (o.payment as { coupon?: { code?: string } } | null)?.coupon?.code ?? null,
      productTitle: line?.productTitle ?? items[0]?.name ?? "—",
      line: line ? { ...line, invoices: invoices.filter((i) => String(i.supplier_order_id) === line.id).map((i) => ({ party: i.party as "merchant" | "supplier", number: String(i.number) })) } : null,
    };
  });
}

/** A supplier's own lines (always filtered by the supplier id), with its remittance-note numbers. */
export async function listSupplierOrders(supplierId: string, limit = 300) {
  const rows = (must("supplierOrders.list", await db().from("supplier_orders").select(SO_COLUMNS).eq("supplier_id", supplierId).order("created_at", { ascending: false }).limit(limit)) ?? []).map(toSupplierOrder);
  const inv = rows.length ? must("supplierOrders.invoices", await db().from("order_invoices").select("*").eq("supplier_id", supplierId).eq("party", "supplier").in("supplier_order_id", rows.map((r) => r.id))) ?? [] : [];
  const byLine = new Map(inv.map((i) => [String(i.supplier_order_id), toInvoice(i)]));
  return rows.map((r) => ({ ...r, invoice: byLine.get(r.id) ?? null }));
}

/** A merchant's statements (their side of each sale), filtered by store. */
export async function listMerchantStatements(storeId: string, limit = 100) {
  const data = must("statements.list", await db().from("order_invoices").select("*").eq("store_id", storeId).eq("party", "merchant").order("created_at", { ascending: false }).limit(limit)) ?? [];
  return data.map(toInvoice);
}

// ── Moving the parcel ─────────────────────────────────────────────────────────────────────

/** Which merchant-order status each logistics step implies. */
const ORDER_FOR: Partial<Record<LogisticsStatus, OrderStatus>> = { preparing: "processing", in_transit: "shipped", delivered: "delivered" };

/**
 * Kandrop moves a supplier order one step forward. The merchant's own order follows (processing →
 * shipped → delivered), so the merchant sees the same journey. Returns the previous status.
 */
export async function advanceLogistics(id: string, to: LogisticsStatus): Promise<{ before: LogisticsStatus; row: SupplierOrder }> {
  const current = must("logistics.get", await db().from("supplier_orders").select(SO_COLUMNS).eq("id", id).maybeSingle());
  if (!current) throw new ApiError("not_found");
  const row = toSupplierOrder(current);
  if (!canAdvanceLogistics(row.status, to)) throw new ApiError("invalid_transition");
  // THE golden rule: a parcel is not delivered before Kandrop has verified the payment. The check reads the
  // ORDER (the source of truth), not the copy on the line. (In transit stays possible: cash-on-delivery runs.)
  // Cash on delivery is the exception: the shopper pays the courier on arrival, so there is nothing to verify first.
  let cod = false;
  if (to === "delivered") {
    const o = await paymentOrder(row.orderId);
    cod = isCashOnDelivery(o.payment);
    if (!cod && !isPaymentVerified(o.status)) throw new ApiError("payment_unverified");
  }

  const now = Date.now();
  const history = [...row.history, { status: to, at: now }];
  // Compare-and-set on the old status: two admins clicking at once cannot both advance the same step.
  const updated = must("logistics.update", await db().from("supplier_orders").update({ logistics_status: to, history, updated_at: now }).eq("id", id).eq("logistics_status", row.status).select(SO_COLUMNS).maybeSingle());
  if (!updated) throw new ApiError("invalid_transition");

  // Delivered cash on delivery: the courier collected the money, so the payment is settled now (this releases the
  // supplier's and the merchant's money, exactly like a verified transfer). A failure is logged, never silent.
  if (cod) {
    try {
      await confirmOrderPayment(row.orderId, { kind: "admin", operatorId: "system:cash_on_delivery", operatorEmail: null }, { note: "Pagamento na entrega" });
    } catch (err) {
      console.error("[fulfilment] delivered cash-on-delivery order could not be settled; needs manual verification", { order: row.orderNumber }, err instanceof Error ? err.message : err);
    }
  }

  const target = ORDER_FOR[to];
  if (target) {
    const order = await orderRepository.get(row.storeId, row.orderId);
    if (order && canTransition(order.status, target)) {
      order.status = target;
      order.history = [...order.history, { status: target, at: now }];
      order.updatedAt = now;
      await orderRepository.save(order);
    }
  }
  return { before: row.status, row: toSupplierOrder(updated) };
}

/** What one unit costs the merchant: the supplier's cost when the product was imported, else the product's own cost. */
export async function unitCostFor(storeId: string, productId: string, ownCost: number): Promise<number> {
  const link = must("imports.cost", await db().from("supplier_imports").select("supplier_product_id").eq("store_id", storeId).eq("product_id", productId).maybeSingle());
  if (!link) return ownCost;
  const sp = must("supplier_products.cost", await db().from("supplier_products").select("cost_price").eq("id", link.supplier_product_id).maybeSingle());
  return sp ? Number(sp.cost_price) : ownCost;
}

/** A product's stock must cover a new sale (checked when the checkout is created; the RPC is the final word). */
export async function supplierStockFor(storeId: string, productId: string): Promise<number | null> {
  const link = must("imports.stock", await db().from("supplier_imports").select("supplier_product_id").eq("store_id", storeId).eq("product_id", productId).maybeSingle());
  if (!link) return null; // not a supplier product: the merchant's own stock rules apply
  const sp = must("supplier_products.stock", await db().from("supplier_products").select("stock").eq("id", link.supplier_product_id).maybeSingle());
  return sp ? Number(sp.stock) : 0;
}

// ── What the shopper sees of their own order ──────────────────────────────────────────────

export interface ShopperOrder {
  number: number;
  storeName: string;
  productTitle: string;
  quantity: number;
  total: number;
  reference: string;
  paymentStatus: OrderPaymentStatus;
  paymentProvider: OrderPaymentProvider;
  customerName: string;
  /** The store's own Meta Pixel id, or `null`. */
  metaPixelId: string | null;
  /** The store's own support contacts: what the customer is told to use, never the platform's. */
  support: { whatsapp: string | null; email: string | null };
  /** The product's public slug (or its id): what the ad pixel reports as `content_ids`. */
  productKey: string | null;
  /** The coupon applied and what it took off (already out of `total`). */
  couponCode: string | null;
  discount: number;
  justPlaced: boolean;
  /** Pay the courier on arrival: no transfer to make. */
  cashOnDelivery: boolean;
  /** The day the shopper asked for (`YYYY-MM-DD`), when given. */
  deliveryDate: string | null;
}

/** By the order's unguessable id (the link the shopper was sent to). Returns only what the shopper needs. */
export async function getShopperOrder(id: string): Promise<ShopperOrder | null> {
  if (!/^ord_[A-Za-z0-9_-]{10,40}$/.test(id)) return null;
  const o = must("shopper.order", await db().from("orders").select("store_id,number,total,items,customer,address,payment,payment_status,payment_provider,created_at").eq("id", id).maybeSingle());
  if (!o) return null;
  const store = must("shopper.store", await db().from("stores").select("name,settings").eq("id", o.store_id).maybeSingle());
  const item = ((o.items as Array<{ name: string; quantity: number; productId?: string }>) ?? [])[0];
  const product = item?.productId ? must("shopper.product", await db().from("products").select("slug").eq("id", item.productId).eq("store_id", o.store_id).maybeSingle()) : null;
  return {
    number: Number(o.number),
    storeName: String(store?.name ?? ""),
    productTitle: item?.name ?? "—",
    quantity: item?.quantity ?? 1,
    total: Number(o.total),
    reference: String((o.payment as { reference?: string } | null)?.reference ?? ""),
    paymentStatus: normalizePaymentStatus(o.payment_status),
    paymentProvider: normalizePaymentProvider(o.payment_provider),
    customerName: String((o.customer as { name?: string } | null)?.name ?? ""),
    metaPixelId: (() => { const v = ((store?.settings ?? {}) as { meta_pixel_id?: unknown }).meta_pixel_id; return typeof v === "string" && /^\d{6,20}$/.test(v) ? v : null; })(),
    support: await storeRepository.supportOf(String(o.store_id)),
    productKey: product?.slug ? String(product.slug) : (item?.productId ?? null),
    // Just placed (within 30 minutes): only then is the order reported to the ad pixel, never when the link is reopened later.
    couponCode: ((o.payment as { coupon?: { code?: string } } | null)?.coupon?.code) ?? null,
    discount: Number(((o.payment as { coupon?: { discount?: number } } | null)?.coupon?.discount) ?? 0),
    justPlaced: Date.now() - Number(o.created_at) < 30 * 60_000,
    cashOnDelivery: isCashOnDelivery(o.payment as { method?: unknown } | null),
    deliveryDate: ((o.address as { deliveryDate?: string } | null)?.deliveryDate) ?? null,
  };
}

// ── Cancelling (administrators only) ──────────────────────────────────────────────────────

export interface CancelResult {
  before: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  /** Units given back to the suppliers' stock. */
  restored: number;
}

/**
 * Kandrop cancels an order that has not left the warehouse and the reserved stock goes back to the supplier.
 * All of it happens inside ONE database transaction (`cancel_order`): the order's status, the supplier lines and the
 * stock are updated together or not at all, and the order row is locked so a double click cannot restore the stock
 * twice. A paid order can be cancelled too, but the refund is Kandrop's manual job (the caller says so).
 */
export async function cancelOrder(orderId: string): Promise<CancelResult> {
  const { data, error } = await db().rpc("cancel_order", { p_order_id: orderId, p_now: Date.now() });
  if (error) {
    const message = error.message ?? "";
    if (message.includes("not_found")) throw new ApiError("not_found");
    if (message.includes("invalid_transition")) throw new ApiError("invalid_transition");
    must("orders.cancel", { data: null, error });
  }
  const result = data as { before: string; paymentStatus: string; restored: number };
  return { before: result.before as OrderStatus, paymentStatus: normalizePaymentStatus(result.paymentStatus), restored: Number(result.restored) };
}
