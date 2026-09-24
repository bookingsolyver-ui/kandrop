import { requireSession } from "@/server/auth/session";
import { handle, json } from "@/server/http/respond";
import { getAcademy } from "@/server/modules/academy/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The course with the signed-in person's progress: what is done, what is next, what is locked. */
export const GET = handle(async (req) => {
  const auth = await requireSession(req);
  return json(await getAcademy(auth), { headers: { "Cache-Control": "no-store" } });
});
