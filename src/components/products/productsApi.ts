import { request, type ApiResult as Result } from "@/components/data/apiClient";
import type { ProductPage, PublicProduct } from "@/server/modules/products/schema";
import {
  firstProductError,
  type CreateProductInput,
  type ListProductsQuery,
  type ProductValidationCode,
  type UpdateProductInput,
} from "@/shared/products/schemas";

export type ApiResult<T> = Result<T, ProductValidationCode>;

const call = <T>(url: string, init?: RequestInit) =>
  request<T, ProductValidationCode>(url, init, firstProductError);

export function listProducts(query: ListProductsQuery, signal?: AbortSignal) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return call<ProductPage>(`/api/products?${params}`, { signal, cache: "no-store" });
}

export const createProduct = (body: CreateProductInput) =>
  call<PublicProduct>("/api/products", { method: "POST", body: JSON.stringify(body) });

export const updateProduct = (id: string, body: UpdateProductInput) =>
  call<PublicProduct>(`/api/products/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const deleteProduct = (id: string) =>
  call<void>(`/api/products/${id}`, { method: "DELETE" });
