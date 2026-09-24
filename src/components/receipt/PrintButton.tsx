"use client";

import { useTranslations } from "next-intl";

/** Opens the browser's print dialog, whose "Save as PDF" destination produces the PDF. */
export function PrintButton() {
  const t = useTranslations("Receipt");
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex h-11 items-center justify-center rounded-md bg-action px-5 text-sm font-semibold text-on-action hover:opacity-90"
      >
        {t("print")}
      </button>
      <p className="text-[13px] text-ink-muted">{t("printHint")}</p>
    </div>
  );
}
