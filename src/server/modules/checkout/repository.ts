import type { CheckoutSession } from "./schema";

/**
 * STUB — in-memory, per process, lost on restart. Replace with a table keyed by `id`
 * (with an index on `expiresAt` for cleanup); the functions below are the whole contract.
 */
const g = globalThis as unknown as { __kandropCheckouts?: Map<string, CheckoutSession> };
const sessions = (g.__kandropCheckouts ??= new Map<string, CheckoutSession>());

export const checkoutRepository = {
  get: (id: string) => sessions.get(id) ?? null,
  save(session: CheckoutSession) {
    sessions.set(session.id, session);
    // Opportunistic cleanup so abandoned demo sessions do not accumulate.
    const cutoff = Date.now() - 60 * 60 * 1000;
    for (const [id, s] of sessions) if (s.expiresAt < cutoff) sessions.delete(id);
    return session;
  },
};
