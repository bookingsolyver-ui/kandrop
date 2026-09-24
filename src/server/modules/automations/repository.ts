import { FLOW_KEYS } from "@/shared/automations/schemas";
import type { AutomationState } from "./schema";

/**
 * STUB — in-memory, per process, lost on restart. Replace with an `automation_flows` table
 * (one row per store and flow) and a `whatsapp_connections` table whose access token is
 * **encrypted at rest**. Every call takes the `storeId`, so tenant scoping cannot be forgotten.
 */
const g = globalThis as unknown as { __kandropAutomations?: Map<string, AutomationState> };
const states = (g.__kandropAutomations ??= new Map<string, AutomationState>());

const fresh = (): AutomationState => ({
  connection: { status: "disconnected" },
  flows: Object.fromEntries(
    FLOW_KEYS.map((key) => [key, { enabled: false, template: null }])
  ) as AutomationState["flows"],
});

export const automationRepository = {
  get(storeId: string): AutomationState {
    let state = states.get(storeId);
    if (!state) states.set(storeId, (state = fresh()));
    return state;
  },
};
