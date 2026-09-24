import { requireSession } from "@/server/auth/session";
import { handle, json } from "@/server/http/respond";
import { getBilling } from "@/server/modules/billing/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The plan, its usage, the plan cards and the invoices of the store. Owner only. */
export const GET = handle(async (req) => {
  const auth = await requireSession(req);
  return json(await getBilling(auth), { headers: { "Cache-Control": "no-store" } });
});
