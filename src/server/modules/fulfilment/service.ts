import { getEnv } from "@/server/config/env";
import { db, isUniqueViolation, must } from "@/server/db/client";
import { ApiError } from "@/server/http/errors";
import type { CheckoutSession } from "@/server/modules/checkout/schema";
import { orderRepository } from "@/server/modules/orders/repository";
import type { OrderRecord } from "@/server/modules/orders/schema";
import type { PaymentRecord } from "@/server/modules/payments/schema";
import { canAdvanceLogistics, type LogisticsStatus } from "@/shared/fulfilment/schemas";
import { canTransition, type OrderStatus } from "@/shared/orders/schemas";

/** The money of one supplier order, fixed at the moment of the sale (minor units). */
export interface Split {
  saleTotal: number;
  costTotal: number;
  /** The merchant's gross margin: sale − the supplier's cost. */
  margin: number;
  commissionBps: number;
  /** Kandrop's share of the margin (never negative: a sale below cost earns no commission). */
  commission: number;
  /** What the merchant keeps: margin − commission. */
  merchantNet: number;
}

/**
 * THE commission rule, in one place. Kandrop takes `COMMISSION_BPS` of the merchant's gross margin;
 * the supplier is always owed its full cost price. Integer maths (minor units, rounded to the unit).
 */
export function splitSale(unitPrice: number, unitCost: number, quantity: number, commissionBps: number): Split {
  const saleTotal = unitPrice * quantity;
  const costTotal = unitCost * quantity;
  const margin = saleTotal - costTotal;
  const commission = margin > 0 ? Math.round((margin * commissionBps) / 10_000) : 0;
  return { saleTotal, costTotal, margin, commissionBps, commission, merchantNet: margin - commission };
}

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
  lines: Array<{ kind: "sale" | "supplier_cost" | "commission" | "due"; description: string; quantity?: number; amount: number }>;
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

// ── A paid checkout becomes an order ──────────────────────────────────────────────────────

/** Next free order number of the store (the table is unique on (store, number); a race is retried by the caller). */
async function nextOrderNumber(storeId: string): Promise<number> {
  const row = must("orders.max", await db().from("orders").select("number").eq("store_id", storeId).order("number", { ascending: false }).limit(1).maybeSingle());
  return (row ? Number(row.number) : 1000) + 1;
}

/**
 * Called when a storefront checkout is PAID. It creates the merchant's order and, if the product was
 * imported from a supplier, the supplier's line (to prepare), Kandrop's commission split, the supplier's
 * stock movement and the two financial records. Idempotent: a repeated confirmation finds the order by its
 * payment reference and does nothing. A failure never undoes the payment: it is logged loudly instead.
 */
export async function fulfilPaidCheckout(session: CheckoutSession, payment: PaymentRecord): Promise<void> {
  if (session.subscription || !session.productId || !session.buyer) return;
  try {
    await createOrderFor(session, payment);
  } catch (err) {
    console.error("[fulfilment] FAILED to create the order for a paid checkout; needs manual recovery", { payment: payment.reference, session: session.id }, err instanceof Error ? err.message : err);
  }
}

async function createOrderFor(session: CheckoutSession, payment: PaymentRecord): Promise<void> {
  const productId = session.productId!;
  const buyer = session.buyer!;
  const store = session.storeId;

  const existing = must("orders.byReference", await db().from("orders").select("id").eq("store_id", store).eq("payment->>reference", payment.reference).maybeSingle());
  if (existing) return;

  const item = session.items[0];
  if (!item) return;
  const now = Date.now();

  let order: OrderRecord | null = null;
  for (let attempt = 0; attempt < 5 && !order; attempt++) {
    const candidate: OrderRecord = {
      id: `ord_${session.id.slice(4, 16)}${attempt || ""}`,
      storeId: store,
      number: await nextOrderNumber(store),
      status: "pending",
      customer: { name: buyer.customer.name, phone: buyer.customer.phone },
      address: { street: buyer.address.street, city: buyer.address.city, province: buyer.address.province, reference: buyer.address.reference },
      items: session.items.map((i) => ({ name: i.name, quantity: i.quantity, unitAmount: i.unitAmount })),
      shippingAmount: session.shippingAmount,
      total: session.total,
      currency: "AOA",
      payment: { method: payment.method, reference: payment.reference, paidAt: payment.paidAt ?? now },
      history: [{ status: "pending", at: now }],
      createdAt: now,
      updatedAt: now,
    };
    const { error } = await db().from("orders").insert({
      id: candidate.id, store_id: candidate.storeId, number: candidate.number, status: candidate.status,
      customer: candidate.customer, address: candidate.address, items: candidate.items,
      shipping_amount: candidate.shippingAmount, total: candidate.total, currency: candidate.currency,
      payment: candidate.payment, tracking_code: null, history: candidate.history,
      created_at: candidate.createdAt, updated_at: candidate.updatedAt,
    });
    if (!error) order = candidate;
    else if (!isUniqueViolation(error)) must("orders.insert", { data: null, error });
  }
  if (!order) throw new Error("could not allocate an order number");

  // Was the product imported from a supplier? Then there is a line to prepare and money to split.
  const link = must("imports.byProduct", await db().from("supplier_imports").select("supplier_product_id").eq("store_id", store).eq("product_id", productId).maybeSingle());
  if (!link) return;
  const sp = must("supplier_products.forOrder", await db().from("supplier_products").select("id,supplier_id,name,cost_price").eq("id", link.supplier_product_id).maybeSingle());
  if (!sp) return;

  const split = splitSale(item.unitAmount, Number(sp.cost_price), item.quantity, getEnv().COMMISSION_BPS);
  const { data: line, error } = await db().from("supplier_orders").insert({
    order_id: order.id, order_number: order.number, store_id: store, store_name: session.storeName,
    supplier_id: sp.supplier_id, supplier_product_id: sp.id, product_title: item.name,
    quantity: item.quantity, unit_cost: Number(sp.cost_price), unit_price: item.unitAmount,
    sale_total: split.saleTotal, cost_total: split.costTotal, margin: split.margin,
    commission_bps: split.commissionBps, commission: split.commission, merchant_net: split.merchantNet,
    logistics_status: "pending", history: [{ status: "pending", at: now }], created_at: now, updated_at: now,
  }).select("id").single();
  if (error || !line) {
    if (isUniqueViolation(error)) return; // this order's line already exists
    must("supplier_orders.insert", { data: null, error });
    return;
  }

  // The supplier's stock moves with the sale (atomic). Never negative: an oversold unit is logged for the team.
  const remaining = must("supplier_stock", await db().rpc("reserve_supplier_stock", { p_supplier_product_id: sp.id, p_qty: item.quantity }));
  if (remaining === null) console.error("[fulfilment] OVERSOLD: the supplier has less stock than was sold", { supplierProduct: sp.id, order: order.number });

  const year = new Date(now).getUTCFullYear();
  const base = { supplier_order_id: line.id, order_id: order.id, order_number: order.number, store_id: store, supplier_id: sp.supplier_id, sale_total: split.saleTotal, cost_total: split.costTotal, commission: split.commission, currency: "AOA", created_at: now };
  const merchantLines: Invoice["lines"] = [
    { kind: "sale", description: item.name, quantity: item.quantity, amount: split.saleTotal },
    { kind: "supplier_cost", description: item.name, quantity: item.quantity, amount: -split.costTotal },
    { kind: "commission", description: `${split.commissionBps / 100}%`, amount: -split.commission },
  ];
  const supplierLines: Invoice["lines"] = [{ kind: "due", description: item.name, quantity: item.quantity, amount: split.costTotal }];
  must("invoices.insert", await db().from("order_invoices").insert([
    { ...base, id: `inv_m_${line.id.slice(0, 12)}`, number: await nextNumber("invoice-merchant", "EM", year), party: "merchant", lines: merchantLines, net: split.merchantNet },
    { ...base, id: `inv_s_${line.id.slice(0, 12)}`, number: await nextNumber("invoice-supplier", "NR", year), party: "supplier", lines: supplierLines, net: split.costTotal },
  ]));
}

// ── Reading ───────────────────────────────────────────────────────────────────────────────

/** Admin: every supplier order of the platform, newest first, with where it goes. */
export async function listAllLogistics(limit = 300) {
  const rows = (must("logistics.list", await db().from("supplier_orders").select(SO_COLUMNS).order("created_at", { ascending: false }).limit(limit)) ?? []).map(toSupplierOrder);
  const ids = [...new Set(rows.map((r) => r.orderId))];
  const orders = ids.length ? must("logistics.orders", await db().from("orders").select("id,customer,address").in("id", ids)) ?? [] : [];
  const byId = new Map(orders.map((o) => [String(o.id), o as { customer: { name: string; phone: string }; address: { street: string; city: string; province: string; reference?: string } }]));
  const invoices = rows.length ? must("logistics.invoices", await db().from("order_invoices").select("supplier_order_id,party,number").in("supplier_order_id", rows.map((r) => r.id))) ?? [] : [];
  return rows.map((r) => ({
    ...r,
    customer: byId.get(r.orderId)?.customer ?? null,
    address: byId.get(r.orderId)?.address ?? null,
    invoices: invoices.filter((i) => String(i.supplier_order_id) === r.id).map((i) => ({ party: i.party as "merchant" | "supplier", number: String(i.number) })),
  }));
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

  const now = Date.now();
  const history = [...row.history, { status: to, at: now }];
  // Compare-and-set on the old status: two admins clicking at once cannot both advance the same step.
  const updated = must("logistics.update", await db().from("supplier_orders").update({ logistics_status: to, history, updated_at: now }).eq("id", id).eq("logistics_status", row.status).select(SO_COLUMNS).maybeSingle());
  if (!updated) throw new ApiError("invalid_transition");

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

/** A product's stock must cover a new sale (checked when the checkout is created; the RPC is the final word). */
export async function supplierStockFor(storeId: string, productId: string): Promise<number | null> {
  const link = must("imports.stock", await db().from("supplier_imports").select("supplier_product_id").eq("store_id", storeId).eq("product_id", productId).maybeSingle());
  if (!link) return null; // not a supplier product: the merchant's own stock rules apply
  const sp = must("supplier_products.stock", await db().from("supplier_products").select("stock").eq("id", link.supplier_product_id).maybeSingle());
  return sp ? Number(sp.stock) : 0;
}
