"use client";

import { useLocale, useTranslations } from "next-intl";
import { Fragment, useMemo, useState } from "react";
import { Badge, PageHeader, Pager, StatCard, card, dateTime, fold, usePager } from "@/components/admin/ui";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { BoxIcon, ClockIcon, TrendingUpIcon, WalletIcon } from "@/components/kai/icons";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { useRouter } from "@/i18n/navigation";
import { LOGISTICS_STATUSES, nextLogisticsStatus, type LogisticsStatus } from "@/shared/fulfilment/schemas";

export interface LogisticsRow {
  id: string;
  orderNumber: number;
  storeName: string;
  supplierName: string;
  productTitle: string;
  quantity: number;
  saleTotal: number;
  costTotal: number;
  commission: number;
  merchantNet: number;
  status: LogisticsStatus;
  createdAt: number;
  customer: { name: string; phone: string } | null;
  address: { street: string; city: string; province: string; reference?: string } | null;
  invoices: Array<{ party: "merchant" | "supplier"; number: string }>;
}

const TONE: Record<LogisticsStatus, "warn" | "brand" | "neutral" | "success"> = { pending: "warn", preparing: "brand", picked_up: "brand", in_transit: "brand", delivered: "success" };

function Body({ rows }: { rows: LogisticsRow[] }) {
  const t = useTranslations("Admin.logistics");
  const f = useFormatters();
  const locale = useLocale();
  const toast = useToast();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | LogisticsStatus>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const shown = useMemo(() => {
    const q = fold(query.trim());
    return rows.filter((r) => (filter === "all" || r.status === filter) && (!q || fold(`${r.orderNumber} ${r.storeName} ${r.supplierName} ${r.productTitle} ${r.customer?.name ?? ""}`).includes(q)));
  }, [rows, filter, query]);
  const pager = usePager(shown, 10);
  const count = (s: LogisticsStatus) => rows.filter((r) => r.status === s).length;
  const sum = (pick: (r: LogisticsRow) => number) => rows.reduce((n, r) => n + pick(r), 0);

  const advance = async (row: LogisticsRow) => {
    const to = nextLogisticsStatus(row.status);
    if (!to) return;
    setBusy(row.id);
    try {
      const res = await fetch(`/api/admin/logistics/${row.id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: to }) });
      toast({ message: res.ok ? t("toast.updated", { status: t(`status.${to}`) }) : t("toast.failed") });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard label={t("cards.toPrepare")} value={String(count("pending") + count("preparing"))} note={t("cards.toPrepareNote")} icon={<BoxIcon size={18} />} tone={count("pending") > 0 ? "warn" : "default"} />
        <StatCard label={t("cards.moving")} value={String(count("picked_up") + count("in_transit"))} note={t("cards.movingNote")} icon={<ClockIcon size={18} />} />
        <StatCard label={t("cards.commission")} value={f.money(sum((r) => r.commission))} note={t("cards.commissionNote")} icon={<TrendingUpIcon size={18} />} />
        <StatCard label={t("cards.dueSuppliers")} value={f.money(sum((r) => r.costTotal))} note={t("cards.dueSuppliersNote")} icon={<WalletIcon size={18} />} />
      </div>

      <section className={`${card} mt-6 overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-[var(--ink-200)] p-4 lg:flex-row lg:items-center lg:justify-between">
          <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); pager.setPage(1); }} placeholder={t("search")} aria-label={t("search")} className="h-11 w-full rounded-xl border border-[var(--ink-200)] bg-white px-3.5 text-sm outline-none focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/15 lg:w-96" />
          <div role="group" className="flex flex-wrap gap-1.5">
            {(["all", ...LOGISTICS_STATUSES] as const).map((k) => (
              <button key={k} type="button" aria-pressed={filter === k} onClick={() => { setFilter(k); pager.setPage(1); }}
                className={`rounded-full px-3.5 py-2 text-[13px] font-semibold ${filter === k ? "bg-[var(--ink-900)] text-white" : "text-[var(--ink-600)] hover:bg-[var(--ink-100)]"}`}>
                {k === "all" ? t("filters.all") : t(`status.${k}`)}
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? <p className="px-6 py-16 text-center text-sm text-[var(--ink-600)]">{t("empty")}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[64rem] border-collapse text-sm">
              <thead className="border-b border-[var(--ink-200)] bg-[var(--ink-50)]">
                <tr className="text-left text-[11px] font-bold tracking-[0.06em] text-[var(--ink-500)] uppercase">
                  <th className="px-4 py-3">{t("cols.order")}</th><th className="px-4 py-3">{t("cols.product")}</th>
                  <th className="px-4 py-3">{t("cols.supplier")}</th><th className="px-4 py-3">{t("cols.store")}</th>
                  <th className="px-4 py-3 text-right">{t("cols.sale")}</th><th className="px-4 py-3 text-right">{t("cols.commission")}</th>
                  <th className="px-4 py-3">{t("cols.status")}</th><th className="px-4 py-3 text-right">{t("cols.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {pager.slice.map((r) => {
                  const next = nextLogisticsStatus(r.status);
                  return (
                    <Fragment key={r.id}>
                      <tr className="border-b border-[var(--ink-100)] align-top hover:bg-[var(--ink-50)]">
                        <td className="mono-num px-4 py-3 font-semibold">#{r.orderNumber}<span className="block text-[12px] font-normal text-[var(--ink-500)]">{dateTime(r.createdAt, locale)}</span></td>
                        <td className="px-4 py-3"><span className="line-clamp-2 max-w-xs font-semibold">{r.productTitle}</span><span className="text-[12px] text-[var(--ink-500)]">{t("qty", { count: r.quantity })}</span></td>
                        <td className="px-4 py-3 text-[var(--ink-700)]">{r.supplierName}</td>
                        <td className="px-4 py-3 text-[var(--ink-700)]">{r.storeName}</td>
                        <td className="mono-num px-4 py-3 text-right font-bold">{f.money(r.saleTotal)}</td>
                        <td className="mono-num px-4 py-3 text-right text-[var(--ink-600)]">{f.money(r.commission)}</td>
                        <td className="px-4 py-3"><Badge tone={TONE[r.status]}>{t(`status.${r.status}`)}</Badge></td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} className="h-9 rounded-full border border-[var(--ink-200)] bg-white px-3.5 text-[13px] font-semibold hover:border-[var(--ink-300)]">{t("details")}</button>
                            {next && <button type="button" disabled={busy === r.id} onClick={() => void advance(r)} className="h-9 rounded-full bg-[var(--ink-900)] px-4 text-[13px] font-semibold whitespace-nowrap text-white hover:bg-black disabled:opacity-50">{t("advance", { status: t(`status.${next}`) })}</button>}
                          </div>
                        </td>
                      </tr>
                      {open === r.id && (
                        <tr className="border-b border-[var(--ink-100)] bg-[var(--ink-50)]">
                          <td colSpan={8} className="px-4 py-4">
                            <div className="grid gap-4 text-sm md:grid-cols-3">
                              <div>
                                <p className="text-[11px] font-bold tracking-wide text-[var(--ink-500)] uppercase">{t("detail.deliverTo")}</p>
                                {r.customer && r.address ? (
                                  <p className="mt-1 leading-relaxed">{r.customer.name}<br />{r.customer.phone}<br />{r.address.street}, {r.address.city}, {r.address.province}{r.address.reference ? <><br /><span className="text-[var(--ink-500)]">{r.address.reference}</span></> : null}</p>
                                ) : <p className="mt-1 text-[var(--ink-500)]">—</p>}
                              </div>
                              <div>
                                <p className="text-[11px] font-bold tracking-wide text-[var(--ink-500)] uppercase">{t("detail.money")}</p>
                                <dl className="mt-1 space-y-0.5">
                                  <div className="flex justify-between gap-4"><dt>{t("detail.sale")}</dt><dd className="mono-num">{f.money(r.saleTotal)}</dd></div>
                                  <div className="flex justify-between gap-4"><dt>{t("detail.supplierDue")}</dt><dd className="mono-num">{f.money(r.costTotal)}</dd></div>
                                  <div className="flex justify-between gap-4"><dt>{t("detail.commission")}</dt><dd className="mono-num">{f.money(r.commission)}</dd></div>
                                  <div className="flex justify-between gap-4 font-bold"><dt>{t("detail.merchantNet")}</dt><dd className="mono-num">{f.money(r.merchantNet)}</dd></div>
                                </dl>
                              </div>
                              <div>
                                <p className="text-[11px] font-bold tracking-wide text-[var(--ink-500)] uppercase">{t("detail.invoices")}</p>
                                <ul className="mt-1 space-y-0.5">
                                  {r.invoices.map((i) => <li key={i.number} className="mono-num">{i.number} <span className="text-[var(--ink-500)]">· {t(`detail.party.${i.party}`)}</span></li>)}
                                </ul>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pager pager={pager} />
      </section>
    </div>
  );
}

/** The platform's logistics desk: every sold supplier product and where it is on its way to the shopper. */
export function AdminLogisticsView({ rows }: { rows: LogisticsRow[] }) {
  return (
    <ToastProvider>
      <Body rows={rows} />
    </ToastProvider>
  );
}
