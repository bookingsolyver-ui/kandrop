"use server";

import { headers } from "next/headers";
import { ZodError } from "zod";
import { signSession } from "@/server/auth/jwt";
import { setSessionCookie } from "@/server/auth/session";
import { ApiError } from "@/server/http/errors";
import { attemptLimiter } from "@/server/http/rateLimit";
import { authenticateSupplier, registerSupplier } from "@/server/modules/supplier/service";

// Server Actions: Next checks the Origin of every call itself (same-origin only), and the limits below
// are the same as the merchant sign-in/sign-up.
const WINDOW_MS = 15 * 60 * 1000;
const registerPerIp = attemptLimiter({ max: 10, windowMs: WINDOW_MS });
const loginPerAccount = attemptLimiter({ max: 5, windowMs: WINDOW_MS });
const loginPerIp = attemptLimiter({ max: 20, windowMs: WINDOW_MS });

async function ip() {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export type RegisterResult =
  | { ok: true }
  | { ok: false; error: "email_taken" | "rate_limited" | "internal" }
  | { ok: false; error: "validation"; fields: Record<string, string> };

export type LoginResult =
  | { ok: true }
  | { ok: false; error: "invalid" | "not_supplier" | "pending" | "rate_limited" | "internal" };

/**
 * Creates the Supabase Auth user and the `suppliers` row (status `pending`, NIF encrypted). It does
 * NOT sign anyone in: the account has to be approved by the Kandrop team first.
 */
export async function registerSupplierAction(raw: unknown): Promise<RegisterResult> {
  const key = `supplier-register:${await ip()}`;
  try {
    registerPerIp.assertAllowed(key);
  } catch {
    return { ok: false, error: "rate_limited" };
  }
  registerPerIp.recordFailure(key); // every attempt counts, successful or not
  try {
    await registerSupplier(raw);
    return { ok: true };
  } catch (err) {
    if (err instanceof ZodError) {
      const fields: Record<string, string> = {};
      for (const issue of err.issues) {
        const field = String(issue.path[0] ?? "");
        if (field && !fields[field]) fields[field] = issue.message;
      }
      return { ok: false, error: "validation", fields };
    }
    if (err instanceof ApiError && err.code === "email_taken") return { ok: false, error: "email_taken" };
    console.error("[supplier] register failed", err instanceof Error ? err.message : err);
    return { ok: false, error: "internal" };
  }
}

/** Signs a supplier in: password first, then the `suppliers` row and its status. */
export async function loginSupplierAction(input: { email?: unknown; password?: unknown }): Promise<LoginResult> {
  const address = await ip();
  const email = typeof input?.email === "string" ? input.email.trim().toLowerCase() : "";
  const accountKey = `supplier-login:${address}:${email}`;
  const ipKey = `supplier-login-ip:${address}`;
  try {
    loginPerAccount.assertAllowed(accountKey);
    loginPerIp.assertAllowed(ipKey);
  } catch {
    return { ok: false, error: "rate_limited" };
  }
  try {
    const result = await authenticateSupplier(input?.email, input?.password);
    if (result.kind === "not_supplier") return { ok: false, error: "not_supplier" };
    if (result.kind === "pending") return { ok: false, error: "pending" };
    loginPerAccount.reset(accountKey);
    const { token, expiresAt } = await signSession({ userId: result.supplier.id, storeId: "supplier", role: "supplier" });
    await setSessionCookie(token, expiresAt);
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError && err.code === "invalid_credentials") {
      loginPerAccount.recordFailure(accountKey);
      loginPerIp.recordFailure(ipKey);
      return { ok: false, error: "invalid" };
    }
    console.error("[supplier] login failed", err instanceof Error ? err.message : err);
    return { ok: false, error: "internal" };
  }
}
