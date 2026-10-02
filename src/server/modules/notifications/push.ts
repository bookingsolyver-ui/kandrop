import webpush from "web-push";
import { getEnv } from "@/server/config/env";
import { db } from "@/server/db/client";

export type PushScope = "merchant" | "admin";

/** The browser's PushSubscription as JSON. */
export interface PushSubscriptionJson {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Is Web Push configured (the VAPID pair)? Without it the feature is off. */
export const pushConfigured = () => {
  const env = getEnv();
  return !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
};

/** Shape check of what a browser sends (never trust it): an https endpoint and the two keys. */
export function parseSubscription(raw: unknown): PushSubscriptionJson | null {
  const s = raw as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  if (!s || typeof s.endpoint !== "string" || s.endpoint.length > 1000 || !s.endpoint.startsWith("https://")) return null;
  if (typeof s.keys?.p256dh !== "string" || typeof s.keys.auth !== "string" || s.keys.p256dh.length > 200 || s.keys.auth.length > 100) return null;
  return { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } };
}

export async function saveSubscription(scope: PushScope, owner: { userId: string; storeId?: string }, subscription: PushSubscriptionJson): Promise<void> {
  const { error } = await db().from("push_subscriptions").upsert({ endpoint: subscription.endpoint, scope, store_id: scope === "merchant" ? owner.storeId ?? null : null, user_id: owner.userId, subscription, created_at: Date.now() });
  if (error) throw new Error(`push_subscriptions.save: ${error.code} ${error.message}`);
}

async function list(scope: PushScope, storeId?: string): Promise<PushSubscriptionJson[]> {
  let q = db().from("push_subscriptions").select("subscription").eq("scope", scope).limit(200);
  if (scope === "merchant") q = q.eq("store_id", storeId ?? "");
  const { data, error } = await q;
  if (error) {
    console.error("[push] could not read subscriptions", error.code, error.message);
    return [];
  }
  return (data ?? []).map((r) => parseSubscription(r.subscription)).filter((s): s is PushSubscriptionJson => s !== null);
}

/** Sends one notification to every device of an audience. Gone devices (404/410) are forgotten. Never throws. */
export async function sendPush(scope: PushScope, storeId: string | undefined, payload: { title: string; body: string; url: string; tag?: string }): Promise<void> {
  try {
    const env = getEnv();
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return;
    webpush.setVapidDetails(env.VAPID_SUBJECT ?? "mailto:suporte@kandrop.com", env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
    const body = JSON.stringify(payload);
    await Promise.all(
      (await list(scope, storeId)).map(async (sub) => {
        try {
          await webpush.sendNotification(sub, body, { TTL: 3600, timeout: 4000 });
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) await db().from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          else console.error("[push] send failed", status ?? (err instanceof Error ? err.message : err));
        }
      })
    );
  } catch (err) {
    console.error("[push] failed", err instanceof Error ? err.message : err);
  }
}
