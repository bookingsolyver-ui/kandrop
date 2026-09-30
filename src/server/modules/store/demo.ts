import { getEnv } from "@/server/config/env";
import { db, must } from "@/server/db/client";

/**
 * Whether a store shows sample ("demo") data: the sandbox store, every store when the deployment is
 * a demo (`KANDROP_DEMO_EVENTS=true`), or a store whose owner pressed "Load demo data" (kept in the
 * store's `settings.demo`). Never switched on by itself — a real merchant must not see made-up numbers.
 */
export async function isDemoStore(storeId: string): Promise<boolean> {
  if (storeId === "sto_demo" || getEnv().KANDROP_DEMO_EVENTS) return true;
  const row = must(
    "stores.demo",
    await db().from("stores").select("settings").eq("id", storeId).maybeSingle()
  );
  return (row?.settings as { demo?: boolean } | null)?.demo === true;
}
