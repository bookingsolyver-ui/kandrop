import { timingSafeEqual } from "node:crypto";
import { getEnv } from "@/server/config/env";
import { ApiError } from "@/server/http/errors";
import { attemptLimiter, clientIp } from "@/server/http/rateLimit";
import { handle, json } from "@/server/http/respond";
import { confirmBankTransfer } from "@/server/modules/payments/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ reference: string }> };
const failures = attemptLimiter({ max: 5, windowMs: 15 * 60 * 1000 });

const same = (a: string, b: string) => {
  const [x, y] = [Buffer.from(a), Buffer.from(b)];
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * A person at Kandrop confirms a bank transfer arrived: `Authorization: Bearer <ADMIN_API_TOKEN>`.
 * The payment succeeds, the receipt is issued and the plan is activated. With no `ADMIN_API_TOKEN`
 * configured the endpoint does not exist (404). Wrong tokens are counted and eventually locked out.
 */
export const POST = handle(async (req, ctx: Ctx) => {
  const token = getEnv().ADMIN_API_TOKEN;
  if (!token) throw new ApiError("not_found");

  const key = `admin:${clientIp(req)}`;
  failures.assertAllowed(key);
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!same(given, token)) {
    failures.recordFailure(key);
    throw new ApiError("unauthenticated");
  }

  const payment = await confirmBankTransfer((await ctx.params).reference);
  if (!payment) throw new ApiError("not_found");
  return json(payment, { headers: { "Cache-Control": "no-store" } });
});
