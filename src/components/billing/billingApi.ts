import { request, type ApiResult } from "@/components/data/apiClient";
import type { BillingOverview, UpgradeSession } from "@/server/modules/billing/schema";
import type { PaidPlan } from "@/shared/billing/schemas";

export type { ApiResult };

/** No field validation to map: the only inputs are buttons. */
const call = <T>(url: string, init?: RequestInit) => request<T>(url, init, () => ({}));

export const getBilling = (signal?: AbortSignal) =>
  call<BillingOverview>("/api/billing", { signal, cache: "no-store" });

export const startUpgrade = (plan: PaidPlan) =>
  call<UpgradeSession>("/api/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
