import { isAdmin } from "@/server/auth/admin";
import { requireSession } from "@/server/auth/session";
import { ApiError } from "@/server/http/errors";
import { clientIp } from "@/server/http/rateLimit";
import { handle } from "@/server/http/respond";
import { recordAudit } from "@/server/modules/audit/service";
import { userRepository } from "@/server/modules/auth/userRepository";
import { supplierBank } from "@/server/modules/supplier/catalog";
import { listAllMerchantPayouts, merchantBankForExport } from "@/server/modules/payouts/admin";
import { listAllWithdrawals } from "@/server/modules/supplier/withdrawals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

/**
 * The transfer file for the bank: every REQUESTED supplier withdrawal and every pending merchant payout, with the bank and FULL IBAN. The IBAN is
 * decrypted here, on the server, for an administrator only, and the export itself is audited. It never travels in a page.
 * `;`-separated with a BOM, which is what Excel in Portuguese opens without asking questions.
 */
export const GET = handle(async (req) => {
  const session = await requireSession(req, { allowUnpaid: true });
  if (!(await isAdmin(session))) throw new ApiError("not_found");

  const pending = (await listAllWithdrawals()).filter((w) => w.status === "requested");
  const lines = await Promise.all(
    pending.map(async (w) => {
      const bank = await supplierBank.getFull(w.supplierId).catch(() => null);
      return [`WD-${w.id.slice(0, 8).toUpperCase()}`, w.supplierName, bank?.holderName ?? "", bank?.bankName ?? "", bank?.iban ?? "", Math.round(w.amount / 100), new Date(w.createdAt).toISOString().slice(0, 10)].map(cell).join(";");
    })
  );
  const merchantPending = (await listAllMerchantPayouts()).filter((p) => p.status === "pending");
  const merchantLines = await Promise.all(
    merchantPending.map(async (p) => {
      // The store's CURRENT account (the payout only froze it masked); the holder is checked by the person who pays.
      const bank = await merchantBankForExport(p.storeId).catch(() => null);
      return [p.reference, p.storeName, bank?.holderName ?? p.holderName, "", bank?.iban ?? "", Math.round(p.amount / 100), new Date(p.createdAt).toISOString().slice(0, 10)].map(cell).join(";");
    })
  );
  const head = ["referencia", "fornecedor", "titular", "banco", "iban", "valor_kz", "data"].join(";");

  const actor = await userRepository.findById(session.userId);
  await recordAudit({ actorId: session.userId, actorEmail: actor?.email ?? null, action: "withdrawal.export", target: `${pending.length + merchantPending.length} transfers`, before: {}, after: { suppliers: pending.length, merchants: merchantPending.length }, ip: clientIp(req) });

  return new Response(`﻿${[head, ...lines, ...merchantLines].join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kandrop-lote-transferencias-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
