import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { isAdmin } from "@/server/auth/admin";
import { requireSession } from "@/server/auth/session";
import { getEnv } from "@/server/config/env";
import { ApiError } from "@/server/http/errors";
import { attemptLimiter, clientIp } from "@/server/http/rateLimit";
import { assertSameOrigin, handle, json, readJson } from "@/server/http/respond";
import { runLaunchBatch, sendLaunchTest } from "@/server/modules/waitlist/launchEmail";
import { getLaunchMode } from "@/waitlist/lib/launch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const failures = attemptLimiter({ max: 5, windowMs: 15 * 60 * 1000 });
const same = (a: string, b: string) => {
  const [x, y] = [Buffer.from(a), Buffer.from(b)];
  return x.length === y.length && timingSafeEqual(x, y);
};

const body = z.object({
  /** Real sending is opt-in: without `send: true` this is a dry run that sends and changes nothing. */
  send: z.boolean().default(false),
  limit: z.number().int().min(1).max(100).default(50),
  /** Sends ONE sample e-mail to this address and nothing else. */
  testTo: z.email().optional(),
});

/**
 * Administrators only: either `Authorization: Bearer <ADMIN_API_TOKEN>` (for the script) or a signed-in admin session.
 * Dry run by default. A real send needs `send: true` AND the site to be in `launched` mode, so the "we are live" e-mail
 * can never go out before the launch by mistake.
 */
export const POST = handle(async (req) => {
  const token = getEnv().ADMIN_API_TOKEN;
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (bearer) {
    if (!token) throw new ApiError("not_found");
    const key = `launch-email:${clientIp(req)}`;
    failures.assertAllowed(key);
    if (!same(bearer, token)) {
      failures.recordFailure(key);
      throw new ApiError("unauthenticated");
    }
  } else {
    assertSameOrigin(req);
    const session = await requireSession(req, { allowUnpaid: true });
    if (!(await isAdmin(session))) throw new ApiError("not_found");
  }

  const input = body.parse(await readJson(req, 2_000));
  if (input.testTo) {
    const result = await sendLaunchTest(input.testTo);
    return json(result, { status: result.ok ? 200 : 502 });
  }
  if (input.send && getLaunchMode() !== "launched") {
    return json(
      {
        error: "not_launched",
        message:
          "A Kandrop ainda não está em modo lançado (LAUNCH_MODE=launched ou a data de lançamento ainda não passou).",
      },
      { status: 409 }
    );
  }
  try {
    return json(await runLaunchBatch({ send: input.send, limit: input.limit }));
  } catch (err) {
    console.error("[launch-email] falhou:", err instanceof Error ? err.message : err);
    return json(
      { error: "batch_failed", message: err instanceof Error ? err.message : "erro" },
      { status: 502 }
    );
  }
});
