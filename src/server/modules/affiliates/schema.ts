import type { PaymentState, ReferralPlan } from "@/shared/affiliates/schemas";

/** Internal record. The e-mail is the referred person's personal data: never sent as is. */
export interface ReferralRecord {
  id: string;
  email: string;
  registeredAt: number;
  plan: ReferralPlan;
  payment: PaymentState;
  /** Months already paid: recurring commission accrues once per paid month. */
  paidMonths: number;
}

export interface AffiliateRecord {
  storeId: string;
  /** The `?ref=` value of the store's link. Unique. */
  code: string;
  clicks: number;
  /** Whether the referrals are made-up sandbox examples (there is no real attribution yet). */
  example: boolean;
  referrals: ReferralRecord[];
}

export interface PublicReferral {
  id: string;
  /** Masked (`j***@gmail.com`). */
  email: string;
  registeredAt: string;
  plan: ReferralPlan;
  payment: PaymentState;
  /** Monthly commission this referral brings now, minor units; 0 unless it is paying. */
  monthlyCommission: number;
}

export interface AffiliateOverview {
  code: string;
  /** Absolute link to share, `https://…/join?ref=code`. */
  link: string;
  example: boolean;
  /** All money in minor units (AOA). */
  kpis: {
    clicks: number;
    signups: number;
    activePaying: number;
    /** Earned and not yet paid out. */
    availableCommission: number;
    /** What the paying referrals bring every month, going forward. */
    monthlyCommission: number;
    signupsLast30Days: number;
  };
  referrals: {
    items: PublicReferral[];
    total: number;
    page: number;
    pageSize: number;
  };
}
