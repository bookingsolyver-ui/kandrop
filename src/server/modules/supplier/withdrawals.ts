import "server-only";
import { db, must } from "@/server/db/client";
import { ApiError } from "@/server/http/errors";
import { supplierBank } from "./catalog";

export type WithdrawalStatus = "requested" | "paid" | "rejected";

export interface Withdrawal {
  id: string;
  supplierId: string;
  /** Minor units. */
  amount: number;
  /** Kandrop's withdrawal fee: the bank receives `amount - fee`. */
  fee: number;
  status: WithdrawalStatus;
  createdAt: number;
  processedAt: number | null;
}

/** The smallest withdrawal: 5 000 Kz, in minor units. */
export const MIN_WITHDRAWAL = 500_000;

const toWithdrawal = (r: Record<string, unknown>): Withdrawal => ({
  id: String(r.id),
  supplierId: String(r.supplier_id),
  amount: Number(r.amount),
  fee: Number(r.fee ?? 0),
  status: (["requested", "paid", "rejected"].includes(String(r.status)) ? r.status : "requested") as WithdrawalStatus,
  createdAt: Number(r.created_at),
  processedAt: r.processed_at == null ? null : Number(r.processed_at),
});

/** A supplier's own withdrawals (always filtered by the supplier id), newest first. */
export async function listSupplierWithdrawals(supplierId: string): Promise<Withdrawal[]> {
  const data = must("withdrawals.list", await db().from("supplier_withdrawals").select("*").eq("supplier_id", supplierId).order("created_at", { ascending: false }).limit(200));
  return (data ?? []).map(toWithdrawal);
}

/**
 * Asks for a withdrawal. The database function checks the amount against the supplier's REAL balance (delivered +
 * payment-verified lines, minus what was already asked for) and writes the row, in one locked transaction.
 */
export async function requestWithdrawal(supplierId: string, amountMinor: number): Promise<string> {
  const { data, error } = await db().rpc("request_supplier_withdrawal", { p_supplier_id: supplierId, p_amount: amountMinor, p_min: MIN_WITHDRAWAL });
  if (error) {
    const message = error.message ?? "";
    if (message.includes("invalid_amount")) throw new ApiError("insufficient_balance");
    if (message.includes("no_bank")) throw new ApiError("no_bank_account");
    if (message.includes("not_found")) throw new ApiError("not_found");
    must("withdrawals.request", { data: null, error });
  }
  return String(data);
}

export interface AdminWithdrawal extends Withdrawal {
  supplierName: string;
  bank: { bankName: string; holderName: string; ibanMasked: string } | null;
}

/** Admin: every withdrawal of the platform, with who asked and where it goes (IBAN masked). */
export async function listAllWithdrawals(limit = 300): Promise<AdminWithdrawal[]> {
  const rows = must("withdrawals.all", await db().from("supplier_withdrawals").select("*").order("created_at", { ascending: false }).limit(limit)) ?? [];
  if (!rows.length) return [];
  const ids = [...new Set(rows.map((r) => String(r.supplier_id)))];
  const suppliers = must("withdrawals.suppliers", await db().from("suppliers").select("id,company_name").in("id", ids)) ?? [];
  const names = new Map(suppliers.map((s) => [String(s.id), String(s.company_name)]));
  const banks = new Map(await Promise.all(ids.map(async (id) => [id, await supplierBank.get(id).catch(() => null)] as const)));
  return rows.map((r) => {
    const supplierId = String(r.supplier_id);
    const bank = banks.get(supplierId);
    return { ...toWithdrawal(r), supplierName: names.get(supplierId) ?? "—", bank: bank ? { bankName: bank.bankName, holderName: bank.holderName, ibanMasked: bank.ibanMasked } : null };
  });
}

/** Admin: a requested withdrawal is paid or rejected, once (compare-and-set on `requested`). */
export async function decideWithdrawal(id: string, status: "paid" | "rejected", operator: string): Promise<{ before: WithdrawalStatus }> {
  const row = must("withdrawals.decide", await db().from("supplier_withdrawals").update({ status, processed_at: Date.now(), processed_by: operator }).eq("id", id).eq("status", "requested").select("id").maybeSingle());
  if (!row) throw new ApiError("invalid_transition");
  return { before: "requested" };
}
