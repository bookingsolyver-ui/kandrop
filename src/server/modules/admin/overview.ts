import { db, must } from "@/server/db/client";
import { winningIds } from "@/server/modules/vitrine/winning";
import type { CashFlow, CatalogRow, LedgerEntry, MerchantDetail, MerchantRow, ReconRow } from "@/shared/admin/types";

/**
 * Everything the operator console reads. Administrators only (every caller sits behind `requireAdmin`): these queries
 * are deliberately NOT scoped to a store, they look across the whole platform.
 */
const DAY = 86_400_000;
const LIMIT = 5000;

interface OrderLite { id: string; storeId: string; number: number; status: string; paymentStatus: string; total: number; createdAt: number; paidAt: number; items: Array<{ name: string }> }
interface LineLite { orderId: string; storeId: string; storeName: string; supplierId: string; supplierProductId: string | null; quantity: number; saleTotal: number; costTotal: number; commission: number; merchantNet: number; status: string; paymentStatus: string; createdAt: number; updatedAt: number; orderNumber: number }

async function allOrders(): Promise<OrderLite[]> {
  const rows = must("admin.orders", await db().from("orders").select("id,store_id,number,status,payment_status,total,payment,items,created_at").order("created_at", { ascending: false }).limit(LIMIT)) ?? [];
  return rows.map((r) => ({
    id: String(r.id), storeId: String(r.store_id), number: Number(r.number), status: String(r.status), paymentStatus: String(r.payment_status),
    total: Number(r.total), createdAt: Number(r.created_at), paidAt: Number((r.payment as { paidAt?: number } | null)?.paidAt ?? 0), items: (r.items as Array<{ name: string }>) ?? [],
  }));
}

async function allLines(): Promise<LineLite[]> {
  const rows = must("admin.lines", await db().from("supplier_orders").select("order_id,order_number,store_id,store_name,supplier_id,supplier_product_id,quantity,sale_total,cost_total,commission,merchant_net,logistics_status,payment_status,created_at,updated_at").order("created_at", { ascending: false }).limit(LIMIT)) ?? [];
  return rows.map((r) => ({
    orderId: String(r.order_id), orderNumber: Number(r.order_number), storeId: String(r.store_id), storeName: String(r.store_name), supplierId: String(r.supplier_id),
    supplierProductId: r.supplier_product_id == null ? null : String(r.supplier_product_id), quantity: Number(r.quantity), saleTotal: Number(r.sale_total),
    costTotal: Number(r.cost_total), commission: Number(r.commission), merchantNet: Number(r.merchant_net), status: String(r.logistics_status), paymentStatus: String(r.payment_status),
    createdAt: Number(r.created_at), updatedAt: Number(r.updated_at),
  }));
}

const verified = (o: { status: string; paymentStatus: string }) => o.status !== "cancelled" && o.paymentStatus === "paid_verified";

async function loadMerchants(now: number): Promise<{ rows: MerchantRow[]; orders: OrderLite[]; lines: LineLite[] }> {
  const [users, subs, orders, lines, storeRows] = await Promise.all([
    db().from("users").select("id,email,full_name,store_id,store_name,created_at,banned").eq("role", "owner").limit(LIMIT),
    db().from("subscriptions").select("store_id,plan,period_end").limit(LIMIT),
    allOrders(),
    allLines(),
    db().from("stores").select("id,settings").limit(LIMIT),
  ]);
  const profileOf = new Map((must("admin.stores", storeRows) ?? []).map((s) => [String(s.id), ((s.settings ?? {}) as { profile?: { province?: string; municipality?: string } }).profile ?? {}]));
  const subOf = new Map((must("admin.subs", subs) ?? []).map((s) => [String(s.store_id), s]));
  const rows = (must("admin.users", users) ?? []).map((u): MerchantRow => {
    const storeId = String(u.store_id);
    const sub = subOf.get(storeId);
    const mine = orders.filter((o) => o.storeId === storeId);
    const myLines = lines.filter((l) => l.storeId === storeId && verified({ status: l.status === "cancelled" ? "cancelled" : "x", paymentStatus: l.paymentStatus }));
    const active = !!sub && Number(sub.period_end) > now;
    return {
      id: storeId,
      store: String(u.store_name),
      owner: String(u.full_name),
      email: String(u.email),
      province: profileOf.get(storeId)?.province ?? null,
      municipality: profileOf.get(storeId)?.municipality ?? null,
      plan: String(sub?.plan ?? "").trim() === "pro" ? "pro" : "starter",
      status: u.banned ? "suspended" : active ? "active" : "pending_verification",
      joinedAt: new Date(String(u.created_at)).getTime(),
      balance: myLines.filter((l) => l.status === "delivered").reduce((n, l) => n + l.merchantNet, 0),
      held: myLines.filter((l) => l.status !== "delivered").reduce((n, l) => n + l.merchantNet, 0),
      pendingOrders: mine.filter((o) => o.status === "pending" || o.status === "processing").length,
      totalOrders: mine.filter((o) => o.status !== "cancelled").length,
      gmv: mine.filter(verified).reduce((n, o) => n + o.total, 0),
    };
  });
  return { rows: rows.sort((a, b) => b.joinedAt - a.joinedAt), orders, lines };
}

/** Every merchant (store owner) of the platform. */
export async function merchantsOverview(now = Date.now()): Promise<MerchantRow[]> {
  return (await loadMerchants(now)).rows;
}

/** One store's 360° profile, or `null`. */
export async function merchantDetail(storeId: string, now = Date.now()): Promise<MerchantDetail | null> {
  const { rows, orders } = await loadMerchants(now);
  const base = rows.find((r) => r.id === storeId);
  if (!base) return null;
  const [imports, payouts] = await Promise.all([
    db().from("supplier_imports").select("product_id,supplier_product_id,supplier_products(id,name,cost_price,suppliers(company_name))").eq("store_id", storeId).limit(200),
    db().from("payouts").select("id,reference,amount,status,bank,created_at").eq("store_id", storeId).eq("historical", false).order("created_at", { ascending: false }).limit(20),
  ]);
  const products = (must("admin.imports", imports) ?? []).flatMap((r) => {
    const sp = r.supplier_products as unknown as { id: string; name: string; cost_price: number; suppliers: { company_name: string } | null } | null;
    return sp ? [{ id: String(sp.id), name: String(sp.name), costPrice: Number(sp.cost_price), supplierName: String(sp.suppliers?.company_name ?? "—") }] : [];
  });
  return {
    ...base,
    orders: orders.filter((o) => o.storeId === storeId).slice(0, 6).map((o) => ({
      id: o.id, number: o.number, product: o.items[0]?.name ?? "—", total: o.total,
      status: (["pending", "processing", "shipped", "delivered", "cancelled"].includes(o.status) ? o.status : "pending") as MerchantDetail["orders"][number]["status"],
    })),
    products,
    payouts: (must("admin.payouts", payouts) ?? []).map((p) => ({
      id: String(p.reference), date: Number(p.created_at), amount: Number(p.amount),
      status: (String(p.status) === "completed" ? "paid" : String(p.status) === "failed" || String(p.status) === "rejected" ? "rejected" : "pending") as "paid" | "pending" | "rejected",
      bank: String((p.bank as { ibanMasked?: string } | null)?.ibanMasked ?? "—"),
    })),
  };
}

/** The supplier catalogue in every status, with how many stores sell each product and its weekly sales. */
export async function catalogOverview(now = Date.now()): Promise<CatalogRow[]> {
  const [products, imports, lines, winning] = await Promise.all([
    db().from("supplier_products").select("id,name,category,cost_price,stock,status,suppliers(company_name)").order("created_at", { ascending: false }).limit(LIMIT),
    db().from("supplier_imports").select("supplier_product_id").limit(LIMIT),
    allLines(),
    winningIds(),
  ]);
  const stores = new Map<string, number>();
  for (const i of must("admin.imports.count", imports) ?? []) stores.set(String(i.supplier_product_id), (stores.get(String(i.supplier_product_id)) ?? 0) + 1);
  const sold = new Map<string, number>();
  for (const l of lines) if (l.supplierProductId && l.status !== "cancelled" && now - l.createdAt <= 28 * DAY) sold.set(l.supplierProductId, (sold.get(l.supplierProductId) ?? 0) + l.quantity);
  return (must("admin.catalog", products) ?? []).map((p): CatalogRow => ({
    id: String(p.id), name: String(p.name), category: String(p.category), costPrice: Number(p.cost_price), stock: Number(p.stock),
    supplierName: String((p.suppliers as unknown as { company_name?: string } | null)?.company_name ?? "—"),
    status: (["in_review", "approved", "rejected"].includes(String(p.status)) ? p.status : "in_review") as CatalogRow["status"],
    stores: stores.get(String(p.id)) ?? 0,
    weeklySales: Math.round(((sold.get(String(p.id)) ?? 0) / 4) * 10) / 10,
    isWinning: winning.has(String(p.id)),
  }));
}

/** The platform's money: what came in, what Kandrop keeps, what is owed, plus a statement derived from the real records. */
export async function cashFlow(now = Date.now()): Promise<CashFlow> {
  const [orders, lines, withdrawals, merchants] = await Promise.all([
    allOrders(),
    allLines(),
    db().from("supplier_withdrawals").select("id,supplier_id,amount,status,created_at,processed_at,suppliers(company_name)").order("created_at", { ascending: false }).limit(LIMIT),
    db().from("users").select("id", { count: "exact", head: true }).eq("role", "owner"),
  ]);
  const paid = orders.filter(verified);
  const paidLines = lines.filter((l) => l.status !== "cancelled" && l.paymentStatus === "paid_verified");
  const storeOf = new Map(lines.map((l) => [l.orderId, l.storeName]));

  const ledger: LedgerEntry[] = [];
  for (const o of paid) ledger.push({ id: `in_${o.id}`, at: o.paidAt || o.createdAt, kind: "payment_in", amount: o.total, party: storeOf.get(o.id) ?? o.storeId, reference: `#${o.number}`, note: o.items[0]?.name });
  for (const l of paidLines) {
    ledger.push({ id: `fee_${l.orderId}`, at: l.createdAt, kind: "fee_retained", amount: l.commission, party: l.storeName, reference: `#${l.orderNumber}` });
    if (l.status === "delivered") ledger.push({ id: `sup_${l.orderId}`, at: l.updatedAt, kind: "supplier_payment", amount: -l.costTotal, party: l.storeName, reference: `#${l.orderNumber}` });
  }
  // Tolerant on purpose: before the withdrawals migration is applied the statement simply has no withdrawals.
  for (const w of withdrawals.error ? [] : (withdrawals.data ?? [])) {
    if (String(w.status) === "rejected") continue;
    const paidOut = String(w.status) === "paid";
    ledger.push({ id: `wd_${w.id}`, at: Number(paidOut ? w.processed_at ?? w.created_at : w.created_at), kind: paidOut ? "payout_paid" : "payout_request", amount: -Number(w.amount), party: String((w.suppliers as unknown as { company_name?: string } | null)?.company_name ?? "—"), reference: `WD-${String(w.id).slice(0, 8).toUpperCase()}`, note: paidOut ? "paid" : "pending" });
  }
  ledger.sort((a, b) => b.at - a.at);

  const dayStart = Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate());
  const series = Array.from({ length: 14 }, (_, i) => {
    const start = dayStart - (13 - i) * DAY;
    return { date: new Date(start).toISOString().slice(0, 10), start, gmv: 0, revenue: 0 };
  });
  const bucket = (at: number) => series.find((d) => at >= d.start && at < d.start + DAY);
  for (const o of paid) { const d = bucket(o.paidAt || o.createdAt); if (d) d.gmv += o.total; }
  for (const l of paidLines) { const d = bucket(l.createdAt); if (d) d.revenue += l.commission; }

  return {
    totals: {
      gmv: paid.reduce((n, o) => n + o.total, 0),
      revenue: paidLines.reduce((n, l) => n + l.commission, 0),
      held: paidLines.reduce((n, l) => n + l.merchantNet, 0),
      inTransit: paid.filter((o) => o.status === "shipped").reduce((n, o) => n + o.total, 0),
      stores: merchants.count ?? 0,
    },
    series: series.map(({ date, gmv, revenue }) => ({ date, gmv, revenue })),
    ledger,
  };
}

/** Payment-verified supplier lines: the sale split into the supplier's cost, Kandrop's commission and the merchant's net. */
export async function reconciliation(): Promise<ReconRow[]> {
  return (await allLines())
    .filter((l) => l.status !== "cancelled" && l.paymentStatus === "paid_verified")
    .map((l): ReconRow => ({
      id: l.orderId, number: l.orderNumber, storeId: l.storeId, store: l.storeName,
      at: l.status === "delivered" ? l.updatedAt : l.createdAt,
      total: l.saleTotal, productCost: l.costTotal, commission: l.commission, merchantNet: l.merchantNet,
      status: l.status === "delivered" ? "available" : "pending",
    }))
    .sort((a, b) => b.at - a.at);
}
