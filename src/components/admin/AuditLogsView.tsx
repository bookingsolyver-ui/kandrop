"use client";

import { useLocale, useTranslations } from "next-intl";
import { Badge, PageHeader, Pager, card, dateTime, usePager } from "@/components/admin/ui";
import type { AuditEntry } from "@/server/modules/audit/service";

const pretty = (v: unknown) => (v == null ? "—" : JSON.stringify(v));

/** The black box: who did what in /admin, newest first (read-only). */
export function AuditLogsView({ rows, missing }: { rows: AuditEntry[]; missing: boolean }) {
  const t = useTranslations("Admin.audit");
  const locale = useLocale();
  const pager = usePager(rows, 20);

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      {missing && (
        <div role="alert" className="mb-6 rounded-[var(--r-lg)] border border-[var(--kai-warn)] bg-[var(--kai-warn-bg)] p-4 text-sm text-[var(--kai-warn)]">
          {t("missing")}
        </div>
      )}
      <section className={`${card} overflow-hidden`}>
        {rows.length === 0 ? <p className="px-6 py-16 text-center text-sm text-[var(--ink-600)]">{t("empty")}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] border-collapse text-sm">
              <thead className="border-b border-gray-100 bg-[var(--ink-50)]">
                <tr className="text-left text-[11px] font-bold tracking-[0.06em] text-[var(--ink-500)] uppercase">
                  <th className="px-4 py-3">{t("cols.when")}</th><th className="px-4 py-3">{t("cols.who")}</th>
                  <th className="px-4 py-3">{t("cols.action")}</th><th className="px-4 py-3">{t("cols.target")}</th>
                  <th className="px-4 py-3">{t("cols.before")}</th><th className="px-4 py-3">{t("cols.after")}</th><th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody>
                {pager.slice.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 align-top last:border-b-0">
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--ink-600)]">{dateTime(r.at, locale)}</td>
                    <td className="px-4 py-3 font-semibold">{r.actorEmail ?? r.actorId}</td>
                    <td className="px-4 py-3"><Badge tone="brand">{r.action}</Badge></td>
                    <td className="mono-num px-4 py-3">{r.target}</td>
                    <td className="mono-num max-w-48 px-4 py-3 text-[12px] break-all text-[var(--ink-600)]">{pretty(r.before)}</td>
                    <td className="mono-num max-w-48 px-4 py-3 text-[12px] break-all text-[var(--ink-900)]">{pretty(r.after)}</td>
                    <td className="mono-num px-4 py-3 text-[12px] text-[var(--ink-500)]">{r.ip ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager pager={pager} />
      </section>
    </div>
  );
}
