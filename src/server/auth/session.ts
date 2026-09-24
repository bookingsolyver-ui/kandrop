import { getEnv } from "../config/env";
import { ApiError } from "../http/errors";

export interface Session {
  userId: string;
  storeId: string;
  role: "owner" | "staff";
}

/**
 * STUB — replace with real session verification (signed cookie / JWT) using SESSION_SECRET.
 * Every protected route must go through `requireSession`, so swapping the implementation
 * here secures the whole API.
 */
export async function requireSession(req: Request): Promise<Session> {
  const env = getEnv();
  if (env.AUTH_DEV_BYPASS && env.NODE_ENV !== "production") {
    return { userId: "usr_demo", storeId: "sto_demo", role: "owner" };
  }
  // TODO: verify `req` cookie/header. Until implemented, deny by default.
  void req;
  throw new ApiError("unauthenticated");
}
