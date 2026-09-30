import { randomBytes } from "node:crypto";
import type { PaymentState, ReferralPlan } from "@/shared/affiliates/schemas";
import { isDemoStore } from "@/server/modules/store/demo";
import { db, isUniqueViolation, must, rows } from "@/server/db/client";
import type { AffiliateRecord, ReferralRecord } from "./schema";

const DAY = 86_400_000;

/** SANDBOX referrals: made-up people, so the screen can be reviewed. Newest first. */
const EXAMPLES: Array<[string, number, ReferralPlan, PaymentState, number]> = [
  // [e-mail, days ago, plan, payment, months paid]
  ["joao.mendes@gmail.com", 4, "starter", "paid", 1],
  ["ana.paulo@hotmail.com", 9, "starter", "pending", 0],
  ["carlos.neto@gmail.com", 15, "pro", "paid", 1],
  ["luzia.baptista@outlook.com", 21, "starter", "pending", 0],
  ["mauro.diogo@gmail.com", 28, "starter", "pending", 0],
  ["telma.cardoso@gmail.com", 37, "starter", "paid", 2],
  ["ivo.sequeira@yahoo.com", 44, "starter", "overdue", 1],
  ["nadia.fonseca@gmail.com", 52, "pro", "paid", 2],
  ["rui.tavares@hotmail.com", 61, "starter", "pending", 0],
  ["sofia.lourenco@gmail.com", 66, "starter", "paid", 3],
  ["edson.kiala@outlook.com", 73, "starter", "pending", 0],
  ["marta.bento@gmail.com", 81, "pro", "pending", 2],
  ["paulo.gaspar@gmail.com", 90, "starter", "paid", 3],
  ["helena.rocha@yahoo.com", 96, "starter", "pending", 0],
];
const EXAMPLE_CLICKS = 212;


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

/** The n-th candidate for a code: `filipe`, `filipe2`, `filipe3`… then a random tail. */
const candidate = (base: string, n: number) =>
  n === 0 ? base : n < 100 ? `${base}${n + 1}` : `${base}${randomBytes(3).toString("hex")}`;

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

const referralFromRow = (row: Record<string, unknown>): ReferralRecord => ({
  id: String(row.id),
  email: String(row.email),
  registeredAt: Number(row.registered_at),
  plan: row.plan as ReferralPlan,
  payment: row.payment as PaymentState,
  paidMonths: Number(row.paid_months),
});

async function load(storeId: string): Promise<AffiliateRecord | null> {
  const profile = must(
    "affiliate_profiles.get",
    await db().from("affiliate_profiles").select("*").eq("store_id", storeId).maybeSingle()
  );
  if (!profile) return null;
  const referrals = rows(
    "referrals.list",
    await db().from("referrals").select("*").eq("store_id", storeId)
  );
  return {
    storeId,
    code: String(profile.code),
    clicks: Number(profile.clicks),
    example: Boolean(profile.example),
    referrals: referrals.map(referralFromRow),
  };
}

export const affiliateRepository = {
  /** The store's affiliate profile, created on first use (its code comes from `fullName`). */
  async ensure(storeId: string, fullName: string): Promise<AffiliateRecord> {
    const existing = await load(storeId);
    if (existing) return existing;

    const example = await isDemoStore(storeId);
    const base = slugOf(fullName);
    for (let n = 0; n < 110; n++) {
      const { error } = await db()
        .from("affiliate_profiles")
        .insert({
          store_id: storeId,
          code: candidate(base, n),
          clicks: example ? EXAMPLE_CLICKS : 0,
          example,
        });
      if (!error) {
        if (example) {
          must(
            "referrals.seed",
            await db()
              .from("referrals")
              .insert(
                examples(Date.now()).map((r) => ({
                  id: `ref_${randomBytes(8).toString("hex")}`,
                  store_id: storeId,
                  email: r.email,
                  registered_at: r.registeredAt,
                  plan: r.plan,
                  payment: r.payment,
                  paid_months: r.paidMonths,
                }))
              )
          );
        }
        break;
      }
      // The store's row appeared meanwhile (a concurrent first visit): use it. Otherwise the code
      // was taken by someone else: try the next one.
      if (!isUniqueViolation(error)) must("affiliate_profiles.create", { data: null, error });
      if (await load(storeId)) break;
    }
    const record = await load(storeId);
    if (!record) throw new Error("Database error: affiliate_profiles.create");
    return record;
  },

  /** Counts a visit to `/join?ref=code`. Unknown codes count for nobody. */
  async recordClick(code: string): Promise<boolean> {
    return Boolean(
      must("affiliates.click", await db().rpc("record_affiliate_click", { affiliate_code: code }))
    );
  },
};
