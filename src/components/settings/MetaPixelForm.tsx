"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition, type FormEvent } from "react";
import { saveMetaPixelAction } from "@/app/[locale]/dashboard/settings/pixelAction";
import { metaPixelSchema } from "@/shared/store/metaPixel";

/** The merchant pastes their own Meta Pixel id; it fires on their product pages, checkout and order confirmation. */
export function MetaPixelForm({ initial, canEdit }: { initial: string | null; canEdit: boolean }) {
  const t = useTranslations("Settings.integrations");
  const [value, setValue] = useState(initial ?? "");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saved" | "removed" | "failed">("idle");
  const [pending, start] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("idle");
    const parsed = metaPixelSchema.safeParse({ metaPixelId: value });
    if (!parsed.success) return setError(t("validation.pixel_invalid"));
    setError(null);
    start(async () => {
      const result = await saveMetaPixelAction(parsed.data);
      if (result.ok) {
        setValue(result.metaPixelId ?? "");
        setStatus(result.metaPixelId ? "saved" : "removed");
      } else if (result.error === "validation") setError(t("validation.pixel_invalid"));
      else setStatus("failed");
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div>
        <label htmlFor="meta-pixel-id" className="mb-2 block text-sm font-medium text-ink">{t("label")}</label>
        <input id="meta-pixel-id" value={value} onChange={(e) => setValue(e.target.value.replace(/\s/g, ""))} disabled={!canEdit} inputMode="numeric" autoComplete="off" maxLength={20} placeholder="1234567890123456" aria-invalid={!!error} aria-describedby="meta-pixel-note"
          className="h-12 w-full rounded-md border border-field bg-surface px-3.5 text-[0.9375rem] text-ink tabular-nums outline-none focus-visible:border-action focus-visible:ring-4 focus-visible:ring-action/20 disabled:opacity-60" />
        <p id="meta-pixel-note" className={`mt-2 text-[13px] leading-snug ${error ? "text-down" : "text-ink-muted"}`} role={error ? "alert" : undefined}>{error ?? t("hint")}</p>
      </div>
      {canEdit ? (
        <div className="flex items-center gap-4">
          <button type="submit" disabled={pending} className="h-12 rounded-md bg-action px-7 text-[0.9375rem] font-semibold text-on-action hover:opacity-90 disabled:opacity-60">{pending ? t("saving") : t("save")}</button>
          <p role="status" className={`text-sm ${status === "failed" ? "text-down" : "text-up"} empty:hidden`}>{status === "idle" ? "" : t(status)}</p>
        </div>
      ) : <p className="text-sm text-ink-muted">{t("ownerOnly")}</p>}
    </form>
  );
}
