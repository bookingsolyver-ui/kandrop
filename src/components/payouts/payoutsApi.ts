import { request, type ApiResult as Result } from "@/components/data/apiClient";
import type { PayoutPage, PublicPayout } from "@/server/modules/payouts/schema";
import {
  firstPayoutError,
  type CreatePayoutInput,
  type ListPayoutsQuery,
  type PayoutValidationCode,
} from "@/shared/payouts/schemas";

export type ApiResult<T> = Result<T, PayoutValidationCode>;

const call = <T>(url: string, init?: RequestInit) =>
  request<T, PayoutValidationCode>(url, init, firstPayoutError);

export function listPayouts(query: ListPayoutsQuery, signal?: AbortSignal) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return call<PayoutPage>(`/api/payouts?${params}`, { signal, cache: "no-store" });
}

export const requestPayout = (body: CreatePayoutInput) =>
  call<PublicPayout>("/api/payouts", { method: "POST", body: JSON.stringify(body) });
