import type { ApiErrorCode } from "@/server/http/errors";
import { firstErrorPerField, type ValidationCode } from "@/shared/auth/schemas";

/** Errors that belong to a single input rather than the whole form. */
export type FieldError = ValidationCode | "email_taken";

export type AuthResult =
  /** `subscription`: whether the account already has an active plan (decides where to go next). */
  | { ok: true; subscription: "active" | "pending" }
  | {
      ok: false;
      /** Form-level failure code (translated through `Errors.<code>`). Absent when only fields failed. */
      code?: ApiErrorCode;
      fieldErrors: Record<string, FieldError>;
    };

interface ApiBody {
  error?: {
    code?: ApiErrorCode;
    details?: Array<{ path: PropertyKey[]; message: string }>;
  };
}

/** POSTs JSON and folds every failure mode into one shape the forms can render. */
export async function postAuth(url: string, body: unknown): Promise<AuthResult> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // Offline / DNS / connection reset: nothing more specific to say than "try again".
    return { ok: false, code: "internal", fieldErrors: {} };
  }
  if (res.ok) {
    const body = (await res.json().catch(() => ({}))) as { subscription?: "active" | "pending" };
    return { ok: true, subscription: body.subscription === "active" ? "active" : "pending" };
  }

  const payload = (await res.json().catch(() => ({}))) as ApiBody;
  const code = payload.error?.code ?? "internal";

  if (code === "email_taken") return { ok: false, fieldErrors: { email: "email_taken" } };
  if (code === "validation_failed" && payload.error?.details) {
    return { ok: false, fieldErrors: firstErrorPerField(payload.error.details) };
  }
  return { ok: false, code, fieldErrors: {} };
}
