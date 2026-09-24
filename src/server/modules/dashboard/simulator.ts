import type { DashboardSummary, RevenuePoint } from "./schema";

/**
 * DEMO DATA ONLY — a stateful in-memory merchant that behaves like a live dropshipping
 * store: orders arrive, get fulfilled, and settle into the withdrawable balance.
 * Replace `getDashboardSummary`'s use of this with real aggregation queries; the
 * `DashboardSummary` contract stays identical.
 */

const KZ = 100; // minor units per Kwanza
const PERIOD_DAYS = 14;
const MAX_PENDING = 12;
/** Keeps the demo's "today" in a believable range instead of growing forever. */
const DAILY_CAP = 900_000 * KZ;

interface DemoProduct {
  id: string;
  name: string;
  /** Unit sale price, minor units. */
  price: number;
  /** Net / gross. */
  marginRate: number;
  weight: number;
  units: number;
  revenue: number;
}

interface PendingOrder {
  gross: number;
  net: number;
}

interface State {
  series: RevenuePoint[];
  previousGross: number;
  previousNet: number;
  products: DemoProduct[];
  pending: PendingOrder[];
  balance: number;
}

const PRODUCTS: Array<Omit<DemoProduct, "units" | "revenue">> = [
  {
    id: "p1",
    name: "Smartwatch Série X",
    price: 32_000 * KZ,
    marginRate: 0.34,
    weight: 5,
  },
  {
    id: "p2",
    name: "Auriculares sem fios Pro",
    price: 18_500 * KZ,
    marginRate: 0.41,
    weight: 6,
  },
  {
    id: "p3",
    name: "Candeeiro LED de secretária",
    price: 9_800 * KZ,
    marginRate: 0.47,
    weight: 4,
  },
  {
    id: "p4",
    name: "Mochila antifurto 25L",
    price: 14_200 * KZ,
    marginRate: 0.38,
    weight: 3,
  },
  {
    id: "p5",
    name: "Organizador de cozinha",
    price: 6_500 * KZ,
    marginRate: 0.52,
    weight: 3,
  },
  {
    id: "p6",
    name: "Câmara de segurança Wi-Fi",
    price: 27_900 * KZ,
    marginRate: 0.31,
    weight: 2,
  },
];

/** Deterministic pseudo-random so the seeded history is stable between reloads. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function isoDay(offsetFromToday: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetFromToday);
  return d.toISOString().slice(0, 10);
}

function seed(): State {
  const rand = seeded(20260924);
  const series: RevenuePoint[] = [];
  for (let i = PERIOD_DAYS - 1; i >= 0; i--) {
    const trend = 1 + (PERIOD_DAYS - 1 - i) * 0.025;
    const gross = Math.round((260_000 + rand() * 260_000) * trend) * KZ;
    const margin = 0.34 + rand() * 0.08;
    series.push({ date: isoDay(-i), gross, net: Math.round(gross * margin) });
  }

  const products: DemoProduct[] = PRODUCTS.map((p) => {
    const units = Math.round(p.weight * (18 + rand() * 14));
    return { ...p, units, revenue: units * p.price };
  });

  const totalGross = series.reduce((sum, p) => sum + p.gross, 0);
  const totalNet = series.reduce((sum, p) => sum + p.net, 0);

  const pending: PendingOrder[] = Array.from({ length: 9 }, () => {
    const p = products[Math.floor(rand() * products.length)]!;
    return { gross: p.price, net: Math.round(p.price * p.marginRate) };
  });

  return {
    series,
    previousGross: Math.round(totalGross / 1.084),
    previousNet: Math.round(totalNet / 1.061),
    products,
    pending,
    balance: 1_284_500 * KZ,
  };
}

const g = globalThis as unknown as { __kandropSim?: State };
const state = (): State => (g.__kandropSim ??= seed());

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const pct = (now: number, before: number) => (before === 0 ? 0 : (now / before - 1) * 100);
const kz = (amount: number) => ({ amount, currency: "AOA" as const });

export function snapshot(): DashboardSummary {
  const s = state();
  const gross = sum(s.series.map((p) => p.gross));
  const net = sum(s.series.map((p) => p.net));

  return {
    periodDays: PERIOD_DAYS,
    grossRevenue: { value: kz(gross), changePct: pct(gross, s.previousGross) },
    netRevenue: {
      value: kz(net),
      changePct: pct(net, s.previousNet),
      marginRate: gross === 0 ? 0 : net / gross,
    },
    pendingOrders: {
      count: s.pending.length,
      value: kz(sum(s.pending.map((o) => o.gross))),
    },
    availableBalance: {
      value: kz(s.balance),
      releasing: kz(sum(s.pending.map((o) => o.net))),
    },
    revenueSeries: s.series.map((p) => ({ ...p })),
    topProducts: [...s.products]
      .sort((a, b) => b.revenue - a.revenue)
      .map((p) => ({
        id: p.id,
        name: p.name,
        unitsSold: p.units,
        revenue: p.revenue,
        marginRate: p.marginRate,
      })),
    updatedAt: new Date().toISOString(),
  };
}

function pickProduct(products: DemoProduct[]): DemoProduct {
  const total = sum(products.map((p) => p.weight));
  let roll = Math.random() * total;
  for (const p of products) {
    roll -= p.weight;
    if (roll <= 0) return p;
  }
  return products[0]!;
}

/** Advances the simulated store by one event: a new order, or a delivered order settling. */
export function tick(): DashboardSummary {
  const s = state();
  const today = s.series[s.series.length - 1]!;
  if (today.gross > DAILY_CAP) {
    today.gross = Math.round(today.gross * 0.35);
    today.net = Math.round(today.net * 0.35);
  }

  // Pending orders stay bounded: a backlog forces the next event to be a delivery.
  if (s.pending.length === 0 || (s.pending.length < MAX_PENDING && Math.random() < 0.6)) {
    const product = pickProduct(s.products);
    const qty = Math.random() < 0.25 ? 2 : 1;
    const gross = product.price * qty;
    const net = Math.round(gross * product.marginRate);
    today.gross += gross;
    today.net += net;
    product.units += qty;
    product.revenue += gross;
    s.pending.push({ gross, net });
  } else {
    const delivered = s.pending.shift()!;
    s.balance += delivered.net;
  }

  return snapshot();
}
