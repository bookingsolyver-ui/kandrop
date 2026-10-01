"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { saveStoreProfileAction } from "@/app/[locale]/dashboard/settings/actions";
import { PROVINCES } from "@/shared/supplier/schemas";
import { storeProfileSchema } from "@/shared/store/profile";

const CONTROL = "h-12 w-full rounded-md border border-field bg-surface px-3.5 text-[0.9375rem] text-ink outline-none focus-visible:border-action focus-visible:ring-4 focus-visible:ring-action/20 disabled:opacity-60";

/** Where the store operates (province/city and municipality), saved in the store's profile in Supabase. */
export function StoreLocationForm({ initial, canEdit }: { initial: { province: string | null; municipality: string | null }; canEdit: boolean }) {
  const t = useTranslations("Settings.location");
  const [province, setProvince] = useState(initial.province ?? "");
  const [municipality, setMunicipality] = useState(initial.municipality ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saved" | "failed">("idle");
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("idle");
    const parsed = storeProfileSchema.safeParse({ province, municipality });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) { const k = String(i.path[0]); if (!next[k]) next[k] = i.message; }
      return setErrors(next);
    }
    setErrors({});
    start(async () => {
      const result = await saveStoreProfileAction(parsed.data);
      if (result.ok) setStatus("saved");
      else if (result.error === "validation") setErrors(result.fields);
      else setStatus("failed");
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div>
        <label htmlFor="loc-province" className="mb-2 block text-sm font-medium text-ink">{t("province")}</label>
        <select id="loc-province" value={province} onChange={(e) => setProvince(e.target.value)} disabled={!canEdit} aria-invalid={!!errors.province} className={CONTROL}>
          <option value="" disabled>{t("choose")}</option>
          {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {errors.province && <p role="alert" className="mt-2 text-[13px] text-down">{t(`validation.${errors.province}` as Parameters<typeof t>[0])}</p>}
      </div>
      <div>
        <label htmlFor="loc-municipality" className="mb-2 block text-sm font-medium text-ink">{t("municipality")}</label>
        <input id="loc-municipality" value={municipality} onChange={(e) => setMunicipality(e.target.value)} disabled={!canEdit} maxLength={80} autoComplete="address-level2" aria-invalid={!!errors.municipality} className={CONTROL} />
        {errors.municipality && <p role="alert" className="mt-2 text-[13px] text-down">{t(`validation.${errors.municipality}` as Parameters<typeof t>[0])}</p>}
      </div>
      {canEdit ? (
        <div className="flex items-center gap-4">
          <button type="submit" disabled={pending} className="h-12 rounded-md bg-action px-7 text-[0.9375rem] font-semibold text-on-action hover:opacity-90 disabled:opacity-60">{pending ? t("saving") : t("save")}</button>
          <p role="status" className={`text-sm ${status === "failed" ? "text-down" : "text-up"} empty:hidden`}>{status === "saved" ? t("saved") : status === "failed" ? t("failed") : ""}</p>
        </div>
      ) : <p className="text-sm text-ink-muted">{t("ownerOnly")}</p>}
    </form>
  );
}
