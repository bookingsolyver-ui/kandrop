"use client";

import { useLocale, useTranslations } from "next-intl";
import { TrendingUpIcon } from "@/components/kai/icons";
import { BRAND_BUTTON_CLASS } from "@/components/ui/BrandButton";
import { Link, useRouter } from "@/i18n/navigation";
import { firstErrorPerField, registerSchema } from "@/shared/auth/schemas";
import { AuthField, LockIcon, MailIcon, StoreIcon, UserIcon } from "./AuthFields";
import { AuthSplit, CheckCircleIcon, TrustStrip } from "./AuthSplit";
import { postAuth, type FieldError } from "./authApi";
import { PasswordChecklist } from "./PasswordChecklist";
import { useAuthForm } from "./useAuthForm";

const FIELDS = ["fullName", "storeName", "email", "password"] as const;
type Field = (typeof FIELDS)[number];

/** Sign-up: same split screen as sign-in; the form keeps the validation and the account creation of before. */
export function RegisterScreen() {
  const t = useTranslations("Register");
  const login = useTranslations("Login");
  const auth = useTranslations("Auth");
  const te = useTranslations("Errors");
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
    // A new account has paid nothing: straight to the payment step, never to the dashboard.
    onSuccess: () => {
      router.replace("/checkout");
      router.refresh();
    },
  });

  return (
    <AuthSplit
      tag={t("panel.tag")}
      mobileTitle={
        <>
          {t("mobile.headlineA")} <span className="text-primary">{t("mobile.headlineB")}</span>
        </>
      }
      mobileLink={
        <Link href="/login" className="text-xs font-medium text-white/70 transition-colors hover:text-white sm:hidden">
          {t("mobile.login")} <span className="ml-0.5 text-primary">→</span>
        </Link>
      }
      aside={
        <>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium tracking-wide text-white/80 backdrop-blur">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            {t("panel.tag")}
          </div>
          <div className="space-y-10">
            <div>
              <h2 className="text-4xl leading-[1.05] font-bold text-white xl:text-5xl">
                {t("panel.headlineA")}
                <br />
                <span className="text-primary">{t("panel.headlineB")}</span>
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-white/70">{t("panel.body")}</p>
            </div>
            <div className="relative w-fit max-w-sm">
              <div className="relative rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
                    <TrendingUpIcon size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium tracking-wide text-white/60 uppercase">{t("panel.saleLabel")}</p>
                    <p className="mt-1 text-2xl font-bold text-white">{t("panel.saleAmount")}</p>
                    <p className="mt-1 text-xs text-white/50">{t("panel.saleNote")}</p>
                  </div>
                </div>
                <p className="mt-3 text-[10px] text-white/45">{login("example")}</p>
              </div>
              <div className="absolute -top-3 -right-3 flex items-center gap-1.5 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white uppercase shadow-lg">
                <CheckCircleIcon size={12} />
                {login("panel.paid")}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 border-t border-white/10 pt-8">
            {(["A", "B", "C"] as const).map((k) => (
              <div key={k}>
                <p className="text-2xl font-bold text-primary xl:text-3xl">{t(`panel.stat${k}`)}</p>
                <p className="mt-1 text-xs text-white/55">{t(`panel.stat${k}Label`)}</p>
              </div>
            ))}
          </div>
        </>
      }
    >
      <div className="relative overflow-hidden rounded-t-3xl rounded-b-2xl border border-border bg-card p-5 shadow-[0_-8px_24px_rgba(20,16,8,.06),0_24px_48px_rgba(20,16,8,.08)] sm:p-8 lg:rounded-2xl lg:shadow-[0_4px_8px_rgba(20,16,8,.05),0_24px_48px_rgba(20,16,8,.08)]">
        <div className="mb-5">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
            {t("badge")}
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground lg:text-2xl">
            {t("headingA")} <span className="text-primary">{t("headingB")}</span>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground lg:text-sm">{t("sub")}</p>
        </div>
        <div aria-hidden className="pointer-events-none absolute top-0 left-0 h-px w-full bg-gradient-to-r from-primary/0 via-primary to-primary/0" />

        {/* `noValidate`: the browser's own bubbles are replaced by our translated messages. */}
        <form onSubmit={form.onSubmit} noValidate className="space-y-5">
          {(form.formError || (form.submitted && form.hasFieldErrors)) && (
            <div role="alert" className="rounded-xl border border-down px-3.5 py-3 text-[13px] leading-snug text-down">
              {form.formError ? te(form.formError) : auth("fixErrors")}
            </div>
          )}

          <AuthField
            field={form.field("fullName")}
            label={auth("fields.fullName")}
            icon={<UserIcon />}
            autoComplete="name"
            placeholder={t("fullNamePlaceholder")}
          />
          <AuthField
            field={form.field("storeName")}
            label={auth("fields.storeName")}
            icon={<StoreIcon />}
            autoComplete="organization"
            placeholder={t("storePlaceholder")}
          />
          <AuthField
            field={form.field("email")}
            label={auth("fields.email")}
            icon={<MailIcon />}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={login("emailPlaceholder")}
          />
          <AuthField
            field={form.field("password")}
            label={auth("fields.password")}
            icon={<LockIcon />}
            type="password"
            autoComplete="new-password"
            placeholder={t("passwordPlaceholder")}
            describedBy="register-password-rules"
          >
            <PasswordChecklist
              id="register-password-rules"
              password={form.values.password}
              email={form.values.email}
            />
          </AuthField>

          <div className="pt-2">
            <button
              type="submit"
              disabled={form.pending}
              aria-busy={form.pending}
              className={`${BRAND_BUTTON_CLASS} h-12 w-full text-sm`}
            >
              <span className="relative inline-flex items-center justify-center gap-2">
                {form.pending ? auth("register.submitting") : auth("register.submit")}
              </span>
            </button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            {t("loginPrompt")}{" "}
            <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
              {t("loginLink")}
            </Link>
          </p>
        </form>
      </div>

      <TrustStrip secure={login("secure")} support={login("support")} />
      <p className="mx-auto mt-6 max-w-full px-2 text-center text-[11px] leading-relaxed text-gray-500">
        {auth("securityNote")}
      </p>
    </AuthSplit>
  );
}
