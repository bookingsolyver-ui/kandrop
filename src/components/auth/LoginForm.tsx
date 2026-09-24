"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { firstErrorPerField, loginSchema } from "@/shared/auth/schemas";
import { postAuth, type FieldError } from "./authApi";
import { FormShell } from "./FormShell";
import { PasswordField, TextField } from "./TextField";
import { useAuthForm } from "./useAuthForm";

const FIELDS = ["email", "password"] as const;
type Field = (typeof FIELDS)[number];

export function LoginForm() {
  const t = useTranslations("Auth");
  const router = useRouter();

  const form = useAuthForm<Field>({
    id: "login",
    fields: FIELDS,
    initial: { email: "", password: "" },
    validate: (values) => {
      const parsed = loginSchema.safeParse(values);
      return parsed.success
        ? {}
        : (firstErrorPerField(parsed.error.issues) as Partial<Record<Field, FieldError>>);
    },
    submit: (values) => postAuth("/api/auth/login", values),
    // Never keep a rejected password around; put the cursor back where the fix happens.
    resetFieldOn: { code: "invalid_credentials", field: "password" },
    onSuccess: () => {
      router.replace("/dashboard");
      router.refresh();
    },
  });

  return (
    <FormShell
      onSubmit={form.onSubmit}
      formError={form.formError}
      showFixHint={form.submitted && form.hasFieldErrors}
      pending={form.pending}
      submitLabel={t("login.submit")}
      pendingLabel={t("login.submitting")}
    >
      <TextField
        {...form.field("email")}
        label={t("fields.email")}
        type="email"
        inputMode="email"
        autoComplete="email"
      />
      <PasswordField
        {...form.field("password")}
        label={t("fields.password")}
        autoComplete="current-password"
      />
    </FormShell>
  );
}
