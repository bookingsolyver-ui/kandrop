import type { PublicPayment } from "@/server/modules/payments/schema";

/**
 * DEVELOPMENT SHORTCUT (sandbox only): asks the server to confirm a pending payment right now.
 * Returns the paid payment, or `null` when the server refuses (not sandbox, or no such payment).
 */
export async function simulatePaymentSuccess(paymentId: string): Promise<PublicPayment | null> {
  try {
    const res = await fetch(`/api/payments/${paymentId}/simulate`, { method: "POST" });
    if (!res.ok) return null;
    return ((await res.json()) as { data?: PublicPayment }).data ?? null;
  } catch {
    return null;
  }
}
