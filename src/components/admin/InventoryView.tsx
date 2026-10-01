"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { BoxIcon, ClockIcon, WalletIcon } from "@/components/kai/icons";
import { useToast } from "@/components/ui/Toast";
import { CRITICAL_STOCK, INVENTORY, type InventoryItem } from "@/shared/admin/mock";
import { Badge, Modal, Pager, PageHeader, StatCard, card, fold, usePager } from "./ui";

type Tab = "all" | "out" | "critical" | "healthy";
const TABS: Tab[] = ["all", "out", "critical", "healthy"];
const levelOf = (i: InventoryItem): "out" | "critical" | "healthy" => (i.quantity === 0 ? "out" : i.quantity < CRITICAL_STOCK ? "critical" : "healthy");

/** Stock health only: what is out, what is about to be, and how much money sits on the shelves. */
export function InventoryView() {
  const t = useTranslations("Admin.inventory");
  const f = useFormatters();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [disabled, setDisabled] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState(false);

  const out = INVENTORY.filter((i) => i.quantity === 0);
  const critical = INVENTORY.filter((i) => levelOf(i) === "critical");
  const capital = INVENTORY.reduce((sum, i) => sum + i.quantity * i.costPrice, 0);

  const rows = useMemo(() => {
    const q = fold(query.trim());
    return INVENTORY.filter((i) => (tab === "all" || levelOf(i) === tab) && (!q || fold(`${i.title} ${i.sku} ${i.supplier}`).includes(q))).sort((a, b) => a.quantity - b.quantity);
  }, [tab, query]);
  const pager = usePager(rows, 10);
  const count = (k: Tab) => (k === "all" ? INVENTORY.length : INVENTORY.filter((i) => levelOf(i) === k).length);

  const disableOne = (id: string) => {
    setDisabled((s) => new Set(s).add(id));
    toast({ message: t("autoDisable.done", { count: 1 }) });
  };
  const disableAll = () => {
    setDisabled(new Set(out.map((i) => i.id)));
    setBulk(false);
    toast({ message: t("autoDisable.done", { count: out.length }) });
  };
  const pendingOut = out.filter((i) => !disabled.has(i.id)).length;

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label={t("cards.out")} value={String(out.length)} note={t("cards.outNote")} icon={<BoxIcon size={18} />} tone="danger" />
        <StatCard label={t("cards.critical", { limit: CRITICAL_STOCK })} value={String(critical.length)} note={t("cards.criticalNote")} icon={<ClockIcon size={18} />} tone="warn" />
        <StatCard label={t("cards.capital")} value={f.money(capital)} note={t("cards.capitalNote")} icon={<WalletIcon size={18} />} />
      </div>

      {out.length > 0 && (
        <section className="mt-6 flex flex-col gap-3 rounded-[var(--r-lg)] border border-[var(--kai-danger)] bg-[var(--kai-danger-bg)] p-4 sm:flex-row sm:items-center sm:justify-between" aria-label={t("autoDisable.title")}>
          <div>
            <p className="flex items-center gap-2 font-bold text-[var(--kai-danger)]">
              <span aria-hidden className="size-2.5 animate-pulse rounded-full bg-[var(--kai-danger)]" />
              {t("autoDisable.title")}
            </p>
            <p className="mt-1 text-sm text-[var(--ink-700)]">{t("autoDisable.body", { count: out.length })}</p>
          </div>
          <button type="button" onClick={() => setBulk(true)} disabled={pendingOut === 0}
            className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-[var(--kai-danger)] px-5 text-sm font-bold text-white disabled:opacity-50">
            {pendingOut === 0 ? t("autoDisable.allDone") : t("autoDisable.button")}
          </button>
        </section>
      )}

      <div className={`${card} mt-6 overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-[var(--ink-200)] p-4 lg:flex-row lg:items-center lg:justify-between">
          <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); pager.setPage(1); }} placeholder={t("search")} aria-label={t("search")}
            className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20 lg:w-96" />
          <div role="group" className="flex flex-wrap gap-1.5">
            {TABS.map((k) => (
              <button key={k} type="button" aria-pressed={tab === k} onClick={() => { setTab(k); pager.setPage(1); }}
                className={`rounded-full px-3.5 py-2 text-[13px] font-semibold ${tab === k ? "bg-[var(--ink-900)] text-white" : "text-[var(--ink-600)] hover:bg-[var(--ink-100)]"}`}>
                {t(`tabs.${k}`)} ({count(k)})
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] border-collapse text-sm">
            <thead className="border-b border-gray-100 bg-[var(--ink-50)]">
              <tr className="text-left text-[11px] font-bold tracking-[0.06em] text-[var(--ink-500)] uppercase">
                <th className="px-4 py-3">{t("cols.product")}</th>
                <th className="px-4 py-3">{t("cols.sku")}</th>
                <th className="px-4 py-3 text-right">{t("cols.quantity")}</th>
                <th className="px-4 py-3 text-right">{t("cols.weekly")}</th>
                <th className="px-4 py-3">{t("cols.status")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pager.slice.map((i) => {
                const level = levelOf(i);
                const weeks = i.weeklySales > 0 ? i.quantity / i.weeklySales : 0;
                return (
                  <tr key={i.id} className="border-b border-gray-100 last:border-b-0 hover:bg-[var(--ink-50)]">
                    <td className="px-4 py-3">
                      <p className="line-clamp-1 max-w-md font-semibold text-[var(--ink-900)]">{i.title}</p>
                      <p className="text-[12px] text-[var(--ink-500)]">{i.supplier} · {t("stores", { count: i.stores })}</p>
                    </td>
                    <td className="mono-num px-4 py-3 text-[var(--ink-600)]">{i.sku}</td>
                    <td className={`mono-num px-4 py-3 text-right font-extrabold ${level === "out" ? "text-[var(--kai-danger)]" : level === "critical" ? "text-[var(--kai-warn)]" : "text-[var(--ink-900)]"}`}>{i.quantity}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="mono-num font-semibold">{i.weeklySales}</span>
                      <span className="block text-[11px] text-[var(--ink-500)]">{level === "out" ? "—" : t("coverage", { weeks: weeks.toFixed(1) })}</span>
                    </td>
                    <td className="px-4 py-3">
                      {level === "out" ? (
                        <Badge tone="danger" className="animate-pulse font-bold uppercase"><span aria-hidden className="size-1.5 rounded-full bg-[var(--kai-danger)]" />{t("badge.out")}</Badge>
                      ) : level === "critical" ? (
                        <Badge tone="warn">{t("badge.critical")}</Badge>
                      ) : (
                        <Badge tone="success">{t("badge.ok")}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {level === "out" && (disabled.has(i.id) ? (
                        <Badge tone="neutral">{t("disabled")}</Badge>
                      ) : (
                        <button type="button" onClick={() => disableOne(i.id)} className="inline-flex h-9 items-center rounded-full border border-[var(--kai-danger)] bg-white px-3.5 text-[12px] font-bold text-[var(--kai-danger)] hover:bg-[var(--kai-danger-bg)]">{t("disableRow")}</button>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pager pager={pager} />
      </div>
      <p className="mt-4 text-center text-[12px] text-[var(--ink-500)]">{t("demoNote")}</p>

      <Modal open={bulk} onClose={() => setBulk(false)} title={t("autoDisable.confirmTitle")}>
        <p className="text-sm text-[var(--ink-600)]">{t("autoDisable.confirmBody", { count: pendingOut })}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={() => setBulk(false)} className="inline-flex h-10 items-center rounded-full border border-[var(--ink-200)] bg-white px-4 text-sm font-semibold">{t("cancel")}</button>
          <button type="button" onClick={disableAll} className="inline-flex h-10 items-center rounded-full bg-[var(--kai-danger)] px-5 text-sm font-bold text-white">{t("autoDisable.confirm")}</button>
        </div>
      </Modal>
    </div>
  );
}
