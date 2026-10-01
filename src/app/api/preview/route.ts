import { createHash, timingSafeEqual } from "node:crypto";
import { clientIp, attemptLimiter } from "@/server/http/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "kandrop_preview";
const failures = attemptLimiter({ max: 5, windowMs: 15 * 60 * 1000 });
const hashOf = (key: string) => createHash("sha256").update(`kandrop-preview:${key}`).digest("hex");

/**
 * The door around "coming soon" for the team on the public domain. `?key=<COMING_SOON_BYPASS_KEY>` sets a private
 * cookie (httpOnly, secure, 30 days) and goes to the site; `?off=1` removes it. With no key configured, or a wrong
 * one, it answers 404 (and counts the failure: 5 wrong keys lock the IP out for 15 minutes).
 */
export async function GET(req: Request) {
  const configured = process.env.COMING_SOON_BYPASS_KEY;
  const url = new URL(req.url);
  const home = new URL("/", url.origin);

  if (url.searchParams.get("off") === "1") {
    return new Response(null, { status: 303, headers: { Location: home.toString(), "Set-Cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`, "Cache-Control": "no-store" } });
  }
  if (!configured) return new Response(null, { status: 404 });

  const key = clientIp(req);
  try {
    failures.assertAllowed(`preview:${key}`);
  } catch {
    return new Response(null, { status: 429, headers: { "Retry-After": "900" } });
  }
  const given = Buffer.from(hashOf(url.searchParams.get("key") ?? ""));
  const wanted = Buffer.from(hashOf(configured));
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
    failures.recordFailure(`preview:${key}`);
    return new Response(null, { status: 404 });
  }
  failures.reset(`preview:${key}`);
  return new Response(null, {
    status: 303,
    headers: { Location: home.toString(), "Set-Cookie": `${COOKIE}=${wanted.toString()}; Path=/; Max-Age=${30 * 86_400}; HttpOnly; Secure; SameSite=Lax`, "Cache-Control": "no-store" },
  });
}
