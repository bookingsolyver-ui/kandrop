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

// ── Banking details (FICTIONAL IBANs, for the payout batch export) ──────────────────────────

const BANKS: Record<string, { bank: string; iban: string; holder: string }> = {
  m_001: { bank: "BAI", iban: "AO06004000000212345610101", holder: "Teresa Mbala" },
  m_002: { bank: "BFA", iban: "AO06000600000598765410102", holder: "Nuno Fernandes" },
  m_003: { bank: "BIC", iban: "AO06005100000331122310103", holder: "Marta Quissanga" },
  m_004: { bank: "BAI", iban: "AO06004000000744556610104", holder: "Eduardo Chivela" },
  m_005: { bank: "Atlântico", iban: "AO06005500000126677810105", holder: "Sónia Capita" },
  m_006: { bank: "BAI", iban: "AO06004000000983210110106", holder: "Rui Baptista" },
  m_007: { bank: "BFA", iban: "AO06000600000455566710107", holder: "Paula Domingos" },
  m_008: { bank: "BIC", iban: "AO06005100000867788910108", holder: "Albertina Zau" },
  m_009: { bank: "BIC", iban: "AO06005100000219988710109", holder: "Joaquim Pinto" },
  m_010: { bank: "BAI", iban: "AO06004000000653344510110", holder: "Cecília Lemos" },
};

/** A payout waiting in the queue (or already decided), with the destination account. */
export interface PayoutQueueItem {
  id: string;
  store: string;
  holder: string;
  bank: string;
  iban: string;
  amount: number;
  date: number;
  status: "paid" | "pending" | "rejected";
}

const EXTRA_STORES = ["Loja Girassol", "Mercado Kuvale", "Tendência Mulemba", "Casa do Planalto", "Eletro Cunene", "Beleza Okavango", "Moda Cuanza", "Bazar Zaire", "Tech Sumbe", "Estilo Soyo"];
const EXTRA_BANKS = ["BAI", "BFA", "BIC", "Atlântico", "BPC"];

/** The real sample payouts plus 40 invented pending ones: the "pay 50 merchants at once" case. */
export const PAYOUT_QUEUE: PayoutQueueItem[] = [
  ...PAYOUT_REQUESTS.map((p) => {
    const m = merchantById(p.merchantId)!;
    const b = BANKS[p.merchantId]!;
    return { id: p.id.toUpperCase(), store: m.store, holder: b.holder, bank: b.bank, iban: b.iban, amount: p.amount, date: p.date, status: p.status };
  }),
  ...Array.from({ length: 40 }, (_, i): PayoutQueueItem => ({
    id: `PO-X${String(i + 1).padStart(3, "0")}`,
    store: `${EXTRA_STORES[i % EXTRA_STORES.length]} ${Math.floor(i / EXTRA_STORES.length) + 1}`,
    holder: `Titular ${String(i + 1).padStart(2, "0")}`,
    bank: EXTRA_BANKS[i % EXTRA_BANKS.length]!,
    iban: `AO06${String(40_000_000_000_000 + i * 7_919_113).padStart(21, "0")}`,
    amount: kz(35_000 + ((i * 37_000) % 420_000)),
    date: NOW - ((i % 5) + 1) * DAY,
    status: "pending",
  })),
].sort((a, b) => b.date - a.date);

// ── Reconciliation: delivered orders vs the balance still to pay ─────────────────────────────

export interface ReconRow {
  orderId: string;
  number: number;
  merchantId: string;
  deliveredAt: number;
  /** Total charged = productCost + deliveryFee + merchantProfit. */
  total: number;
  productCost: number;
  deliveryFee: number;
  merchantProfit: number;
  /** The merchant's profit is `pending` until Kandrop releases it, then `available`. */
  status: "pending" | "available";
}

export const RECON_ROWS: ReconRow[] = ADMIN_ORDERS.filter((o) => o.state === "delivered").map((o) => {
  const deliveredAt = o.createdAt + 2 * DAY;
  return {
    orderId: o.id,
    number: o.number,
    merchantId: o.merchantId,
    deliveredAt,
    total: o.total,
    productCost: o.productCost,
    deliveryFee: o.deliveryFee,
    merchantProfit: o.merchantMargin,
    status: (NOW - deliveredAt > 4 * DAY ? "available" : "pending") as ReconRow["status"],
  };
}).sort((a, b) => b.deliveredAt - a.deliveredAt);

// ── Couriers' end-of-day closing (cash on delivery) ──────────────────────────────────────────

export interface CourierClosing {
  courier: string;
  zone: string;
  delivered: number;
  /** Paid by card/Multicaixa Express on the courier's terminal: already in the bank. */
  tpa: number;
  /** Cash in hand that must be handed over at the base. */
  cash: number;
  status: "pending" | "confirmed";
}

const COURIER_ROWS: Array<[string, string, number, number, number, "pending" | "confirmed"]> = [
  ["Express Luanda", "Luanda", 14, 312_400, 187_600, "pending"],
  ["Kuenda Entregas", "Luanda Sul", 11, 148_900, 221_300, "pending"],
  ["Rápido do Sul", "Benguela", 9, 96_500, 134_200, "pending"],
  ["Planalto Express", "Huambo", 7, 58_300, 102_700, "confirmed"],
  ["Kianda Moto", "Luanda Norte", 16, 405_100, 96_400, "pending"],
  ["Huíla Entregas", "Lubango", 6, 41_800, 88_900, "confirmed"],
  ["Cabinda Rápido", "Cabinda", 5, 33_700, 129_600, "pending"],
];
export const COURIER_CLOSINGS: CourierClosing[] = COURIER_ROWS.map(([courier, zone, delivered, tpa, cash, status]) => ({
  courier,
  zone,
  delivered,
  tpa: kz(tpa),
  cash: kz(cash),
  status,
}));

// ── Refused deliveries and manual adjustments ────────────────────────────────────────────────

export interface RefusedDelivery {
  orderId: string;
  number: number;
  merchantId: string;
  product: string;
  at: number;
  /** What the failed attempt cost (the delivery fee). */
  attemptCost: number;
  productCost: number;
}

/** The customer refused at the door: Kandrop holds the product and has to decide who pays the attempt. */
export const REFUSED: RefusedDelivery[] = ADMIN_ORDERS.filter((o) => o.state === "returned").map((o) => ({
  orderId: o.id,
  number: o.number,
  merchantId: o.merchantId,
  product: o.product,
  at: o.createdAt + 3 * DAY,
  attemptCost: o.deliveryFee,
  productCost: o.productCost,
}));

export type AdjustmentKind = "debit_merchant" | "absorb_loss";
export interface ManualAdjustment {
  id: string;
  at: number;
  kind: AdjustmentKind;
  merchantId: string;
  orderNumber?: number;
  amount: number;
  reason: string;
}
export const ADJUSTMENTS_SEED: ManualAdjustment[] = [
  { id: "ADJ-021", at: NOW - 2 * DAY, kind: "debit_merchant", merchantId: "m_003", orderNumber: 2029, amount: kz(2_000), reason: "Taxa de entrega falhada: cliente ausente" },
  { id: "ADJ-020", at: NOW - 3 * DAY, kind: "absorb_loss", merchantId: "m_007", orderNumber: 2013, amount: kz(6_600), reason: "Produto danificado no transporte: custo assumido pela Kandrop" },
  { id: "ADJ-019", at: NOW - 6 * DAY, kind: "debit_merchant", merchantId: "m_001", orderNumber: 2017, amount: kz(2_500), reason: "Tentativa de entrega recusada na porta" },
];
