import { request, type ApiResult as Result } from "@/components/data/apiClient";
import type { PublicAutomations, PublicFlow } from "@/server/modules/automations/schema";
import {
  firstAutomationError,
  type AutomationValidationCode,
  type FlowKey,
  type UpdateFlowInput,
} from "@/shared/automations/schemas";

export type ApiResult<T> = Result<T, AutomationValidationCode>;

const call = <T>(url: string, init?: RequestInit) =>
  request<T, AutomationValidationCode>(url, init, firstAutomationError);

export const getAutomations = (signal?: AbortSignal) =>
  call<PublicAutomations>("/api/automations", { signal, cache: "no-store" });

export const connectWhatsApp = (phone: string) =>
  call<PublicAutomations>("/api/automations/connection", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });

export const disconnectWhatsApp = () =>
  call<PublicAutomations>("/api/automations/connection", { method: "DELETE" });

export const updateFlow = (key: FlowKey, body: UpdateFlowInput) =>
  call<PublicFlow>(`/api/automations/flows/${key}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
