"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { firstErrorPerField, registerSchema } from "@/shared/auth/schemas";
import { postAuth, type FieldError } from "./authApi";
import { FormShell } from "./FormShell";
import { PasswordChecklist } from "./PasswordChecklist";
import { PasswordField, TextField } from "./TextField";
import { useAuthForm } from "./useAuthForm";

const FIELDS = ["fullName", "storeName", "email", "password"] as const;
type Field = (typeof FIELDS)[number];

export function RegisterForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const router = useRouter();

  const form = useAuthForm<Field>({
    id: "register",
    fields: FIELDS,
    initial: { fullName: "", storeName: "", email: "", password: "" },
    validate: (values) => {
      const parsed = registerSchema.safeParse({ ...values, locale });
      return parsed.success
        ? {}
        : (firstErrorPerField(parsed.error.issues) as Partial<Record<Field, FieldError>>);
    },
    // The UI language at sign-up becomes the account's language for future e-mails.
    submit: (values) => postAuth("/api/auth/register", { ...values, locale }),
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
      submitLabel={t("register.submit")}
      pendingLabel={t("register.submitting")}
    >
      <TextField {...form.field("fullName")} label={t("fields.fullName")} autoComplete="name" />
      <TextField
        {...form.field("storeName")}
        label={t("fields.storeName")}
        autoComplete="organization"
      />
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
        autoComplete="new-password"
        describedBy="register-password-rules"
      >
        <PasswordChecklist
          id="register-password-rules"
          password={form.values.password}
          email={form.values.email}
        />
      </PasswordField>
    </FormShell>
  );
}
