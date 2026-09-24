import type { Session } from "@/server/auth/types";
import { userRepository } from "@/server/modules/auth/userRepository";
import { ApiError } from "@/server/http/errors";
import { PLAN_PRICES } from "@/server/modules/plan/limits";
import {
  commissionOf,
  listReferralsQuerySchema,
  maskEmail,
  type ListReferralsQuery,
  type ReferralPlan,
} from "@/shared/affiliates/schemas";
import { affiliateRepository } from "./repository";
import type { AffiliateOverview, PublicReferral, ReferralRecord } from "./schema";

const DAY = 86_400_000;

/**
 * Monthly price of each plan, in minor units. !! The Growth and Scale prices are
 * placeholders (`plan/limits.ts`): commissions follow them, so they move together when the
 * real prices are decided.
 */
const priceOf = (plan: ReferralPlan) => PLAN_PRICES[plan] * 100;

const monthlyOf = (r: ReferralRecord) => (r.payment === "paid" ? commissionOf(priceOf(r.plan)) : 0);

/**
 * The affiliate area of the store: its link, the four numbers and one page of referrals (newest
 * first, e-mails masked). Owner only: it is about money. `base` is the public address of the
 * site (`APP_URL`, else the origin the request came to).
 */
export async function getAffiliates(
  auth: Session,
  rawQuery: ListReferralsQuery,
  base: string
): Promise<AffiliateOverview> {
  if (auth.role !== "owner") throw new ApiError("forbidden");
  const query = listReferralsQuerySchema.parse(rawQuery);
  const owner = await userRepository.findById(auth.userId);
  const record = affiliateRepository.ensure(auth.storeId, owner?.fullName ?? "");
  const now = Date.now();

  const all = [...record.referrals].sort((a, b) => b.registeredAt - a.registeredAt);
  const start = (query.page - 1) * query.pageSize;
  const toPublic = (r: ReferralRecord): PublicReferral => ({
    id: r.id,
    email: maskEmail(r.email),
    registeredAt: new Date(r.registeredAt).toISOString(),
    plan: r.plan,
    payment: r.payment,
    monthlyCommission: monthlyOf(r),
  });

  return {
    code: record.code,
    link: `${base.replace(/\/$/, "")}/join?ref=${record.code}`,
    example: record.example,
    kpis: {
      clicks: record.clicks,
      signups: all.length,
      activePaying: all.filter((r) => r.payment === "paid").length,
      // Every month a referral paid earned its commission; nothing is paid out yet.
      availableCommission: all.reduce(
        (sum, r) => sum + r.paidMonths * commissionOf(priceOf(r.plan)),
        0
      ),
      monthlyCommission: all.reduce((sum, r) => sum + monthlyOf(r), 0),
      signupsLast30Days: all.filter((r) => now - r.registeredAt <= 30 * DAY).length,
    },
    referrals: {
      items: all.slice(start, start + query.pageSize).map(toPublic),
      total: all.length,
      page: query.page,
      pageSize: query.pageSize,
    },
  };
}
