"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { DashboardSummary } from "@/server/modules/dashboard/schema";

type Status = "loading" | "live" | "reconnecting";

export function LiveSummary() {
  const t = useTranslations();
  const format = useFormatter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    // 1) Snapshot for immediate paint.
    const controller = new AbortController();
    fetch("/api/dashboard/summary", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((body: { data: DashboardSummary }) => setSummary(body.data))
      .catch(() => {});

    // 2) Live deltas. EventSource reconnects automatically (server sends `retry: 3000`).
    const source = new EventSource("/api/dashboard/stream");
    source.onopen = () => setStatus("live");
    source.onerror = () => setStatus("reconnecting");
    source.addEventListener("dashboard.summary", (e) => {
      setSummary(JSON.parse((e as MessageEvent<string>).data));
      setStatus("live");
    });

    return () => {
      controller.abort();
      source.close();
    };
  }, []);

  const money = (m: { amount: number; currency: string }) =>
    format.number(m.amount / 100, { style: "currency", currency: m.currency });

  const cards = summary
    ? [
        ["volumeToday", money(summary.volumeToday)],
        ["transactionsToday", format.number(summary.transactionsToday)],
        ["successRate", format.number(summary.successRate, { style: "percent", maximumFractionDigits: 1 })],
        ["pendingSettlement", money(summary.pendingSettlement)],
      ] as const
    : [];

  return (
    <section aria-live="polite">
      <p className="mb-4 text-sm text-ink-muted">
        {status === "live" && t("Common.live")}
        {status === "reconnecting" && t("Common.reconnecting")}
        {status === "loading" && t("Common.loading")}
        {summary &&
          ` · ${t("Dashboard.updatedAt", {
            time: format.dateTime(new Date(summary.updatedAt), { timeStyle: "medium" }),
          })}`}
      </p>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([key, value]) => (
          <div key={key} className="rounded-lg border border-line p-4">
            <dt className="text-sm text-ink-muted">{t(`Dashboard.metrics.${key}`)}</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
