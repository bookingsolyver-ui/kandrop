"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { BRAND_BUTTON_CLASS } from "@/components/ui/BrandButton";
import { useDashboardLive } from "./useDashboardLive";

/** Shown while the store has no data of its own: loads sample data (owner only, on purpose). */
export function DemoDataCard() {
  const t = useTranslations("Dashboard");
  const { summary, refresh } = useDashboardLive();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!summary || summary.demo) return null;

  async function loadDemo() {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch("/api/demo", { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      await refresh();
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-0)] p-5 shadow-[var(--sh-xs)]">
      <h2 className="font-bold text-[var(--ink-900)]">{t("demo.title")}</h2>
      <p className="mt-1 max-w-xl text-sm text-[var(--ink-600)]">{t("demo.body")}</p>
      <button
        type="button"
        onClick={loadDemo}
        disabled={loading}
        aria-busy={loading}
        className={`${BRAND_BUTTON_CLASS} mt-4 h-11 px-5 text-sm`}
      >
        {loading ? t("demo.loading") : t("demo.action")}
      </button>
      {failed && (
        <p role="alert" className="mt-3 text-sm text-[var(--kai-danger)]">
          {t("demo.error")}
        </p>
      )}
    </section>
  );
}
