import { z } from "zod";

/**
 * Validation shared by the browser (instant feedback) and the API (the real gate).
 * Messages are stable CODES, never prose — the UI translates `Auth.validation.<code>`.
 */
export type ValidationCode =
  | "email_required"
  | "email_invalid"
  | "password_required"
  | "password_too_short"
  | "password_too_long"
  | "password_needs_letter_number"
  | "password_too_common"
  | "password_contains_email"
  | "name_required"
  | "name_too_short"
  | "store_name_required"
  | "store_name_too_short";

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "passw0rd",
  "1234567890",
  "12345678910",
  "123456789a",
  "qwertyuiop",
  "qwerty12345",
  "abcdefghij",
  "abcd123456",
  "iloveyou12",
  "welcome123",
  "admin12345",
  "letmein123",
  "senha12345",
  "palavrapasse",
  "angola12345",
  "luanda12345",
  "kandrop123",
  "kandrop1234",
  "kandropkandrop",
]);

export interface PasswordChecks {
  length: boolean;
  letterAndNumber: boolean;
  notCommon: boolean;
  notEmail: boolean;
}

/** Pure, so the register form can show the same rules live as the user types. */
export function evaluatePassword(password: string, email = ""): PasswordChecks {
  const local = email.trim().toLowerCase().split("@")[0] ?? "";
  const lower = password.toLowerCase();
  return {
    length: password.length >= PASSWORD_MIN,
    letterAndNumber: /\p{L}/u.test(password) && /\p{N}/u.test(password),
    notCommon: !COMMON_PASSWORDS.has(lower),
    notEmail: local.length < 4 || !lower.includes(local),
  };
}

const c = (code: ValidationCode) => ({ error: code });

export const emailSchema = z
  .string(c("email_required"))
  .trim()
  .min(1, c("email_required"))
  .max(254, c("email_invalid"))
  .pipe(z.email(c("email_invalid")))
  .transform((value) => value.toLowerCase());

export const loginSchema = z.object({
  email: emailSchema,
  // No policy on login: only "is it there". Strength rules apply when a password is created.
  password: z.string(c("password_required")).min(1, c("password_required")).max(PASSWORD_MAX),
});

export const registerSchema = z
  .object({
    fullName: z
      .string(c("name_required"))
      .trim()
      .min(1, c("name_required"))
      .min(2, c("name_too_short"))
      .max(80, c("name_too_short")),
    storeName: z
      .string(c("store_name_required"))
      .trim()
      .min(1, c("store_name_required"))
      .min(2, c("store_name_too_short"))
      .max(80, c("store_name_too_short")),
    email: emailSchema,
    password: z
      .string(c("password_required"))
      .min(1, c("password_required"))
      .min(PASSWORD_MIN, c("password_too_short"))
      .max(PASSWORD_MAX, c("password_too_long")),
    /** UI language at sign-up; drives the language of future e-mails/notifications. */
    locale: z.enum(["pt", "en", "fr"]).default("pt"),
  })
  .superRefine((value, ctx) => {
    const checks = evaluatePassword(value.password, value.email);
    const add = (message: ValidationCode) =>
      ctx.addIssue({ code: "custom", message, path: ["password"] });
    // Length problems are reported by the field schema above; only add content rules once long enough.
    if (value.password.length < PASSWORD_MIN) return;
    if (!checks.letterAndNumber) add("password_needs_letter_number");
    else if (!checks.notCommon) add("password_too_common");
    else if (!checks.notEmail) add("password_contains_email");
  });

export type LoginInput = z.input<typeof loginSchema>;
export type RegisterInput = z.input<typeof registerSchema>;

/** First error code per field — what a form needs to render one clear message per input. */
export function firstErrorPerField(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>
): Record<string, ValidationCode> {
  const out: Record<string, ValidationCode> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !(field in out)) out[field] = issue.message as ValidationCode;
  }
  return out;
}
