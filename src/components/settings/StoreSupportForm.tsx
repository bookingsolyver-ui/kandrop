"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { saveStoreSupportAction } from "@/app/[locale]/dashboard/settings/pushActions";
import { storeSupportSchema } from "@/shared/store/support";

const CONTROL = "h-12 w-full rounded-md border border-field bg-surface px-3.5 text-[0.9375rem] text-ink outline-none focus-visible:border-action focus-visible:ring-4 focus-visible:ring-action/20 disabled:opacity-60";

/** The store's own support WhatsApp and e-mail: what ITS customers are told to use (never the platform's). */
export function StoreSupportForm({ initial, canEdit }: { initial: { whatsapp: string | null; email: string | null }; canEdit: boolean }) {
  const t = useTranslations("Settings.support");
  const [whatsapp, setWhatsapp] = useState(initial.whatsapp ?? "");
  const [email, setEmail] = useState(initial.email ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saved" | "failed">("idle");
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("idle");
    const parsed = storeSupportSchema.safeParse({ whatsapp, email });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) { const k = String(i.path[0]); if (!next[k]) next[k] = i.message; }
      return setErrors(next);
    }
    setErrors({});
    start(async () => {
      const result = await saveStoreSupportAction({ whatsapp, email });
      if (result.ok) setStatus("saved");
      else if (result.error === "validation" && result.fields) setErrors(result.fields);
      else setStatus("failed");
    });
  }

  const err = (k: "whatsapp" | "email") => errors[k] && <p role="alert" className="mt-2 text-[13px] text-down">{t(`validation.${errors[k]}` as Parameters<typeof t>[0])}</p>;
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div>
        <label htmlFor="sup-wa" className="mb-2 block text-sm font-medium text-ink">{t("whatsapp")}</label>
        <input id="sup-wa" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} disabled={!canEdit} inputMode="tel" autoComplete="off" maxLength={14} placeholder="923 000 000" aria-invalid={!!errors.whatsapp} className={`${CONTROL} tabular-nums`} />
        {err("whatsapp")}
      </div>
      <div>
        <label htmlFor="sup-email" className="mb-2 block text-sm font-medium text-ink">{t("email")}</label>
        <input id="sup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!canEdit} autoComplete="off" maxLength={120} placeholder="loja@exemplo.com" aria-invalid={!!errors.email} className={CONTROL} />
        {err("email")}
      </div>
      <p className="text-[13px] leading-snug text-ink-muted">{t("hint")}</p>
      {canEdit ? (
        <div className="flex items-center gap-4">
          <button type="submit" disabled={pending} className="h-12 rounded-md bg-action px-7 text-[0.9375rem] font-semibold text-on-action hover:opacity-90 disabled:opacity-60">{pending ? t("saving") : t("save")}</button>
          <p role="status" className={`text-sm ${status === "failed" ? "text-down" : "text-up"} empty:hidden`}>{status === "saved" ? t("saved") : status === "failed" ? t("failed") : ""}</p>
        </div>
      ) : <p className="text-sm text-ink-muted">{t("ownerOnly")}</p>}
    </form>
  );
}
