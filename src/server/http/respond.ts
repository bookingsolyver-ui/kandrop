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
        return Response.json({ error: { code: err.code, details: err.details } }, { status: err.status });
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
