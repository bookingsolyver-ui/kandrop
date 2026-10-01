import { INTERNATIONAL_PRODUCTS, NATIONAL_PRODUCTS, type VitrineProduct } from "@/shared/vitrine/mock";

/**
 * SAMPLE data for the operator console (`/admin`). Everything is invented and deterministic; the shapes
 * are the contract for the real queries (orders, ledger, payouts, stock). Money is minor units (kwz × 100).
 */
const kz = (n: number) => n * 100;
const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 1, 12, 0, 0); // fixed, so the sample never changes between renders

// ── Merchants ────────────────────────────────────────────────────────────────────────────────

export type MerchantStatus = "active" | "suspended" | "pending_verification";
export interface PayoutRow {
  id: string;
  date: number;
  amount: number;
  status: "paid" | "pending" | "rejected";
  bank: string;
}
export interface Merchant {
  id: string;
  store: string;
  owner: string;
  email: string;
  phone: string;
  city: string;
  plan: "starter" | "pro";
  status: MerchantStatus;
  joinedAt: number;
  /** Wallet balance (withdrawable). */
  balance: number;
  /** Money held until the deliveries are confirmed. */
  held: number;
  pendingOrders: number;
  totalOrders: number;
  /** Gross merchandise value sold through the store. */
  gmv: number;
  payouts: PayoutRow[];
  /** Catalogue ids of the products the store is selling. */
  productIds: string[];
}

const INT = INTERNATIONAL_PRODUCTS;
const NAT = NATIONAL_PRODUCTS;
const ids = (list: VitrineProduct[], ...at: number[]) => at.map((i) => list[i]!.id);

const payout = (id: string, daysAgo: number, amount: number, status: PayoutRow["status"], bank: string): PayoutRow => ({
  id,
  date: NOW - daysAgo * DAY,
  amount: kz(amount),
  status,
  bank,
});

export const MERCHANTS: Merchant[] = [
  {
    id: "m_001", store: "Kianda Moda", owner: "Teresa Mbala", email: "teresa@kiandamoda.exemplo.ao", phone: "923 100 201", city: "Luanda", plan: "pro", status: "active",
    joinedAt: NOW - 212 * DAY, balance: kz(842_300), held: kz(311_000), pendingOrders: 9, totalOrders: 486, gmv: kz(14_820_000),
    payouts: [payout("po_1", 4, 400_000, "paid", "BAI ••4821"), payout("po_2", 18, 500_000, "paid", "BAI ••4821"), payout("po_3", 33, 350_000, "paid", "BAI ••4821"), payout("po_4", 1, 300_000, "pending", "BAI ••4821")],
    productIds: [...ids(NAT, 5, 4, 6), ...ids(INT, 18, 3)],
  },
  {
    id: "m_002", store: "Casa Viva Benguela", owner: "Nuno Fernandes", email: "nuno@casaviva.exemplo.ao", phone: "924 330 118", city: "Benguela", plan: "pro", status: "active",
    joinedAt: NOW - 160 * DAY, balance: kz(615_800), held: kz(208_400), pendingOrders: 6, totalOrders: 322, gmv: kz(9_460_000),
    payouts: [payout("po_5", 6, 450_000, "paid", "BFA ••1093"), payout("po_6", 22, 300_000, "paid", "BFA ••1093")],
    productIds: [...ids(NAT, 8, 9, 7), ...ids(INT, 16, 17)],
  },
  {
    id: "m_003", store: "Beleza Natural AO", owner: "Marta Quissanga", email: "marta@belezanatural.exemplo.ao", phone: "925 777 440", city: "Luanda", plan: "starter", status: "active",
    joinedAt: NOW - 96 * DAY, balance: kz(231_900), held: kz(94_700), pendingOrders: 4, totalOrders: 141, gmv: kz(3_890_000),
    payouts: [payout("po_7", 9, 200_000, "paid", "BIC ••7710"), payout("po_8", 40, 150_000, "paid", "BIC ••7710")],
    productIds: [...ids(NAT, 2, 3, 20), ...ids(INT, 3, 5, 6)],
  },
  {
    id: "m_004", store: "TecnoLobito", owner: "Eduardo Chivela", email: "eduardo@tecnolobito.exemplo.ao", phone: "926 480 092", city: "Lobito", plan: "starter", status: "active",
    joinedAt: NOW - 71 * DAY, balance: kz(118_400), held: kz(52_300), pendingOrders: 3, totalOrders: 88, gmv: kz(2_410_000),
    payouts: [payout("po_9", 15, 100_000, "paid", "BAI ••3355")],
    productIds: [...ids(NAT, 9, 10, 11), ...ids(INT, 1, 20, 21)],
  },
  {
    id: "m_005", store: "Mundo Kids Huambo", owner: "Sónia Capita", email: "sonia@mundokids.exemplo.ao", phone: "927 215 760", city: "Huambo", plan: "starter", status: "active",
    joinedAt: NOW - 54 * DAY, balance: kz(64_700), held: kz(38_100), pendingOrders: 2, totalOrders: 57, gmv: kz(1_240_000),
    payouts: [payout("po_10", 11, 60_000, "paid", "Atlântico ••5521"), payout("po_11", 2, 50_000, "pending", "Atlântico ••5521")],
    productIds: [...ids(NAT, 16, 17, 18), ...ids(INT, 12, 13, 14)],
  },
  {
    id: "m_006", store: "Pet Angola Shop", owner: "Rui Baptista", email: "rui@petangola.exemplo.ao", phone: "928 604 331", city: "Lubango", plan: "starter", status: "suspended",
    joinedAt: NOW - 120 * DAY, balance: kz(173_000), held: kz(0), pendingOrders: 0, totalOrders: 74, gmv: kz(1_980_000),
    payouts: [payout("po_12", 20, 90_000, "paid", "BAI ••9042"), payout("po_13", 5, 170_000, "rejected", "BAI ••9042")],
    productIds: [...ids(NAT, 19), ...ids(INT, 4)],
  },
  {
    id: "m_007", store: "Joias Kianda", owner: "Paula Domingos", email: "paula@joiaskianda.exemplo.ao", phone: "929 118 903", city: "Luanda", plan: "pro", status: "active",
    joinedAt: NOW - 188 * DAY, balance: kz(509_200), held: kz(176_900), pendingOrders: 5, totalOrders: 259, gmv: kz(8_130_000),
    payouts: [payout("po_14", 3, 350_000, "paid", "BFA ••7788"), payout("po_15", 29, 400_000, "paid", "BFA ••7788")],
    productIds: [...ids(NAT, 13, 12), ...ids(INT, 2, 8, 9, 23)],
  },
  {
    id: "m_008", store: "Casa & Estilo Cabinda", owner: "Albertina Zau", email: "albertina@casaestilo.exemplo.ao", phone: "930 552 667", city: "Cabinda", plan: "starter", status: "pending_verification",
    joinedAt: NOW - 6 * DAY, balance: kz(0), held: kz(14_900), pendingOrders: 1, totalOrders: 2, gmv: kz(46_000),
    payouts: [],
    productIds: ids(NAT, 7, 8),
  },
  {
    id: "m_009", store: "Sol & Energia", owner: "Joaquim Pinto", email: "joaquim@solenergia.exemplo.ao", phone: "931 009 214", city: "Malanje", plan: "starter", status: "active",
    joinedAt: NOW - 38 * DAY, balance: kz(87_600), held: kz(29_500), pendingOrders: 2, totalOrders: 49, gmv: kz(1_090_000),
    payouts: [payout("po_16", 8, 80_000, "paid", "BIC ••2210")],
    productIds: ids(NAT, 10, 11, 9),
  },
  {
    id: "m_010", store: "Moda Namibe", owner: "Cecília Lemos", email: "cecilia@modanamibe.exemplo.ao", phone: "932 741 580", city: "Namibe", plan: "starter", status: "active",
    joinedAt: NOW - 25 * DAY, balance: kz(41_200), held: kz(22_800), pendingOrders: 2, totalOrders: 31, gmv: kz(690_000),
    payouts: [payout("po_17", 7, 30_000, "pending", "BAI ••6034")],
    productIds: [...ids(NAT, 4, 5, 22), ...ids(INT, 18, 19)],
  },
];

export const merchantById = (id: string) => MERCHANTS.find((m) => m.id === id);

// ── Orders (with their money flow) ───────────────────────────────────────────────────────────

export type OrderState = "pending" | "processing" | "shipped" | "delivered" | "returned" | "cancelled";
export interface AdminOrder {
  id: string;
  number: number;
  merchantId: string;
  product: string;
  quantity: number;
  city: string;
  courier: string;
  state: OrderState;
  createdAt: number;
  /** What the supplier is paid. */
  productCost: number;
  /** What the merchant earns on top (before Kandrop's cut). */
  merchantMargin: number;
  deliveryFee: number;
  /** Kandrop's cut of the margin. */
  platformFee: number;
  /** Cost + margin + delivery: what the end customer pays. */
  total: number;
  /** A return that was paid and still has to be refunded. */
  refundPending: boolean;
  /** Late: not delivered after 3 days. */
  delayed: boolean;
}

const COURIERS = ["Express Luanda", "Rápido do Sul", "Kuenda Entregas", "Planalto Express"];
const STATES: OrderState[] = [
  "delivered", "delivered", "delivered", "shipped", "delivered", "processing", "delivered", "shipped", "returned",
  "delivered", "pending", "delivered", "shipped", "delivered", "returned", "delivered", "processing", "delivered",
  "delivered", "shipped", "cancelled", "delivered", "returned", "delivered", "shipped", "delivered", "pending", "delivered",
  "delivered", "processing", "shipped", "delivered", "returned", "delivered", "delivered", "shipped",
];

function buildOrders(): AdminOrder[] {
  const all = [...NAT, ...INT];
  return STATES.map((state, i) => {
    const merchant = MERCHANTS[(i * 3) % MERCHANTS.length]!;
    const product = all[(i * 5 + 2) % all.length]!;
    const quantity = 1 + (i % 3 === 0 ? 1 : 0);
    const productCost = product.costPrice * quantity;
    const merchantMargin = Math.round(product.costPrice * (0.9 + (i % 5) * 0.12)) * quantity;
    const deliveryFee = kz(1_500 + (i % 4) * 500);
    const ageDays = state === "delivered" || state === "returned" ? 2 + (i % 9) : state === "cancelled" ? 3 : i % 6;
    const createdAt = NOW - ageDays * DAY - (i % 7) * 3_600_000;
    return {
      id: `ord_${String(i + 1).padStart(4, "0")}`,
      number: 2001 + i,
      merchantId: merchant.id,
      product: product.title,
      quantity,
      city: merchant.city,
      courier: COURIERS[i % COURIERS.length]!,
      state,
      createdAt,
      productCost,
      merchantMargin,
      deliveryFee,
      platformFee: Math.round(merchantMargin * 0.08),
      total: productCost + merchantMargin + deliveryFee,
      refundPending: state === "returned" && i % 2 === 0,
      delayed: (state === "processing" || state === "shipped") && ageDays >= 3,
    };
  });
}
export const ADMIN_ORDERS: AdminOrder[] = buildOrders();

// ── Ledger (the cash statement) ──────────────────────────────────────────────────────────────

export type LedgerKind = "payment_in" | "fee_retained" | "supplier_payment" | "payout_request" | "payout_paid" | "refund" | "adjustment";
export interface LedgerEntry {
  id: string;
  at: number;
  kind: LedgerKind;
  /** Signed: money in is positive, money out is negative. */
  amount: number;
  merchantId: string;
  reference: string;
  note?: string;
}

function buildLedger(): LedgerEntry[] {
  const out: LedgerEntry[] = [];
  let n = 0;
  const push = (e: Omit<LedgerEntry, "id">) => out.push({ ...e, id: `led_${String(++n).padStart(4, "0")}` });
  for (const o of ADMIN_ORDERS) {
    if (o.state === "cancelled" || o.state === "pending") continue;
    push({ at: o.createdAt + 3_600_000, kind: "payment_in", amount: o.total, merchantId: o.merchantId, reference: `#${o.number}`, note: o.product });
    push({ at: o.createdAt + 3_700_000, kind: "fee_retained", amount: o.platformFee + o.deliveryFee, merchantId: o.merchantId, reference: `#${o.number}` });
    if (o.state === "delivered" || o.state === "shipped") {
      push({ at: o.createdAt + 2 * DAY, kind: "supplier_payment", amount: -o.productCost, merchantId: o.merchantId, reference: `#${o.number}` });
    }
    if (o.state === "returned") {
      push({ at: o.createdAt + 4 * DAY, kind: "refund", amount: -o.total, merchantId: o.merchantId, reference: `#${o.number}`, note: o.refundPending ? "pending" : undefined });
    }
  }
  for (const m of MERCHANTS) {
    for (const p of m.payouts) {
      push({
        at: p.date,
        kind: p.status === "paid" ? "payout_paid" : "payout_request",
        amount: p.status === "rejected" ? 0 : -p.amount,
        merchantId: m.id,
        reference: p.id.toUpperCase(),
        note: p.status,
      });
    }
  }
  push({ at: NOW - 2 * DAY, kind: "adjustment", amount: kz(25_000), merchantId: "m_002", reference: "ADJ-014", note: "Compensação por atraso de entrega" });
  return out.sort((a, b) => b.at - a.at);
}
export const LEDGER: LedgerEntry[] = buildLedger();

/** The numbers of the cash-flow dashboard. */
export function cashFlowTotals() {
  const live = ADMIN_ORDERS.filter((o) => o.state !== "cancelled");
  const delivered = ADMIN_ORDERS.filter((o) => o.state === "delivered");
  return {
    gmv: live.reduce((s, o) => s + o.total, 0),
    revenue: delivered.reduce((s, o) => s + o.platformFee + o.deliveryFee, 0),
    held: MERCHANTS.reduce((s, m) => s + m.balance + m.held, 0),
    inTransit: ADMIN_ORDERS.filter((o) => o.state === "shipped").reduce((s, o) => s + o.total, 0),
  };
}

/** Per-day totals of the last 14 days, for the chart. */
export function dailySeries() {
  const days = Array.from({ length: 14 }, (_, i) => {
    const start = NOW - (13 - i) * DAY;
    return { date: new Date(start).toISOString().slice(0, 10), gmv: 0, revenue: 0, start };
  });
  for (const o of ADMIN_ORDERS) {
    if (o.state === "cancelled") continue;
    const day = days.find((d) => o.createdAt >= d.start - DAY / 2 && o.createdAt < d.start + DAY / 2);
    if (!day) continue;
    day.gmv += o.total;
    day.revenue += o.platformFee + o.deliveryFee;
  }
  return days.map(({ date, gmv, revenue }) => ({ date, gmv, revenue }));
}

// ── Payouts requested by merchants ───────────────────────────────────────────────────────────

export interface PayoutRequest extends PayoutRow {
  merchantId: string;
}
export const PAYOUT_REQUESTS: PayoutRequest[] = MERCHANTS.flatMap((m) =>
  m.payouts.map((p) => ({ ...p, merchantId: m.id }))
).sort((a, b) => b.date - a.date);

// ── Inventory ────────────────────────────────────────────────────────────────────────────────

export interface InventoryItem {
  id: string;
  sku: string;
  title: string;
  kind: VitrineProduct["kind"];
  supplier: string;
  quantity: number;
  /** Units sold per week, across all stores. */
  weeklySales: number;
  costPrice: number;
  /** How many stores sell it. */
  stores: number;
}

/** Quantities chosen to show every case: empty shelves, critical stock and healthy stock. */
const QUANTITIES = [0, 4, 86, 0, 7, 142, 23, 0, 9, 310, 58, 0, 3, 41, 0, 120, 8, 66, 0, 17, 5, 204, 31, 0, 12, 95, 0, 2, 74, 6, 180, 0, 28, 9, 51, 0, 14, 7, 98, 0, 36, 11, 250, 1, 0, 45, 18];
export const INVENTORY: InventoryItem[] = [...NAT, ...INT].map((p, i) => ({
  id: p.id,
  sku: p.sku,
  title: p.title,
  kind: p.kind,
  supplier: p.brand,
  quantity: QUANTITIES[i % QUANTITIES.length]!,
  weeklySales: p.hot ? 18 + ((i * 7) % 30) : 3 + ((i * 5) % 14),
  costPrice: p.costPrice,
  stores: 2 + ((i * 3) % 9),
}));

export const CRITICAL_STOCK = 10;
