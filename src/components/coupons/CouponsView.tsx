"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { createCouponAction, setCouponActiveAction } from "@/app/[locale]/dashboard/coupons/actions";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { useRouter } from "@/i18n/navigation";
import { couponInputSchema, type CouponRow, type CouponType } from "@/shared/coupons/schemas";

const card = "rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-0)]";
const CONTROL = "h-11 w-full rounded-xl border border-border bg-white px-3.5 text-sm text-[var(--ink-900)] outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-60";
const TH = "px-4 py-3 text-[11px] font-bold tracking-[0.06em] text-[var(--ink-500)] uppercase";

/** The merchant's coupons: create, list and switch off. The discount is always paid out of the merchant's own margin. */
export function CouponsView({ coupons, canManage }: { coupons: CouponRow[]; canManage: boolean }) {
  const t = useTranslations("Coupons");
  const f = useFormatters();
  const format = useFormatter();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [type, setType] = useState<CouponType>("percent");
  const [value, setValue] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState(false);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFailed(false);
    const parsed = couponInputSchema.safeParse({ code, type, value: Number(value.replace(/\s/g, "").replace(",", ".")) });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) { const k = String(i.path[0]); if (!next[k]) next[k] = i.message; }
      return setErrors(next);
    }
    setErrors({});
    start(async () => {
      const result = await createCouponAction(parsed.data);
      if (result.ok) {
        setCode("");
        setValue("");
        router.refresh();
      } else if (result.error === "validation") setErrors(result.fields);
      else setFailed(true);
    });
  }

  async function toggle(c: CouponRow) {
    setBusy(c.id);
    try {
      const result = await setCouponActiveAction(c.id, !c.isActive);
      if (result.ok) router.refresh();
      else setFailed(true);
    } finally {
      setBusy(null);
    }
  }

  const err = (k: string) => (errors[k] ? <p role="alert" className="mt-1.5 text-[13px] text-[var(--kai-danger)]">{t(`validation.${errors[k]}` as Parameters<typeof t>[0])}</p> : null);

  return (
    <div>
      <div className="mb-4 sm:mb-7">
        <h1 className="text-[20px] font-bold tracking-tight text-[var(--ink-900)] sm:text-[26px]">{t("title")}</h1>
        <p className="mt-1 text-[12px] text-[var(--ink-600)] sm:text-[15px]">{t("subtitle")}</p>
      </div>

      {canManage && (
        <section className={`${card} mb-6 p-5`} aria-labelledby="new-coupon">
          <h2 id="new-coupon" className="text-[17px] font-bold tracking-tight">{t("new.title")}</h2>
          <form onSubmit={onSubmit} noValidate className="mt-4 grid gap-4 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-start">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[var(--ink-700)]">{t("new.code")}</span>
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={32} autoComplete="off" placeholder="BEMVINDO10" aria-invalid={!!errors.code} className={`${CONTROL} uppercase`} />
              {err("code")}
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[var(--ink-700)]">{t("new.type")}</span>
              <select value={type} onChange={(e) => setType(e.target.value as CouponType)} className={CONTROL}>
                <option value="percent">{t("types.percent")}</option>
                <option value="fixed">{t("types.fixed")}</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-[var(--ink-700)]">{t(type === "percent" ? "new.valuePercent" : "new.valueFixed")}</span>
              <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="numeric" autoComplete="off" maxLength={9} aria-invalid={!!errors.value} className={CONTROL} />
              {err("value")}
            </label>
            <button type="submit" disabled={pending} className="mt-0 h-11 rounded-full bg-brand-orange px-6 text-sm font-bold text-brand-black disabled:opacity-60 sm:mt-[1.6rem]">{pending ? t("new.saving") : t("new.submit")}</button>
          </form>
          <p className="mt-4 rounded-xl bg-[var(--kai-warn-bg)] p-3 text-[13px] leading-relaxed text-[var(--kai-warn)]">{t("new.note")}</p>
          {failed && <p role="alert" className="mt-3 text-sm text-[var(--kai-danger)]">{t("failed")}</p>}
        </section>
      )}

      <div className={`${card} overflow-hidden`}>
        {coupons.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-[var(--ink-600)]">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <thead className="border-b border-gray-100 bg-[var(--ink-50)]">
                <tr className="text-left">
                  <th scope="col" className={TH}>{t("cols.code")}</th>
                  <th scope="col" className={TH}>{t("cols.discount")}</th>
                  <th scope="col" className={TH}>{t("cols.created")}</th>
                  <th scope="col" className={TH}>{t("cols.status")}</th>
                  <th scope="col" className={TH} />
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 last:border-b-0 hover:bg-[var(--ink-50)]/70">
                    <td className="mono-num px-4 py-3.5 font-bold">{c.code}</td>
                    <td className="px-4 py-3.5">{c.type === "percent" ? `${c.value}%` : f.money(c.value)}</td>
                    <td className="px-4 py-3.5 text-[var(--ink-600)]">{format.dateTime(new Date(c.createdAt), { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${c.isActive ? "bg-[var(--kai-success-bg)] text-[var(--kai-success)]" : "bg-[var(--ink-100)] text-[var(--ink-600)]"}`}>{t(c.isActive ? "status.active" : "status.inactive")}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {canManage && <button type="button" disabled={busy === c.id} onClick={() => void toggle(c)} className="h-9 rounded-full border border-[var(--ink-200)] bg-white px-4 text-[13px] font-semibold hover:border-[var(--ink-300)] disabled:opacity-50">{t(c.isActive ? "deactivate" : "activate")}</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
