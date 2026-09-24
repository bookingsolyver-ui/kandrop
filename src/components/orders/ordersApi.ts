import { request, type ApiResult as Result } from "@/components/data/apiClient";
import type { OrderPage, PublicOrder } from "@/server/modules/orders/schema";
import {
  firstOrderError,
  type ListOrdersQuery,
  type OrderValidationCode,
  type UpdateOrderStatusInput,
} from "@/shared/orders/schemas";

export type ApiResult<T> = Result<T, OrderValidationCode>;

const call = <T>(url: string, init?: RequestInit) =>
  request<T, OrderValidationCode>(url, init, firstOrderError);

export function listOrders(query: ListOrdersQuery, signal?: AbortSignal) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return call<OrderPage>(`/api/orders?${params}`, { signal, cache: "no-store" });
}

export const updateOrderStatus = (id: string, body: UpdateOrderStatusInput) =>
  call<PublicOrder>(`/api/orders/${id}`, { method: "PATCH", body: JSON.stringify(body) });
