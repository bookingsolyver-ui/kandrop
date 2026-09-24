import type { ChargeRecord, SubscriptionRecord } from "./schema";

/**
 * STUB — in-memory, per process, lost on restart. Replace with `subscriptions` (one row per
 * store) and `charges` (index on `store_id, created_at`, unique on `session_id`) tables. Every
 * call takes the `storeId`.
 */
const g = globalThis as unknown as {
  __kandropBilling?: {
    subscriptions: Map<string, SubscriptionRecord>;
    charges: Map<string, ChargeRecord[]>;
  };
};
const db = (g.__kandropBilling ??= { subscriptions: new Map(), charges: new Map() });

export const billingRepository = {
  subscription: (storeId: string) => db.subscriptions.get(storeId) ?? null,
  saveSubscription(subscription: SubscriptionRecord) {
    db.subscriptions.set(subscription.storeId, subscription);
    return subscription;
  },
  charges: (storeId: string) => db.charges.get(storeId) ?? [],
  addCharge(charge: ChargeRecord) {
    db.charges.set(charge.storeId, [...(db.charges.get(charge.storeId) ?? []), charge]);
    return charge;
  },
  chargeBySession(sessionId: string): ChargeRecord | null {
    for (const list of db.charges.values() as IterableIterator<ChargeRecord[]>) {
      const found = list.find((c) => c.sessionId === sessionId);
      if (found) return found;
    }
    return null;
  },
};
