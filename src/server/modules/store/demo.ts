import "server-only";
import { getEnv } from "@/server/config/env";

/**
 * Whether a store shows SAMPLE ("demo") data. Real accounts never do: the only cases are the development sandbox
 * store (`sto_demo`, never in production) and a non-production demo run (`KANDROP_DEMO_EVENTS=true`, ignored in production).
 * There is no per-store switch any more, and nothing here turns it on by itself.
 */
export async function isDemoStore(storeId: string): Promise<boolean> {
  const env = getEnv();
  // PRODUCTION NEVER SEEDS: whatever the variable says, a real deployment starts and stays at absolute zero.
  if (env.NODE_ENV === "production") return false;
  if (env.KANDROP_DEMO_EVENTS) return true;
  return storeId === "sto_demo";
}
