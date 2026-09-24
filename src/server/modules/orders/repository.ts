import { getEnv } from "@/server/config/env";
import { randomBytes } from "node:crypto";
import { DEMO_PRODUCTS, KZ } from "@/server/modules/products/repository";
import type { PaymentMethod } from "@/shared/checkout/schemas";
import type { OrderStatus } from "@/shared/orders/schemas";
import type { OrderAddress, OrderRecord } from "./schema";

/**
 * STUB — in-memory, per process, lost on restart. Replace with `orders` / `order_items` /
 * `order_status_history` tables (index on `store_id, created_at`); the functions below are the
 * whole contract. Every call takes the `storeId` so tenant scoping cannot be forgotten.
 *
 * Orders are created by the checkout in a real deployment (a successful payment opens one).
 * Until that hookup exists, stores get a consistent demo set — see `seed`.
 */
const g = globalThis as unknown as {
  __kandropOrders?: { stores: Map<string, Map<string, OrderRecord>>; seeded: Set<string> };
};
const db = (g.__kandropOrders ??= { stores: new Map(), seeded: new Set() });

const HOUR = 60 * 60 * 1000;

const CUSTOMERS: Array<[string, string, string | undefined]> = [
  ["Ana Beatriz Fernandes", "923 411 208", "ana.fernandes@example.com"],
  ["Manuel dos Santos", "912 664 031", undefined],
  ["Joana Kiala", "934 072 519", "joana.kiala@example.com"],
  ["Pedro Domingos", "927 850 316", undefined],
  ["Luzia Mendes", "944 208 773", "luzia.mendes@example.com"],
  ["Carlos Manuel Baptista", "921 335 690", undefined],
  ["Esperança Cassoma", "936 517 142", "esperanca.c@example.com"],
  ["António Vieira", "929 088 464", undefined],
  ["Domingas Pinto", "913 726 855", "domingas.pinto@example.com"],
  ["Filipe Nzuzi", "942 190 307", undefined],
  ["Teresa Gonga", "925 603 918", "teresa.gonga@example.com"],
  ["Rui Sebastião", "931 447 262", undefined],
];

/** [street, city, province, landmark, delivery fee in Kz, delivery zone (bairro / município)] */
const ADDRESSES: Array<[string, string, string, string | undefined, number, string]> = [
  [
    "Rua Comandante Gika, n.º 42, Maianga",
    "Luanda",
    "Luanda",
    "Junto à farmácia Sagrada Esperança",
    2_500,
    "Maianga",
  ],
  [
    "Bairro Talatona, Rua 15, Casa 8",
    "Luanda",
    "Luanda",
    "Perto do Belas Shopping",
    2_500,
    "Talatona",
  ],
  [
    "Centralidade do Kilamba, Bloco Q, Edifício 12, Apt. 34",
    "Luanda",
    "Luanda",
    undefined,
    2_500,
    "Kilamba",
  ],
  [
    "Rua Direita do Cazenga, n.º 210",
    "Luanda",
    "Luanda",
    "Em frente ao mercado do Cazenga",
    2_500,
    "Cazenga",
  ],
  ["Zango 3, Rua 12, Casa 4", "Luanda", "Luanda", "Junto à escola primária", 2_500, "Viana"],
  [
    "Avenida da Independência, n.º 88",
    "Benguela",
    "Benguela",
    "Ao lado do Banco BAI",
    4_500,
    "Benguela",
  ],
  ["Bairro Académico, Rua 3, Casa 21", "Huambo", "Huambo", undefined, 4_500, "Huambo"],
  [
    "Rua Sarmento Rodrigues, n.º 15",
    "Lubango",
    "Huíla",
    "Perto da Praça da Liberdade",
    4_500,
    "Lubango",
  ],
  ["Bairro Compão, Rua da Missão, Casa 6", "Lobito", "Benguela", undefined, 4_500, "Lobito"],
];

const METHODS: PaymentMethod[] = ["multicaixa_express", "unitel_money", "card"];

/** Fixed pseudo-random sequence, so every restart produces the same, testable orders. */
function lcg(seed: number) {
  let state = seed;
  return () => (state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296) / 4_294_967_296;
}

/** Newest first: recent orders are waiting for the merchant, older ones are done. */
/** The cancelled order (of three) that was a failed delivery: shipped, then returned. */
const RETURNED_INDEX = 9;

function statusForIndex(i: number): OrderStatus {
  if (i === 9 || i === 17 || i === 26) return "cancelled";
  if (i < 6) return "pending";
  if (i < 13) return "processing";
  if (i < 21) return "shipped";
  return "delivered";
}

const REFERENCE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

function seed(storeId: string, rows: Map<string, OrderRecord>) {
  const rand = lcg(2026);
  const pick = (n: number) => Math.floor(rand() * n);
  const now = Date.now();
  const COUNT = 34;

  for (let i = 0; i < COUNT; i++) {
    const [name, phone, email] = CUSTOMERS[(i * 5) % CUSTOMERS.length]!;
    const [street, city, province, reference, fee, zone] =
      ADDRESSES[(i * 3 + pick(2)) % ADDRESSES.length]!;
    const address: OrderAddress = { street, city, province, reference, zone };

    // 1–3 distinct catalogue items (real names and sale prices from the demo catalogue).
    const lineCount = 1 + pick(3);
    const first = pick(DEMO_PRODUCTS.length);
    const items = Array.from({ length: lineCount }, (_, k) => {
      const [title, , , , sale] = DEMO_PRODUCTS[(first + k * 4) % DEMO_PRODUCTS.length]!;
      return { name: title, quantity: 1 + (rand() < 0.25 ? 1 : 0), unitAmount: sale * KZ };
    });
    const subtotal = items.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0);
    const shippingAmount = subtotal >= 60_000 * KZ ? 0 : fee * KZ; // free shipping above 60 000 Kz

    const status = statusForIndex(i);
    /** One cancelled order is a delivery that came back: it shipped, then was cancelled. */
    const returned = i === RETURNED_INDEX;
    const createdAt = now - (2 + i * 19 + pick(9)) * HOUR;
    const step = (hours: number) => Math.min(now, createdAt + hours * HOUR);

    // The path this order took, ending at its current status.
    const path: Array<[OrderStatus, number]> = [["pending", 0]];
    if (status !== "pending") {
      if (returned) {
        path.push(["processing", 3 + pick(6)]);
        path.push(["shipped", 0], ["cancelled", 0]); // real times set just below
      } else if (status === "cancelled") path.push(["cancelled", 5 + pick(20)]);
      else {
        path.push(["processing", 3 + pick(6)]);
        if (status === "shipped" || status === "delivered") path.push(["shipped", 30 + pick(20)]);
        if (status === "delivered") path.push(["delivered", 78 + pick(30)]);
      }
    }
    const history = path.map(([s, hours]) => ({ status: s, at: step(hours) }));
    // What is on the road is recent (so its delivery is genuinely under way); a returned parcel
    // shipped a few hours ago and came back an hour or two later.
    const last = history[history.length - 1]!;
    if (status === "shipped") last.at = now - (10 + pick(35)) * 60_000;
    if (returned) {
      history[history.length - 2]!.at = now - 5 * HOUR;
      last.at = now - 3 * HOUR;
    }
    // A delivery takes hours, not days: delivered 1.5–3 h after it shipped.
    if (status === "delivered") {
      last.at = Math.min(now, history[history.length - 2]!.at + (90 + pick(90)) * 60_000);
    }

    const id = `ord_${randomBytes(9).toString("base64url")}`;
    const shipped = status === "shipped" || status === "delivered" || returned;
    rows.set(id, {
      id,
      storeId,
      number: 1001 + (COUNT - 1 - i),
      status,
      customer: { name, phone: phone.replace(/\s/g, ""), email },
      address,
      items,
      shippingAmount,
      total: subtotal + shippingAmount,
      currency: "AOA",
      payment: {
        method: METHODS[pick(METHODS.length)]!,
        reference: `KD-${Array.from({ length: 10 }, () => REFERENCE_ALPHABET[pick(REFERENCE_ALPHABET.length)]).join("")}`,
        paidAt: createdAt,
      },
      trackingCode: shipped ? `KD${String(4_000_000 + pick(999_999))}AO` : undefined,
      history,
      createdAt,
      updatedAt: history[history.length - 1]!.at,
    });
  }
}

function rowsOf(storeId: string): Map<string, OrderRecord> {
  let rows = db.stores.get(storeId);
  if (!rows) db.stores.set(storeId, (rows = new Map()));
  // Same rule as the dashboard's demo data: the sandbox store, or any store when demo mode is on.
  const demo = storeId === "sto_demo" || getEnv().KANDROP_DEMO_EVENTS;
  if (demo && !db.seeded.has(storeId)) {
    db.seeded.add(storeId);
    seed(storeId, rows);
  }
  return rows;
}

export const orderRepository = {
  all: (storeId: string) => [...rowsOf(storeId).values()],
  get: (storeId: string, id: string) => rowsOf(storeId).get(id) ?? null,
  save(order: OrderRecord) {
    rowsOf(order.storeId).set(order.id, order);
    return order;
  },
};
