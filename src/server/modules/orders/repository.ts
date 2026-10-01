import { randomBytes } from "node:crypto";
import { DEMO_PRODUCTS, KZ } from "@/server/modules/products/repository";
import type { PaymentMethod } from "@/shared/checkout/schemas";
import type { OrderStatus } from "@/shared/orders/schemas";
import type { OrderAddress, OrderRecord } from "./schema";
import { isDemoStore } from "@/server/modules/store/demo";
import { db, must, rows } from "@/server/db/client";

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

function lcg(seed: number) {
  let state = seed;
  return () => (state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296) / 4_294_967_296;
}

const RETURNED_INDEX = 9;

function statusForIndex(i: number): OrderStatus {
  if (i === 9 || i === 17 || i === 26) return "cancelled";
  if (i < 6) return "pending";
  if (i < 13) return "processing";
  if (i < 21) return "shipped";
  return "delivered";
}

const REFERENCE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

function generateSeedOrders(storeId: string) {
  const rand = lcg(2026);
  const pick = (n: number) => Math.floor(rand() * n);
  const now = Date.now();
  const COUNT = 34;
  const rows: OrderRecord[] = [];

  for (let i = 0; i < COUNT; i++) {
    const [name, phone, email] = CUSTOMERS[(i * 5) % CUSTOMERS.length]!;
    const [street, city, province, reference, fee, zone] =
      ADDRESSES[(i * 3 + pick(2)) % ADDRESSES.length]!;
    const address: OrderAddress = { street, city, province, reference, zone };

    const lineCount = 1 + pick(3);
    const first = pick(DEMO_PRODUCTS.length);
    const items = Array.from({ length: lineCount }, (_, k) => {
      const [title, , , , sale] = DEMO_PRODUCTS[(first + k * 4) % DEMO_PRODUCTS.length]!;
      return { name: title, quantity: 1 + (rand() < 0.25 ? 1 : 0), unitAmount: sale * KZ };
    });
    const subtotal = items.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0);
    const shippingAmount = subtotal >= 60_000 * KZ ? 0 : fee * KZ;

    const status = statusForIndex(i);
    const returned = i === RETURNED_INDEX;
    const createdAt = now - (2 + i * 19 + pick(9)) * HOUR;
    const step = (hours: number) => Math.min(now, createdAt + hours * HOUR);

    const path: Array<[OrderStatus, number]> = [["pending", 0]];
    if (status !== "pending") {
      if (returned) {
        path.push(["processing", 3 + pick(6)]);
        path.push(["shipped", 0], ["cancelled", 0]);
      } else if (status === "cancelled") path.push(["cancelled", 5 + pick(20)]);
      else {
        path.push(["processing", 3 + pick(6)]);
        if (status === "shipped" || status === "delivered") path.push(["shipped", 30 + pick(20)]);
        if (status === "delivered") path.push(["delivered", 78 + pick(30)]);
      }
    }
    const history = path.map(([s, hours]) => ({ status: s, at: step(hours) }));
    const last = history[history.length - 1]!;
    if (status === "shipped") last.at = now - (10 + pick(35)) * 60_000;
    if (returned) {
      history[history.length - 2]!.at = now - 5 * HOUR;
      last.at = now - 3 * HOUR;
    }
    if (status === "delivered") {
      last.at = Math.min(now, history[history.length - 2]!.at + (90 + pick(90)) * 60_000);
    }

    const id = `ord_${randomBytes(9).toString("base64url")}`;
    const shipped = status === "shipped" || status === "delivered" || returned;
    
    rows.push({
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
  return rows;
}

function mapRowToOrder(row: Record<string, unknown>): OrderRecord {
  return {
    id: String(row.id),
    storeId: String(row.store_id),
    number: Number(row.number),
    status: row.status as OrderStatus,
    customer: row.customer as OrderRecord["customer"],
    address: row.address as OrderAddress,
    items: (row.items as OrderRecord["items"]) ?? [],
    shippingAmount: Number(row.shipping_amount),
    total: Number(row.total),
    currency: "AOA",
    payment: row.payment as OrderRecord["payment"],
    trackingCode: row.tracking_code ? String(row.tracking_code) : undefined,
    history: (row.history as OrderRecord["history"]) ?? [],
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

const toRow = (o: OrderRecord) => ({
  id: o.id,
  store_id: o.storeId,
  number: o.number,
  status: o.status,
  customer: o.customer,
  address: o.address,
  items: o.items,
  shipping_amount: o.shippingAmount,
  total: o.total,
  currency: o.currency,
  payment: o.payment,
  tracking_code: o.trackingCode ?? null,
  history: o.history,
  created_at: o.createdAt,
  updated_at: o.updatedAt,
});

/** Sandbox stores (or any store when demo mode is on) start with a consistent demo set. */
async function seedIfDemo(storeId: string) {
  if (!(await isDemoStore(storeId))) return;
  const { count, error } = await db()
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId);
  if (error || count !== 0) return;
  // `ignoreDuplicates`: two first requests racing must not fail (unique on store_id, number: the
  // `orders_store_number_key` index of the 20261006 migration, which ON CONFLICT infers).
  const { error: seedError } = await db()
    .from("orders")
    .upsert(generateSeedOrders(storeId).map(toRow), {
      onConflict: "store_id,number",
      ignoreDuplicates: true,
    });
  // Sample data is a convenience: if it cannot be written the list is simply empty. It must never turn the
  // orders page into a 500 (the failure is logged, without row contents).
  if (seedError) console.error("[db] orders.seed failed (demo data skipped):", seedError.code, seedError.message);
}

/** Every call takes the `storeId` so tenant scoping cannot be forgotten by a caller. */
export const orderRepository = {
  async all(storeId: string): Promise<OrderRecord[]> {
    await seedIfDemo(storeId);
    const data = rows(
      "orders.all",
      await db().from("orders").select("*").eq("store_id", storeId)
    );
    return data.map(mapRowToOrder);
  },

  async get(storeId: string, id: string): Promise<OrderRecord | null> {
    const data = must(
      "orders.get",
      await db().from("orders").select("*").eq("store_id", storeId).eq("id", id).maybeSingle()
    );
    return data ? mapRowToOrder(data) : null;
  },

  async save(order: OrderRecord): Promise<OrderRecord> {
    must("orders.save", await db().from("orders").upsert(toRow(order)));
    return order;
  },
};
