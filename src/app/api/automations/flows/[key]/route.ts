import { requireSession } from "@/server/auth/session";
import { ApiError } from "@/server/http/errors";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { updateFlow } from "@/server/modules/automations/service";
import { FLOW_KEYS, type FlowKey, type UpdateFlowInput } from "@/shared/automations/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ key: string }> };

/** `{ enabled?, template?, reset? }` — switch a flow, edit its message, or restore the default. */
export const PATCH = handle(async (req, ctx: Ctx) => {
  assertSameOrigin(req);
  const auth = await requireSession(req);
  const { key } = await ctx.params;
  if (!(FLOW_KEYS as readonly string[]).includes(key)) throw new ApiError("not_found");
  const body = (await readJson(req, 4_000)) as UpdateFlowInput;
  return json(await updateFlow(auth, key as FlowKey, body), {
    headers: { "Cache-Control": "no-store" },
  });
});
