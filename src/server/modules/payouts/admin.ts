import { db, must } from "@/server/db/client";
import { ApiError } from "@/server/http/errors";
import { bankRepository } from "@/server/modules/bank/repository";
import { getDashboardSummary } from "@/server/modules/dashboard/service";
import { eventBus } from "@/server/realtime/eventBus";
import type { PayoutStatus } from "@/shared/payouts/schemas";

export interface AdminMerchantPayout {
  id: string;
  storeId: string;
  storeName: string;
  reference: string;
  amount: number;
  status: PayoutStatus;
  /** Frozen at request time: masked. */
  ibanMasked: string;
  holderName: string;
  createdAt: number;
}

/** Admin: every real merchant payout (historical demo rows excluded), newest first. */
export async function listAllMerchantPayouts(limit = 300): Promise<AdminMerchantPayout[]> {
  const rows = must("admin.merchantPayouts", await db().from("payouts").select("id,store_id,reference,amount,status,bank,created_at").eq("historical", false).order("created_at", { ascending: false }).limit(limit)) ?? [];
  if (!rows.length) return [];
  const ids = [...new Set(rows.map((r) => String(r.store_id)))];
  const stores = must("admin.merchantPayouts.stores", await db().from("stores").select("id,name").in("id", ids)) ?? [];
  const names = new Map(stores.map((s) => [String(s.id), String(s.name)]));
  return rows.map((r) => {
    const bank = (r.bank ?? {}) as { holderName?: string; ibanMasked?: string };
    return {
      id: String(r.id), storeId: String(r.store_id), storeName: names.get(String(r.store_id)) ?? String(r.store_id), reference: String(r.reference),
      amount: Number(r.amount), status: (["pending", "completed", "rejected"].includes(String(r.status)) ? r.status : "pending") as PayoutStatus,
      ibanMasked: bank.ibanMasked ?? "—", holderName: bank.holderName ?? "—", createdAt: Number(r.created_at),
    };
  });
}

/** The store's current payout account, full IBAN: only for the administrator's transfer export (audited). */
export async function merchantBankForExport(storeId: string) {
  const bank = await bankRepository.get(storeId);
  return bank ? { holderName: bank.holderName, iban: bank.iban } : null;
}

/**
 * An administrator pays (the transfer was made) or rejects a pending payout, once (compare-and-set on `pending`).
 * Rejecting gives the money back to the merchant's balance, and every open dashboard of the store is told at once.
 */
export async function decideMerchantPayout(id: string, status: "completed" | "rejected"): Promise<{ storeId: string }> {
  const row = must("payouts.decide", await db().from("payouts").update({ status, completed_at: status === "completed" ? Date.now() : null }).eq("id", id).eq("status", "pending").select("store_id").maybeSingle());
  if (!row) throw new ApiError("invalid_transition");
  const storeId = String(row.store_id);
  try {
    eventBus.publish(storeId, "dashboard.summary", await getDashboardSummary(storeId));
  } catch {
    /* the live push is a courtesy; the next poll shows the right balance anyway */
  }
  return { storeId };
}

export interface WalletCredit {
  orderNumber: number;
  product: string;
  /** The merchant's net of the sale (minor units). */
  amount: number;
  at: number;
}

/** What entered the balance: the merchant's net of each delivered, payment-verified supplier order. Scoped to the store. */
export async function walletCredits(storeId: string, limit = 50): Promise<WalletCredit[]> {
  const rows = must("wallet.credits", await db().from("supplier_orders").select("order_number,product_title,merchant_net,updated_at").eq("store_id", storeId).eq("logistics_status", "delivered").eq("payment_status", "paid_verified").order("updated_at", { ascending: false }).limit(limit)) ?? [];
  return rows.map((r) => ({ orderNumber: Number(r.order_number), product: String(r.product_title), amount: Number(r.merchant_net), at: Number(r.updated_at) }));
}
