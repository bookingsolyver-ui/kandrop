"use client";

import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { AuthSplit, CheckCircleIcon, TrustStrip } from "@/components/auth/AuthSplit";
import { BoxIcon, TrendingUpIcon, WalletIcon } from "@/components/kai/icons";
import { BRAND_BUTTON_CLASS } from "@/components/ui/BrandButton";
import { Link, useRouter } from "@/i18n/navigation";
import { PROVINCES, supplierRegisterSchema } from "@/shared/supplier/schemas";

type Failure = { error?: { code?: string; details?: Array<{ path: PropertyKey[]; message: string }> } };

/** POSTs JSON to a supplier API; the failure is the server's (never prose: a code and field codes). */
async function post(url: string, body: unknown): Promise<{ ok: true } | { ok: false; code: string; details: NonNullable<NonNullable<Failure["error"]>["details"]> }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) return { ok: true };
    const payload = (await res.json().catch(() => ({}))) as Failure;
    return { ok: false, code: payload.error?.code ?? "internal", details: payload.error?.details ?? [] };
  } catch {
    return { ok: false, code: "internal", details: [] };
  }
}

const INPUT = "flex h-12 w-full rounded-xl border bg-input px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-all placeholder:text-muted-foreground/60 focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20";
const LABEL = "text-xs font-semibold tracking-wide text-foreground/80 uppercase";

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={LABEL}>{label}</label>
      {children}
      {error && <p id={`${id}-error`} role="alert" className="text-[13px] leading-snug text-down">{error}</p>}
    </div>
  );
}

/** The marketing side of both screens: what the portal is for. */
function Aside({ title }: { title: ReactNode }) {
  const t = useTranslations("Supplier.panel");
  const items = [
    { icon: <BoxIcon size={20} />, key: "catalog" },
    { icon: <TrendingUpIcon size={20} />, key: "sales" },
    { icon: <WalletIcon size={20} />, key: "payments" },
  ] as const;
  return (
    <>
      <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium tracking-wide text-white/80 backdrop-blur">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
        {t("tag")}
      </div>
      <div className="space-y-8">
        <div>
          <h2 className="text-4xl leading-[1.05] font-bold text-white xl:text-5xl">{title}</h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/70">{t("body")}</p>
        </div>
        <ul className="space-y-4">
          {items.map((i) => (
            <li key={i.key} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">{i.icon}</span>
              <span><span className="block font-semibold text-white">{t(`items.${i.key}.title`)}</span><span className="block text-sm text-white/60">{t(`items.${i.key}.body`)}</span></span>
            </li>
          ))}
        </ul>
      </div>
      <p className="flex items-center gap-2 border-t border-white/10 pt-6 text-xs text-white/55"><CheckCircleIcon size={14} className="text-emerald-400" />{t("approval")}</p>
    </>
  );
}

const card = "relative overflow-hidden rounded-t-3xl rounded-b-2xl border border-border bg-card p-5 shadow-[0_-8px_24px_rgba(20,16,8,.06),0_24px_48px_rgba(20,16,8,.08)] sm:p-8 lg:rounded-2xl lg:shadow-[0_4px_8px_rgba(20,16,8,.05),0_24px_48px_rgba(20,16,8,.08)]";

export function SupplierLoginScreen() {
  const t = useTranslations("Supplier.auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    setPending(true);
    setError(null);
    const result = await post("/api/supplier/login", { email, password });
    if (result.ok) {
      router.replace("/fornecedor");
      router.refresh();
      return;
    }
    setPending(false);
    // Rate-limited and server errors get their own message; every credential failure is the same one.
    setError(result.code === "rate_limited" ? "rate" : result.code === "invalid_credentials" ? "invalid" : "generic");
  };

  return (
    <AuthSplit
      tag={t("panelTag")}
      mobileTitle={<>{t("mobile")} <span className="text-primary">{t("mobileB")}</span></>}
      mobileLink={<Link href="/fornecedor/registo" className="text-xs font-medium text-white/70 hover:text-white sm:hidden">{t("registerShort")} <span className="text-primary">→</span></Link>}
      topLink={<>{t("noAccount")}<Link href="/fornecedor/registo" className="ml-1 text-primary underline-offset-4 hover:underline">{t("registerLink")}</Link></>}
      aside={<Aside title={<>{t("headlineA")} <span className="text-primary">{t("headlineB")}</span></>} />}
    >
      <div className={card}>
        <div className="mb-5">
          <div className="mb-2 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">{t("badge")}</div>
          <h1 className="text-xl font-bold tracking-tight text-foreground lg:text-2xl">{t("loginTitle")}</h1>
          <p className="mt-1 text-xs text-muted-foreground lg:text-sm">{t("loginSub")}</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate className="space-y-5">
          {error && <div role="alert" className="rounded-xl border border-down px-3.5 py-3 text-[13px] text-down">{t(error === "rate" ? "rateLimited" : error === "generic" ? "genericError" : "invalid")}</div>}
          <Field id="sup-email" label={t("email")}><input id="sup-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${INPUT} border-border`} /></Field>
          <Field id="sup-password" label={t("password")}><input id="sup-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${INPUT} border-border`} /></Field>
          <button type="submit" disabled={pending || !email || !password} className={`${BRAND_BUTTON_CLASS} h-12 w-full text-sm`}>{pending ? t("loginSubmitting") : t("loginSubmit")}</button>
        </form>
      </div>
      <TrustStrip secure={t("secure")} support={t("support")} />
    </AuthSplit>
  );
}

export function SupplierRegisterScreen() {
  const t = useTranslations("Supplier.auth");
  const v = useTranslations("Supplier.validation");
  const router = useRouter();
  const empty = { companyName: "", nif: "", phone: "", email: "", province: "", municipality: "", password: "" };
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof empty, string>>>({});
  const [taken, setTaken] = useState(false);
  const [failure, setFailure] = useState<"rate" | "generic" | null>(null);
  const [pending, setPending] = useState(false);
  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setValues((s) => ({ ...s, [k]: e.target.value }));

  const submit = async () => {
    setTaken(false);
    const parsed = supplierRegisterSchema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<keyof typeof empty, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof empty;
        if (!next[key]) next[key] = v(issue.message as Parameters<typeof v>[0]);
      }
      setErrors(next);
      document.getElementById(`sup-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    setErrors({});
    setPending(true);
    setFailure(null);
    // The server validates again with the same schema: it never trusts what the browser says.
    const result = await post("/api/supplier/register", values);
    if (result.ok) {
      router.replace("/fornecedor");
      router.refresh();
      return;
    }
    setPending(false);
    if (result.code === "email_taken") return setTaken(true);
    if (result.code === "validation_failed") {
      const next: Partial<Record<keyof typeof empty, string>> = {};
      for (const d of result.details) {
        const key = d.path[0] as keyof typeof empty;
        if (key in empty && !next[key]) next[key] = v(d.message as Parameters<typeof v>[0]);
      }
      return setErrors(next);
    }
    setFailure(result.code === "rate_limited" ? "rate" : "generic");
  };

  const err = (k: keyof typeof empty) => errors[k];
  const bad = (k: keyof typeof empty) => (err(k) ? "border-down" : "border-border");

  return (
    <AuthSplit
      tag={t("panelTag")}
      mobileTitle={<>{t("mobile")} <span className="text-primary">{t("mobileB")}</span></>}
      mobileLink={<Link href="/fornecedor/login" className="text-xs font-medium text-white/70 hover:text-white sm:hidden">{t("loginShort")} <span className="text-primary">→</span></Link>}
      topLink={<>{t("hasAccount")}<Link href="/fornecedor/login" className="ml-1 text-primary underline-offset-4 hover:underline">{t("loginLink")}</Link></>}
      aside={<Aside title={<>{t("headlineA")} <span className="text-primary">{t("headlineB")}</span></>} />}
    >
      <div className={card}>
        <div className="mb-5">
          <div className="mb-2 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">{t("badge")}</div>
          <h1 className="text-xl font-bold tracking-tight text-foreground lg:text-2xl">{t("registerTitle")}</h1>
          <p className="mt-1 text-xs text-muted-foreground lg:text-sm">{t("registerSub")}</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate className="space-y-4">
          {taken && <div role="alert" className="rounded-xl border border-down px-3.5 py-3 text-[13px] text-down">{t("taken")}</div>}
          {failure && <div role="alert" className="rounded-xl border border-down px-3.5 py-3 text-[13px] text-down">{t(failure === "rate" ? "rateLimited" : "genericError")}</div>}
          <Field id="sup-companyName" label={t("company")} error={err("companyName")}><input id="sup-companyName" autoComplete="organization" value={values.companyName} onChange={set("companyName")} aria-invalid={!!err("companyName")} className={`${INPUT} ${bad("companyName")}`} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="sup-nif" label={t("nif")} error={err("nif")}><input id="sup-nif" inputMode="numeric" placeholder="5417012345" value={values.nif} onChange={set("nif")} aria-invalid={!!err("nif")} className={`${INPUT} ${bad("nif")}`} /></Field>
            <Field id="sup-phone" label={t("phone")} error={err("phone")}><input id="sup-phone" inputMode="tel" autoComplete="tel-national" placeholder="923 000 000" value={values.phone} onChange={set("phone")} aria-invalid={!!err("phone")} className={`${INPUT} ${bad("phone")}`} /></Field>
          </div>
          <Field id="sup-email" label={t("email")} error={err("email")}><input id="sup-email" type="email" autoComplete="email" value={values.email} onChange={set("email")} aria-invalid={!!err("email")} className={`${INPUT} ${bad("email")}`} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="sup-province" label={t("province")} error={err("province")}>
              <select id="sup-province" value={values.province} onChange={set("province")} aria-invalid={!!err("province")} className={`${INPUT} ${bad("province")}`}>
                <option value="">{t("choose")}</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field id="sup-municipality" label={t("municipality")} error={err("municipality")}><input id="sup-municipality" value={values.municipality} onChange={set("municipality")} aria-invalid={!!err("municipality")} className={`${INPUT} ${bad("municipality")}`} /></Field>
          </div>
          <Field id="sup-password" label={t("password")} error={err("password")}><input id="sup-password" type="password" autoComplete="new-password" value={values.password} onChange={set("password")} aria-invalid={!!err("password")} className={`${INPUT} ${bad("password")}`} /></Field>
          <button type="submit" disabled={pending} className={`${BRAND_BUTTON_CLASS} h-12 w-full text-sm`}>{pending ? t("registerSubmitting") : t("registerSubmit")}</button>
          <p className="text-center text-[12px] text-muted-foreground">{t("warehouseNote")}</p>
        </form>
      </div>
      <TrustStrip secure={t("secure")} support={t("support")} />
    </AuthSplit>
  );
}
