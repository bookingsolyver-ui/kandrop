import { request, type ApiResult } from "@/components/data/apiClient";
import type { AcademyOverview } from "@/server/modules/academy/schema";

export type { ApiResult };

/** The only inputs are buttons, so there is no field validation to map. */
const call = (url: string, init?: RequestInit) => request<AcademyOverview>(url, init, () => ({}));

export const getAcademy = (signal?: AbortSignal) =>
  call("/api/academy", { signal, cache: "no-store" });

export const completeLesson = (id: string) =>
  call(`/api/academy/lessons/${encodeURIComponent(id)}/complete`, { method: "POST" });
