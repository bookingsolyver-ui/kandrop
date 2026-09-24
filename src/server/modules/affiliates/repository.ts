import { randomBytes } from "node:crypto";
import { getEnv } from "@/server/config/env";
import type { PaymentState, ReferralPlan } from "@/shared/affiliates/schemas";
import type { AffiliateRecord, ReferralRecord } from "./schema";

/**
 * STUB — in-memory, per process, lost on restart. Replace with `affiliate_profiles` (unique
 * index on `code`, one per store), `affiliate_clicks` and `referrals` (unique on the referred
 * store) tables. Every call takes the `storeId`.
 */
const g = globalThis as unknown as {
  __kandropAffiliates?: { byStore: Map<string, AffiliateRecord>; byCode: Map<string, string> };
};
const db = (g.__kandropAffiliates ??= { byStore: new Map(), byCode: new Map() });

const DAY = 86_400_000;

/** SANDBOX referrals: made-up people, so the screen can be reviewed. Newest first. */
const EXAMPLES: Array<[string, number, ReferralPlan, PaymentState, number]> = [
  // [e-mail, days ago, plan, payment, months paid]
  ["joao.mendes@gmail.com", 4, "growth", "paid", 1],
  ["ana.paulo@hotmail.com", 9, "starter", "free", 0],
  ["carlos.neto@gmail.com", 15, "scale", "paid", 1],
  ["luzia.baptista@outlook.com", 21, "growth", "pending", 0],
  ["mauro.diogo@gmail.com", 28, "starter", "free", 0],
  ["telma.cardoso@gmail.com", 37, "growth", "paid", 2],
  ["ivo.sequeira@yahoo.com", 44, "growth", "overdue", 1],
  ["nadia.fonseca@gmail.com", 52, "scale", "paid", 2],
  ["rui.tavares@hotmail.com", 61, "starter", "free", 0],
  ["sofia.lourenco@gmail.com", 66, "growth", "paid", 3],
  ["edson.kiala@outlook.com", 73, "starter", "free", 0],
  ["marta.bento@gmail.com", 81, "scale", "pending", 2],
  ["paulo.gaspar@gmail.com", 90, "growth", "paid", 3],
  ["helena.rocha@yahoo.com", 96, "starter", "free", 0],
];
const EXAMPLE_CLICKS = 212;

const isDemo = (storeId: string) => storeId === "sto_demo" || getEnv().KANDROP_DEMO_EVENTS;

/** `Filipe de Oliveira` → `filipe`: first name, no accents, letters and digits only. */
export function slugOf(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] ?? "";
  const slug = first
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 16);
  return slug.length >= 2 ? slug : "loja";
}

function uniqueCode(base: string): string {
  if (!db.byCode.has(base)) return base;
  for (let n = 2; n < 100; n++) {
    if (!db.byCode.has(`${base}${n}`)) return `${base}${n}`;
  }
  return `${base}${randomBytes(3).toString("hex")}`;
}

function examples(now: number): ReferralRecord[] {
  return EXAMPLES.map(([email, days, plan, payment, paidMonths], i) => ({
    id: `ref_${String(i + 1).padStart(3, "0")}`,
    email,
    registeredAt: now - days * DAY,
    plan,
    payment,
    paidMonths,
  }));
}

export const affiliateRepository = {
  /** The store's affiliate profile, created on first use (its code comes from `fullName`). */
  ensure(storeId: string, fullName: string): AffiliateRecord {
    let record = db.byStore.get(storeId);
    if (!record) {
      const example = isDemo(storeId);
      record = {
        storeId,
        code: uniqueCode(slugOf(fullName)),
        clicks: example ? EXAMPLE_CLICKS : 0,
        example,
        referrals: example ? examples(Date.now()) : [],
      };
      db.byStore.set(storeId, record);
      db.byCode.set(record.code, storeId);
    }
    return record;
  },

  /** Counts a visit to `/join?ref=code`. Unknown codes count for nobody. */
  recordClick(code: string): boolean {
    const storeId = db.byCode.get(code);
    const record = storeId && db.byStore.get(storeId);
    if (!record) return false;
    record.clicks += 1;
    return true;
  },
};
