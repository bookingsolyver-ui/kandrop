import { ZodError } from "zod";
import { ApiError } from "./errors";

type Handler<C> = (req: Request, ctx: C) => Promise<Response> | Response;

export function json<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ data }, init);
}

/** Wraps a route handler: maps thrown errors to `{ error: { code } }` responses. */
export function handle<C = unknown>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof ApiError) {
        return Response.json(
          { error: { code: err.code, details: err.details } },
          { status: err.status, headers: err.headers }
        );
      }
      if (err instanceof ZodError) {
        return Response.json(
          { error: { code: "validation_failed", details: err.issues } },
          { status: 422 }
        );
      }
      console.error("[api] unhandled error", err);
      return Response.json({ error: { code: "internal" } }, { status: 500 });
    }
  };
}

/**
 * Reads a JSON body; anything unparsable is a validation error, never a 500.
 * `maxBytes` rejects an oversized body up front from its declared length.
 */
export async function readJson(req: Request, maxBytes?: number): Promise<unknown> {
  if (maxBytes && Number(req.headers.get("content-length") ?? 0) > maxBytes) {
    throw new ApiError("payload_too_large");
  }
  try {
    return await req.json();
  } catch {
    throw new ApiError("validation_failed");
  }
}

/**
 * CSRF defence in depth for cookie-authenticated mutations (on top of SameSite=Lax):
 * a browser always sends `Origin` on cross-site POSTs, so a mismatch is rejected.
 * Requests without `Origin` (curl, server-to-server) are not browser-driven and pass.
 */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost: string | null = null;
  try {
    originHost = new URL(origin).host;
  } catch {
    /* malformed Origin is rejected below */
  }
  if (!host || originHost !== host) throw new ApiError("forbidden");
}
