import { request, type ApiResult as Result } from "@/components/data/apiClient";
import type { DeliveryPage, PublicDelivery } from "@/server/modules/logistics/schema";
import {
  firstLogisticsError,
  type ListDeliveriesQuery,
  type LogisticsValidationCode,
} from "@/shared/logistics/schemas";

export type ApiResult<T> = Result<T, LogisticsValidationCode>;

const call = <T>(url: string, init?: RequestInit) =>
  request<T, LogisticsValidationCode>(url, init, firstLogisticsError);

export function listDeliveries(query: ListDeliveriesQuery, signal?: AbortSignal) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return call<DeliveryPage>(`/api/deliveries?${params}`, { signal, cache: "no-store" });
}

export const dispatchOrder = (orderId: string) =>
  call<PublicDelivery>("/api/deliveries", { method: "POST", body: JSON.stringify({ orderId }) });

export const getDelivery = (id: string, signal?: AbortSignal) =>
  call<PublicDelivery>(`/api/deliveries/${encodeURIComponent(id)}`, { signal, cache: "no-store" });
