"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { AlertCircleIcon, TrendingUpIcon } from "@/components/kai/icons";
import { Link, useRouter } from "@/i18n/navigation";
import { PASSWORD_MAX, PASSWORD_MIN, firstErrorPerField, loginSchema } from "@/shared/auth/schemas";
import { postAuth, type FieldError } from "./authApi";
import { useAuthForm } from "./useAuthForm";

const FIELDS = ["email", "password"] as const;
type Field = (typeof FIELDS)[number];

const DARK = "linear-gradient(135deg, #000000 0%, #141414 45%, #2e2e2e 100%)";
const DOTS = "radial-gradient(circle, rgba(255,255,255,0.55) 1px, transparent 1px)";
const GLOW = (a: number, b: number) =>
  `radial-gradient(circle, rgba(255, 90, 0, ${a}) 0%, rgba(255, 90, 0, ${b}) 45%, transparent 75%)`;

const INPUT =
  "flex h-12 w-full rounded-xl border bg-input px-3 py-2 pl-10 text-sm text-foreground shadow-xs outline-none transition-all placeholder:text-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20";

function MailIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
function LockIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="m3 3 18 18" />}
    </svg>
  );
}
function ShieldCheckIcon() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function CheckCircleIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function ArrowRightIcon() {
  return (
    <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

/** Sign-in: the form on the left (white), the promo panel on the right (dark, phones get a hero on top). */
export function LoginScreen() {
  const t = useTranslations("Login");
  const auth = useTranslations("Auth");
  const tv = useTranslations("Auth.validation");
  const te = useTranslations("Errors");
  const common = useTranslations("Auth.password");
  const router = useRouter();
  const [visible, setVisible] = useState(false);

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
    // Already paid → the dashboard; not paid yet → the payment step.
    onSuccess: ({ subscription }) => {
      router.replace(subscription === "active" ? "/dashboard" : "/checkout");
      router.refresh();
    },
  });

  const errorText = (code: FieldError) =>
    code === "email_taken" ? te("email_taken") : tv(code, { min: PASSWORD_MIN, max: PASSWORD_MAX });
  const email = form.field("email");
  const password = form.field("password");

  const fieldError = (id: string, error?: FieldError) =>
    error && (
      <p id={`${id}-error`} className="mt-1.5 flex items-start gap-2 text-[13px] leading-snug text-down">
        <AlertCircleIcon size={14} className="mt-px shrink-0" />
        <span>{errorText(error)}</span>
      </p>
    );

  return (
    <div className="relative flex min-h-screen w-full bg-white">
      <div className="relative flex w-full flex-col lg:w-1/2">
        {/* Phones: a compact dark hero instead of the side panel. */}
        <div className="relative overflow-hidden lg:hidden" style={{ background: DARK }}>
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.10]" style={{ backgroundImage: DOTS, backgroundSize: "22px 22px" }} />
          <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-[320px] w-[320px] rounded-full" style={{ background: GLOW(0.55, 0.18), filter: "blur(60px)" }} />
          <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 h-[300px] w-[300px] rounded-full" style={{ background: GLOW(0.45, 0.12), filter: "blur(70px)" }} />
          <div className="relative z-10 px-5 pt-7 pb-16 sm:px-8 sm:pt-9 sm:pb-20">
            <div className="flex items-center justify-between">
              <Image src="/logo-kandrop-full.png" alt="Kandrop" width={1024} height={206} priority className="h-8 w-auto brightness-0 invert" />
              <Link href="/register" className="text-xs font-medium text-white/70 transition-colors hover:text-white sm:hidden">
                {t("mobile.create")} <span className="ml-0.5 text-primary">→</span>
              </Link>
            </div>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium tracking-wide text-white/85 backdrop-blur">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              {t("panel.tag")}
            </div>
            <h2 className="mt-3 text-2xl leading-[1.1] font-bold text-white sm:text-3xl">
              {t("mobile.headlineA")} <span className="text-primary">{t("mobile.headlineB")}</span>
            </h2>
          </div>
        </div>

        <div aria-hidden className="pointer-events-none absolute inset-0 hidden opacity-[0.5] lg:block" style={{ backgroundImage: "radial-gradient(circle, rgba(15,15,20,0.08) 1px, transparent 1px)", backgroundSize: "22px 22px", maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)" }} />
        <div aria-hidden className="pointer-events-none absolute top-0 left-1/2 -z-0 hidden h-[500px] w-[700px] -translate-x-1/2 opacity-[0.10] lg:block" style={{ background: "radial-gradient(ellipse at top, rgba(255,90,0,0.55) 0%, rgba(255,90,0,0.15) 40%, transparent 70%)", filter: "blur(80px)" }} />

        <header className="relative z-10 hidden items-center justify-between px-6 py-5 sm:px-10 sm:py-6 lg:flex lg:px-14">
          <Image src="/logo-kandrop-full.png" alt="Kandrop" width={1024} height={206} priority className="h-9 w-auto" />
          <div className="flex items-center gap-4">
            <LocaleSwitcher className="h-9 cursor-pointer rounded-full border border-border bg-white px-3 text-[13px] font-medium text-foreground" />
            <span className="hidden text-sm font-medium text-foreground sm:inline-flex">
              {t("signupPrompt")}
              <Link href="/register" className="ml-1 text-primary underline-offset-4 hover:underline">
                {t("signupLink")}
              </Link>
            </span>
          </div>
        </header>

        <main className="relative z-10 flex flex-1 items-start justify-center px-4 pb-8 sm:items-center sm:px-10 sm:py-8 lg:items-center lg:px-14">
          <div className="-mt-10 w-full max-w-md sm:-mt-14 lg:mt-0">
            <div className="animate-fade-in">
              <div className="relative overflow-hidden rounded-t-3xl rounded-b-2xl border border-border bg-card p-5 shadow-[0_-8px_24px_rgba(20,16,8,.06),0_24px_48px_rgba(20,16,8,.08)] sm:p-8 lg:rounded-2xl lg:shadow-[0_4px_8px_rgba(20,16,8,.05),0_24px_48px_rgba(20,16,8,.08)]">
                <div className="mb-5">
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                    {t("welcome")}
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

                  <div className="space-y-1.5">
                    <label htmlFor={email.id} className="text-xs font-semibold tracking-wide text-foreground/80 uppercase">
                      {auth("fields.email")}
                    </label>
                    <div className="group relative">
                      <MailIcon className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <input
                        {...email}
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder={t("emailPlaceholder")}
                        aria-invalid={email.error ? true : undefined}
                        aria-describedby={email.error ? `${email.id}-error` : undefined}
                        className={`${INPUT} ${email.error ? "border-down" : "border-border"}`}
                      />
                    </div>
                    {fieldError(email.id, email.error)}
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor={password.id} className="text-xs font-semibold tracking-wide text-foreground/80 uppercase">
                      {auth("fields.password")}
                    </label>
                    <div className="group relative">
                      <LockIcon className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <input
                        {...password}
                        type={visible ? "text" : "password"}
                        autoComplete="current-password"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder={t("passwordPlaceholder")}
                        aria-invalid={password.error ? true : undefined}
                        aria-describedby={password.error ? `${password.id}-error` : undefined}
                        className={`${INPUT} pr-11 ${password.error ? "border-down" : "border-border"}`}
                      />
                      <button
                        type="button"
                        onClick={() => setVisible((v) => !v)}
                        aria-label={visible ? common("hide") : common("show")}
                        aria-pressed={visible}
                        className="absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <EyeIcon off={visible} />
                      </button>
                    </div>
                    {fieldError(password.id, password.error)}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={form.pending}
                      aria-busy={form.pending}
                      className="group relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-2 text-sm font-semibold tracking-wide whitespace-nowrap text-white shadow-[0_6px_18px_-6px_rgba(255,90,0,0.6)] transition-all outline-none hover:shadow-[0_10px_24px_-6px_rgba(255,90,0,0.7)] focus-visible:ring-[3px] focus-visible:ring-primary/40 disabled:cursor-progress disabled:opacity-60 disabled:shadow-none"
                      style={{ background: "linear-gradient(135deg, #ff7e2e 0%, #ff5a00 50%, #d94c00 100%)" }}
                    >
                      <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                      <span className="relative inline-flex items-center justify-center gap-2">
                        {form.pending ? auth("login.submitting") : auth("login.submit")}
                        {!form.pending && <ArrowRightIcon />}
                      </span>
                    </button>
                  </div>

                  <div className="pt-1">
                    <div className="relative my-1 flex items-center">
                      <div className="h-px flex-1 bg-border" />
                      <span className="px-3 text-[10px] font-medium tracking-wider text-muted-foreground uppercase">{t("or")}</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <p className="mt-3 text-center text-sm text-muted-foreground">
                      {t("signupPrompt")}{" "}
                      <Link href="/register" className="font-semibold text-primary underline-offset-4 hover:underline">
                        {t("signupCta")}
                      </Link>
                    </p>
                  </div>
                </form>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:mt-5">
                <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground">
                  <ShieldCheckIcon />
                  {t("secure")}
                </span>
                <span aria-hidden className="hidden h-3 w-px bg-border sm:block" />
                <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground">
                  <CheckCircleIcon className="text-emerald-600" />
                  {t("support")}
                </span>
              </div>

              <p className="mx-auto mt-6 max-w-full px-2 text-center text-[11px] leading-relaxed text-gray-500">
                {auth("securityNote")}
              </p>
            </div>
          </div>
        </main>
      </div>

      <aside className="relative hidden overflow-hidden lg:flex lg:w-1/2" style={{ background: DARK }}>
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.10]" style={{ backgroundImage: DOTS, backgroundSize: "26px 26px" }} />
        <div aria-hidden className="pointer-events-none absolute -top-32 -right-32 h-[480px] w-[480px] rounded-full" style={{ background: GLOW(0.55, 0.18), filter: "blur(70px)" }} />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-32 h-[420px] w-[420px] rounded-full" style={{ background: GLOW(0.45, 0.12), filter: "blur(80px)" }} />

        <div className="relative z-10 flex h-full w-full flex-col justify-between p-12 xl:p-16">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium tracking-wide text-white/80 backdrop-blur">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            {t("panel.tag")}
          </div>

          <div className="space-y-10">
            <div>
              <h2 className="text-4xl leading-[1.05] font-bold text-white xl:text-5xl">
                {t("panel.headlineA")}
                <br />
                {t("panel.headlineB")}
                <br />
                <span className="text-primary">{t("panel.headlineC")}</span>
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
                <div className="mt-4 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-primary" style={{ width: "77%" }} />
                  </div>
                  <span className="text-[10px] font-semibold text-white/60">77%</span>
                </div>
                <p className="mt-2 text-[10px] text-white/45">{t("panel.goal")} · {t("example")}</p>
              </div>
              <div className="absolute -top-3 -right-3 flex items-center gap-1.5 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white uppercase shadow-lg">
                <CheckCircleIcon size={12} />
                {t("panel.paid")}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 border-t border-white/10 pt-8">
            <div>
              <p className="text-2xl font-bold text-primary xl:text-3xl">{t("panel.statA")}</p>
              <p className="mt-1 text-xs text-white/55">{t("panel.statALabel")}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary xl:text-3xl">{t("panel.statB")}</p>
              <p className="mt-1 text-xs text-white/55">{t("panel.statBLabel")}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
