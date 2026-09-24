import { requireSession } from "@/server/auth/session";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { getBankAccount, saveBankAccount } from "@/server/modules/bank/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { headers: { "Cache-Control": "no-store" } };

/** The store's payout account, masked. The full IBAN is never sent back once it is saved. */
export const GET = handle(async (req) => {
  const auth = await requireSession(req);
  return json(await getBankAccount(auth), noStore);
});

/** Creates or replaces it. Owner only, and the caller's password must be confirmed. */
export const PUT = handle(async (req) => {
  assertSameOrigin(req);
  const auth = await requireSession(req);
  return json(await saveBankAccount(auth, await readJson(req, 2_000)), noStore);
});
