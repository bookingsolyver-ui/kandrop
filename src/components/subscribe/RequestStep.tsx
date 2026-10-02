"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { BankDetails, type BankDetailsData } from "./BankDetails";
import type { PlanKey } from "@/server/modules/plan/limits";

/** Step 2 of the gate: submit the request for the chosen plan. It is saved as pending and the page then shows the "waiting for approval" screen. */
export function RequestStep({ plan, transfer, onSubmitted }: { plan: PlanKey; transfer: BankDetailsData | null; onSubmitted: () => void }) {
  const t = useTranslations("Subscribe.request");
  const names = useTranslations("Shell.plan.names");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const submit = async () => {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch("/api/billing/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) });
      if (res.ok) onSubmitted();
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{t("intro", { plan: names(plan) })}</p>
      {transfer && <div className="mt-6"><BankDetails info={transfer} /></div>}
      <p className="mt-6 text-[13px] leading-relaxed text-ink-muted">{t("note")}</p>
      {failed && <p role="alert" className="mt-4 text-sm text-down">{t("error")}</p>}
      <button type="button" onClick={submit} disabled={busy} className="mt-6 h-14 w-full rounded-md bg-action px-6 text-[1.0625rem] font-semibold text-on-action hover:opacity-90 disabled:opacity-60">
        {busy ? t("submitting") : t("submit", { plan: names(plan) })}
      </button>
    </div>
  );
}
