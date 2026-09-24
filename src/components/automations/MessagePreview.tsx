"use client";

import { useTranslations } from "next-intl";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { SAMPLE_VALUES, renderSegments, type FlowKey } from "@/shared/automations/schemas";

/**
 * The message as the customer would read it, in a WhatsApp-style bubble, filled with example
 * data. Filled-in variables are picked out (colour and weight); a variable the flow does not
 * offer is underlined with a wavy line, so it is not signalled by colour alone.
 */
export function MessagePreview({
  template,
  flow,
  storeName,
}: {
  template: string;
  flow: FlowKey;
  storeName: string;
}) {
  const t = useTranslations("Automations.editor");
  const f = useFormatters();
  const values = { ...SAMPLE_VALUES, nome_loja: storeName, valor_total: f.money(71_500 * 100) };
  const segments = renderSegments(template, flow, values);

  return (
    <div className="rounded-xl border border-line bg-page p-4">
      <p className="mb-3 text-[11px] font-medium tracking-[0.14em] text-ink-muted uppercase">
        {t("preview")} · {t("previewNote")}
      </p>
      <div className="ml-auto max-w-[92%] rounded-2xl rounded-tr-sm bg-brand px-4 py-3 text-[0.9375rem] leading-relaxed text-on-brand">
        <p className="break-words whitespace-pre-wrap">
          {segments.map((s, i) =>
            s.variable ? (
              <span key={i} className="font-medium text-accent">
                {s.text}
              </span>
            ) : s.unknown ? (
              <span
                key={i}
                className="underline decoration-down decoration-wavy underline-offset-4"
              >
                {s.text}
              </span>
            ) : (
              <span key={i}>{s.text}</span>
            )
          )}
        </p>
        <p className="mt-1.5 text-right text-[11px] text-on-brand-muted tabular-nums">14:32 ✓✓</p>
      </div>
    </div>
  );
}
