import { hasActiveSubscription } from "@/server/modules/billing/plan";
import type { Session } from "./types";

/**
 * THE PAYMENT GATE. An account may use the merchant area only while it has an active paid period
 * (`billing/plan.ts`); a brand-new account, or one whose period ran out, has none and is held at
 * `/checkout`. Worked out from the clock on every request, never from a flag that could go stale.
 *
 * The one exception is the development bypass user (`AUTH_DEV_BYPASS`, refused in production):
 * it has no stored account to pay for.
 */
export const hasAccess = async (session: Session): Promise<boolean> =>
  session.userId === "usr_demo" || (await hasActiveSubscription(session.storeId));

/** What the sign-in and sign-up responses tell the browser, so it goes to the right page at once. */
export const subscriptionStateOf = async (session: Session): Promise<"active" | "pending"> =>
  (await hasAccess(session)) ? "active" : "pending";
