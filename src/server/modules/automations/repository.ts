import "server-only";
import { db, must } from "@/server/db/client";
import { FLOW_KEYS } from "@/shared/automations/schemas";
import type { AutomationState } from "./schema";

const fresh = (): AutomationState => ({
  connection: { status: "disconnected" },
  flows: Object.fromEntries(
    FLOW_KEYS.map((key) => [key, { enabled: false, template: null }])
  ) as AutomationState["flows"],
});

/**
 * One row per store. Every call takes the `storeId`, so tenant scoping cannot be forgotten.
 * (The WhatsApp connection is simulated today: when a real access token is stored it must be
 * encrypted at rest — do not put it in `connection` as plain text.)
 */
export const automationRepository = {
  async get(storeId: string): Promise<AutomationState> {
    const row = must(
      "automation_states.get",
      await db().from("automation_states").select("*").eq("store_id", storeId).maybeSingle()
    );
    if (!row) return fresh();
    // A flow added to the code after the row was written starts switched off.
    return {
      connection: row.connection as AutomationState["connection"],
      flows: { ...fresh().flows, ...(row.flows as AutomationState["flows"]) },
    };
  },

  async save(storeId: string, state: AutomationState): Promise<AutomationState> {
    must(
      "automation_states.save",
      await db()
        .from("automation_states")
        .upsert({ store_id: storeId, connection: state.connection, flows: state.flows })
    );
    return state;
  },
};
