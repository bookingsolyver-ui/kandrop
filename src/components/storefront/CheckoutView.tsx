"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Link } from "@/i18n/navigation";
import type { StorefrontProduct } from "@/server/modules/storefront/schema";
import { DELIVERY_CITIES, buyerSchema } from "@/shared/fulfilment/schemas";
import { ArrowLeftIcon, BanknoteIcon, LockIcon, ShieldIcon, TruckIcon } from "./icons";
import { useMoney } from "./useMoney";

type Field = "name" | "email" | "phone" | "province" | "city" | "street" | "reference" | "deliveryDate" | "coupon";
const EMPTY: Record<Field, string> = { name: "", email: "", phone: "", province: "", city: "", street: "", reference: "", deliveryDate: "", coupon: "" };
const REFERENCE_MAX = 160;

const INPUT = "mt-1.5 h-12 w-full rounded-xl border bg-surface px-3.5 text-[0.9375rem] text-ink outline-none transition-all placeholder:text-ink-muted/70 focus-visible:border-action focus-visible:ring-4 focus-visible:ring-action/20";
const LABEL = "block text-[13px] font-semibold text-ink-2";

/** `923111222` → `923 111 222`: grouped while typing, digits only, at most 9. */
const formatPhone = (raw: string) => raw.replace(/\D/g, "").replace(/^244(?=\d{9})/, "").slice(0, 9).replace(/(\d{3})(?=\d)/g, "$1 ");

/**
 * The direct checkout: three short blocks in one form (your details, where it goes, how it is paid) and the order
 * summary beside it (under it on a phone). The browser validates as you type; the server validates again. The form is
 * a plain POST (it also works without JavaScript) that places the order and sends the shopper to its page.
 */
export function CheckoutView({ product: p, invalid, days, today }: { product: StorefrontProduct; invalid: boolean; /** The 4 offered delivery days (`YYYY-MM-DD`, never a Sunday). */ days: string[]; today: string }) {
  const t = useTranslations("QuickCheckout");
  const trust = useTranslations("QuickCheckout.trust");
  const locale = useLocale();
  const money = useMoney();
  const [values, setValues] = useState(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState(false);

  const errors = useMemo(() => {
    const parsed = buyerSchema.safeParse(values);
    const out: Partial<Record<Field, string>> = {};
    if (!parsed.success) for (const i of parsed.error.issues) { const k = i.path[0] as Field; if (!out[k]) out[k] = i.message; }
    return out;
  }, [values]);
  const ok = Object.keys(errors).length === 0;
  const set = (k: Field) => (e: { target: { value: string } }) => setValues((v) => ({ ...v, [k]: k === "phone" ? formatPhone(e.target.value) : e.target.value }));
  const blur = (k: Field) => () => setTouched((s) => ({ ...s, [k]: true }));
  const show = (k: Field) => (touched[k] ? errors[k] : undefined);
  const border = (k: Field) => (show(k) ? "border-down" : touched[k] && values[k] ? "border-up" : "border-field");
  const err = (k: Field) => show(k) && <p id={`${k}-error`} role="alert" className="mt-1.5 text-[13px] leading-snug text-down">{t(`validation.${show(k)}` as Parameters<typeof t>[0])}</p>;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!ok) {
      e.preventDefault();
      setTouched({ name: true, email: true, phone: true, province: true, city: true, street: true, reference: true, deliveryDate: true });
      const first = (Object.keys(errors) as Field[])[0];
      if (first) document.getElementById(`f-${first}`)?.focus();
      return;
    }
    setSubmitting(true);
  }

  // The same three icons as before: shield, truck, cash.
  const items = [
    { key: "secure", icon: <ShieldIcon /> },
    { key: "fast", icon: <TruckIcon /> },
    { key: "courier", icon: <BanknoteIcon /> },
  ] as const;
  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return setCouponError(true);
    setCouponError(false);
    setValues((v) => ({ ...v, coupon: code }));
  };
  const removeCoupon = () => { setValues((v) => ({ ...v, coupon: "" })); setCouponInput(""); };
  const price = money(p.price);
  /** `Hoje` / `Amanhã` / `Sáb`, then `3 out`: the day cards' two lines. Days are UTC calendar days, so server and browser agree. */
  const dayLabel = (iso: string) => {
    const at = Date.parse(`${iso}T00:00:00Z`);
    const diff = Math.round((at - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
    const weekday = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(at).replace(/\.$/, "");
    return { main: diff === 0 ? t("fields.today") : diff === 1 ? t("fields.tomorrow") : weekday, date: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(at).replace(/\.$/, "") };
  };
  const step = "grid size-7 shrink-0 place-items-center rounded-full bg-action text-[13px] font-extrabold text-on-action";

  return (
    <div className="min-h-screen bg-page pb-28 text-ink lg:pb-16">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href={`/loja/${p.slug}`} aria-label={t("back")} className="inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap text-ink-2 transition-colors hover:text-ink">
            <ArrowLeftIcon width={18} height={18} />
            <span className="hidden sm:inline">{t("back")}</span>
          </Link>
          <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold whitespace-nowrap"><LockIcon width={15} height={15} className="text-up" />{t("secure")}</p>
          <LocaleSwitcher />
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 pt-5 sm:px-6 lg:grid-cols-[1fr_24rem] lg:gap-10 lg:pt-10">
        {/* Phones: the order in one line, so the form is right there; the full summary follows the form. */}
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 lg:hidden">
          <div className="size-14 shrink-0 overflow-hidden rounded-xl border border-line bg-page">
            {p.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element -- the shopper-facing photo from our own API
              <img src={p.images[0].url} alt="" className="size-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-sm font-semibold">{p.title}</p>
            <p className="text-[12px] text-ink-muted">{t("summary.quantity")}</p>
          </div>
          <p className="shrink-0 text-base font-extrabold tabular-nums">{price}</p>
        </div>

        <form id="checkout-form" method="post" action={`/api/store/${p.slug}/checkout`} onSubmit={onSubmit} noValidate className="space-y-5 lg:col-start-1 lg:row-start-1">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="coupon" value={values.coupon} />
          <div>
            <h1 className="text-[1.6rem] leading-tight font-extrabold tracking-tight sm:text-3xl">{t("title")}</h1>
            <p className="mt-1 text-sm text-ink-2">{t("subtitle")}</p>
          </div>
          {invalid && <p role="alert" className="rounded-xl border border-down/40 bg-down/10 px-4 py-3 text-sm text-down">{t("invalid")}</p>}

          <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <h2 className="flex items-center gap-3 text-base font-bold"><span className={step}>1</span>{t("s1")}</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="f-name" className={LABEL}>{t("fields.name")}</label>
                <input id="f-name" name="name" value={values.name} onChange={set("name")} onBlur={blur("name")} autoComplete="name" maxLength={80} aria-invalid={!!show("name")} aria-describedby={show("name") ? "name-error" : undefined} className={`${INPUT} ${border("name")}`} />
                {err("name")}
              </div>
              <div>
                <label htmlFor="f-email" className={LABEL}>{t("fields.email")}</label>
                <input id="f-email" name="email" type="email" value={values.email} onChange={set("email")} onBlur={blur("email")} autoComplete="email" inputMode="email" maxLength={120} required aria-invalid={!!show("email")} aria-describedby={show("email") ? "email-error" : undefined} className={`${INPUT} ${border("email")}`} />
                {err("email")}
              </div>
              <div>
                <label htmlFor="f-phone" className={LABEL}>{t("fields.phone")}</label>
                <div className="relative">
                  <span aria-hidden className="pointer-events-none absolute top-1.5 left-0 flex h-12 items-center pl-3.5 text-[0.9375rem] text-ink-muted">+244</span>
                  <input id="f-phone" name="phone" value={values.phone} onChange={set("phone")} onBlur={blur("phone")} inputMode="tel" autoComplete="tel-national" placeholder="923 000 000" aria-invalid={!!show("phone")} aria-describedby={show("phone") ? "phone-error" : undefined} className={`${INPUT} pl-14 tabular-nums ${border("phone")}`} />
                </div>
                {err("phone")}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <h2 className="flex items-center gap-3 text-base font-bold"><span className={step}>2</span>{t("s2")}</h2>
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="f-province" className={LABEL}>{t("fields.province")}</label>
                  <select id="f-province" name="province" value={values.province} onChange={set("province")} onBlur={blur("province")} aria-invalid={!!show("province")} className={`${INPUT} ${border("province")}`}>
                    <option value="" disabled>{t("fields.choose")}</option>
                    {DELIVERY_CITIES.map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                  {err("province")}
                </div>
                <div>
                  <label htmlFor="f-city" className={LABEL}>{t("fields.city")}</label>
                  <input id="f-city" name="city" value={values.city} onChange={set("city")} onBlur={blur("city")} autoComplete="address-level2" maxLength={80} aria-invalid={!!show("city")} className={`${INPUT} ${border("city")}`} />
                  {err("city")}
                </div>
              </div>
              <div>
                <label htmlFor="f-street" className={LABEL}>{t("fields.street")}</label>
                <input id="f-street" name="street" value={values.street} onChange={set("street")} onBlur={blur("street")} autoComplete="street-address" maxLength={160} aria-invalid={!!show("street")} className={`${INPUT} ${border("street")}`} />
                {err("street")}
              </div>
              <div>
                <label htmlFor="f-reference" className={LABEL}>{t("fields.reference")}</label>
                <textarea id="f-reference" name="reference" value={values.reference} onChange={set("reference")} onBlur={blur("reference")} rows={3} maxLength={REFERENCE_MAX} aria-describedby="reference-hint" className={`${INPUT} h-auto py-3 ${border("reference")}`} />
                <p id="reference-hint" className="mt-1.5 flex justify-between gap-3 text-[12px] text-ink-muted"><span>{t("fields.referenceHint")}</span><span className="tabular-nums">{values.reference.length}/{REFERENCE_MAX}</span></p>
                {err("reference")}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <h2 id="s3-title" className="flex items-center gap-3 text-base font-bold"><span className={step}>3</span>{t("s3")}</h2>
            <input type="hidden" name="deliveryDate" value={values.deliveryDate} />
            <div role="radiogroup" aria-labelledby="s3-title" aria-describedby={show("deliveryDate") ? "deliveryDate-error" : undefined} className="mt-4 grid grid-cols-2 gap-3">
              {days.map((iso) => {
                const label = dayLabel(iso);
                const selected = values.deliveryDate === iso;
                return (
                  <button key={iso} id={iso === days[0] ? "f-deliveryDate" : undefined} type="button" role="radio" aria-checked={selected}
                    onClick={() => { setValues((v) => ({ ...v, deliveryDate: iso })); setTouched((s) => ({ ...s, deliveryDate: true })); }}
                    className={`flex min-h-16 flex-col items-start justify-center rounded-xl border-2 px-4 py-3 text-left transition-all focus-visible:ring-4 focus-visible:ring-action/20 focus-visible:outline-none ${selected ? "border-action bg-action/10" : "border-line bg-surface hover:border-ink-muted"}`}>
                    <span className="text-[15px] font-bold first-letter:uppercase">{label.main}</span>
                    <span className="text-[13px] text-ink-2">{label.date}</span>
                  </button>
                );
              })}
            </div>
            {err("deliveryDate")}
            <p className="mt-3 text-[12px] text-ink-muted">{t("fields.dateHint")}</p>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
            <div className="flex items-start gap-3 rounded-xl bg-page p-4">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-on-brand"><BanknoteIcon /></span>
              <div>
                <p className="text-sm font-semibold">{t("payment.method")}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{t("payment.body")}</p>
              </div>
            </div>
            <button type="submit" disabled={submitting} aria-busy={submitting} className="mt-5 hidden h-14 w-full items-center justify-center gap-2 rounded-full bg-action px-6 text-[1.0625rem] font-bold text-on-action shadow-[0_10px_30px_-10px_rgba(255,90,0,0.7)] transition-all duration-150 hover:-translate-y-px hover:shadow-[0_14px_34px_-10px_rgba(255,90,0,0.85)] active:translate-y-0 disabled:cursor-progress disabled:opacity-70 lg:flex">
              <LockIcon width={18} height={18} />
              {submitting ? t("submitting") : t("submit", { price })}
            </button>
            <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-[12px] leading-snug text-ink-muted"><LockIcon width={13} height={13} className="mt-0.5 shrink-0" />{t("lockNote")}</p>
          </section>
        </form>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1 lg:self-start">
          <section className="rounded-2xl border border-line bg-surface p-5">
            <h2 className="text-base font-bold">{t("summary.title")}</h2>
            <div className="mt-4 flex gap-4">
              <div className="size-20 shrink-0 overflow-hidden rounded-xl border border-line bg-page">
                {p.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- the shopper-facing photo from our own API
                  <img src={p.images[0].url} alt="" className="size-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm leading-snug font-semibold">{p.title}</p>
                <p className="mt-1 text-[13px] text-ink-muted">{t("summary.quantity")}</p>
                <p className="mt-1 text-sm font-bold tabular-nums">{t("summary.value", { price })}</p>
              </div>
            </div>

            <div className="mt-4 border-t border-line pt-4">
              {values.coupon ? (
                <div className="rounded-xl bg-page p-3 text-[13px] leading-snug text-ink-2">
                  <p>{t("coupon.applied", { code: values.coupon })}</p>
                  <button type="button" onClick={removeCoupon} className="mt-1.5 font-semibold text-ink underline underline-offset-4">{t("coupon.remove")}</button>
                </div>
              ) : (
                <>
                  <button type="button" aria-expanded={couponOpen} aria-controls="coupon-panel" onClick={() => setCouponOpen((o) => !o)} className="text-sm font-semibold text-action underline-offset-4 hover:underline">{t("coupon.toggle")}</button>
                  {couponOpen && (
                    <div id="coupon-panel" className="mt-3">
                      <div className="flex gap-2">
                        <input value={couponInput} onChange={(e) => { setCouponInput(e.target.value); setCouponError(false); }} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCoupon(); } }} aria-label={t("coupon.placeholder")} placeholder={t("coupon.placeholder")} maxLength={32} autoComplete="off" aria-invalid={couponError} className="h-11 min-w-0 flex-1 rounded-xl border border-field bg-surface px-3.5 text-sm text-ink uppercase outline-none placeholder:text-ink-muted/70 placeholder:normal-case focus-visible:border-action focus-visible:ring-4 focus-visible:ring-action/20" />
                        <button type="button" onClick={applyCoupon} className="h-11 shrink-0 rounded-xl bg-ink px-4 text-sm font-bold text-surface transition-opacity hover:opacity-90">{t("coupon.apply")}</button>
                      </div>
                      {couponError && <p role="alert" className="mt-1.5 text-[13px] text-down">{t("validation.coupon_invalid")}</p>}
                    </div>
                  )}
                </>
              )}
            </div>

            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-ink-2">{t("summary.subtotal")}</dt><dd className="tabular-nums">{price}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-ink-2">{t("summary.shipping")}</dt><dd className="tabular-nums">{money(0)}</dd></div>
              <div className="flex justify-between gap-4 border-t border-line pt-3 text-base font-extrabold"><dt>{t("summary.total")}</dt><dd className="tabular-nums">{price}</dd></div>
            </dl>
          </section>
          <ul className="space-y-3 rounded-2xl border border-line bg-surface p-5">
            {items.map(({ key, icon }) => (
              <li key={key} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-brand text-on-brand">{icon}</span>
                <span><span className="block text-[13px] font-semibold">{trust(`${key}.title`)}</span><span className="block text-[12px] leading-snug text-ink-2">{trust(`${key}.body`)}</span></span>
              </li>
            ))}
          </ul>
        </aside>
      </main>

      {/* Phones: the finish button is pinned and says the amount. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
        <div className="mx-auto max-w-md">
          <button type="submit" form="checkout-form" disabled={submitting} aria-busy={submitting} className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-action px-6 text-[1.0625rem] font-bold text-on-action shadow-[0_10px_30px_-10px_rgba(255,90,0,0.7)] transition-all disabled:cursor-progress disabled:opacity-70">
            <LockIcon width={18} height={18} />
            {submitting ? t("submitting") : t("submit", { price })}
          </button>
        </div>
      </div>
    </div>
  );
}
