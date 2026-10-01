import { getEnv } from "@/server/config/env";

/**
 * Whether a store shows SAMPLE ("demo") data. Real accounts never do: the only cases are the development sandbox
 * store (`sto_demo`, never in production) and a deployment that is deliberately a demo (`KANDROP_DEMO_EVENTS=true`).
 * There is no per-store switch any more, and nothing here turns it on by itself.
 */
export async function isDemoStore(storeId: string): Promise<boolean> {
  const env = getEnv();
  if (env.KANDROP_DEMO_EVENTS) return true;
  return storeId === "sto_demo" && env.NODE_ENV !== "production";
}
