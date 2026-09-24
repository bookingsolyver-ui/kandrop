import { requireSession } from "@/server/auth/session";
import { assertSameOrigin, handle, json } from "@/server/http/respond";
import { completeLesson } from "@/server/modules/academy/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Marks the lesson as done (only the next one can be) and returns the updated course. */
export const POST = handle(async (req, ctx: Ctx) => {
  assertSameOrigin(req);
  const auth = await requireSession(req);
  return json(await completeLesson(auth, (await ctx.params).id), {
    headers: { "Cache-Control": "no-store" },
  });
});
