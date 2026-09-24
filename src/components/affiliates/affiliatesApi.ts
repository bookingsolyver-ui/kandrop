import { request, type ApiResult } from "@/components/data/apiClient";
import type { AffiliateOverview } from "@/server/modules/affiliates/schema";

export type { ApiResult };

/** The link, the KPIs and one page of referrals. There is no field validation to map. */
export function getAffiliates(page: number, pageSize: number, signal?: AbortSignal) {
  return request<AffiliateOverview>(
    `/api/affiliates?page=${page}&pageSize=${pageSize}`,
    { signal, cache: "no-store" },
    () => ({})
  );
}
