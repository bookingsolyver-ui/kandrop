"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { SearchIcon } from "@/components/kai/icons";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { useRouter } from "@/i18n/navigation";
import type { SubscriptionRow, SubscriptionState } from "@/shared/admin/types";
import { MaintenanceNotice } from "./MaintenanceNotice";
import { PLAN_KEYS, PLAN_PRICES, type PlanKey } from "@/server/modules/plan/limits";
import { Badge, Modal, Pager, PageHeader, card, fold, usePager } from "./ui";

const TONE = { active: "success", inactive: "danger", pending: "warn" } as const;
const FILTERS: Array<"all" | SubscriptionState> = ["all", "active", "inactive", "pending"];
type Tab = "approvals" | "accounts" | "deadlines";
type Action = "activate" | "deactivate" | "renew" | "approve";

/** The exact end date of a period, on the calendar of Luanda (UTC+1). */
const endDate = (ms: number, locale: string) =>
  new Intl.DateTimeFormat(locale, { day: "2-digit", month: "long", year: "numeric", timeZone: "Africa/Luanda" }).format(new Date(ms));

/** Urgency buckets of the deadlines list, most urgent first. */
const BUCKETS = ["expired", "soon", "week", "month", "later"] as const;
type Bucket = (typeof BUCKETS)[number];
const bucketOf = (days: number): Bucket => (days <= 0 ? "expired" : days <= 3 ? "soon" : days <= 7 ? "week" : days <= 30 ? "month" : "later");
const BUCKET_TONE = { expired: "danger", soon: "danger", week: "warn", month: "brand", later: "neutral" } as const;

interface ChangeResult { plan: PlanKey; suspended: boolean; periodEnd: number; periodsPaid: number; extended: boolean; emailSent: boolean }

function Body({ rows: fetched }: { rows: SubscriptionRow[] }) {
  const t = useTranslations("Admin.subscriptions");
  const locale = useLocale();
  const f = useFormatters();
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>(() => (fetched.some((r) => r.requestedPlan !== null) ? "approvals" : "accounts"));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [busy, setBusy] = useState<string | null>(null);
  // The dialog that confirms a payment: which account, which action, and the plan it paid for.
  const [confirming, setConfirming] = useState<{ row: SubscriptionRow; action: "activate" | "renew" | "approve" } | null>(null);
  const [chosenPlan, setChosenPlan] = useState<PlanKey>("starter");
  // What the administrator just changed, applied over the fetched rows at once (the refresh below then makes it official).
  const [changed, setChanged] = useState<Record<string, Partial<SubscriptionRow>>>({});
  const rows = useMemo(() => fetched.map((r) => (changed[r.storeId] ? { ...r, ...changed[r.storeId] } : r)), [fetched, changed]);

  const filtered = useMemo(() => {
    const q = fold(query.trim());
    return rows.filter((r) => (filter === "all" || r.state === filter) && (!q || fold(`${r.store} ${r.owner} ${r.email}`).includes(q)));
  }, [rows, query, filter]);
  const pager = usePager(filtered, 10);

  const approvals = useMemo(() => rows.filter((r) => r.requestedPlan !== null).sort((a, b) => (a.requestedAt ?? 0) - (b.requestedAt ?? 0)), [rows]);
  const withDeadline = useMemo(() => rows.filter((r): r is SubscriptionRow & { periodEnd: number; daysLeft: number } => r.periodEnd !== null && r.daysLeft !== null), [rows]);
  const grouped = useMemo(
    () => BUCKETS.map((b) => ({ bucket: b, items: withDeadline.filter((r) => bucketOf(r.daysLeft) === b) })).filter((g) => g.items.length > 0),
    [withDeadline],
  );

  const act = async (row: SubscriptionRow, action: Action, plan?: PlanKey) => {
    setBusy(row.storeId);
    try {
      const res = await fetch(`/api/admin/subscriptions/${row.storeId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...(plan ? { plan } : {}) }) });
      if (!res.ok) return void toast({ message: t("failed") });
      const out = ((await res.json()) as { data: ChangeResult }).data;
      const daysLeft = Math.ceil((out.periodEnd - Date.now()) / 86_400_000);
      setChanged((prev) => ({
        ...prev,
        [row.storeId]: {
          plan: out.plan,
          requestedPlan: null,
          requestedAt: null,
          state: out.suspended || daysLeft <= 0 ? "inactive" : "active",
          reason: out.suspended ? "admin" : daysLeft <= 0 ? "expired" : null,
          periodEnd: out.periodEnd,
          daysLeft,
          periodsPaid: out.periodsPaid,
          reminded: false,
        },
      }));
      toast({
        message: out.suspended
          ? t("deactivated", { store: row.store })
          : out.extended
            ? t(out.emailSent ? "paymentConfirmedEmail" : "paymentConfirmedNoEmail", { store: row.store, date: endDate(out.periodEnd, locale) })
            : t("activated", { store: row.store }),
      });
      router.refresh();
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  };

  const askPayment = (row: SubscriptionRow, action: "activate" | "renew" | "approve") => {
    setChosenPlan(row.requestedPlan ?? row.plan ?? "starter"); // the plan the merchant asked for, to start with
    setConfirming({ row, action });
  };

  const daysText = (d: number) => (d < 0 ? t("daysAgo", { count: -d }) : d === 0 ? t("today") : t("inDays", { count: d }));

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} actions={<MaintenanceNotice />} />
      <div role="tablist" aria-label={t("title")} className="mb-4 flex gap-1.5">
        {(["approvals", "accounts", "deadlines"] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`rounded-full px-4 py-2 text-[13px] font-semibold ${tab === k ? "bg-[var(--ink-900)] text-white" : "text-[var(--ink-600)] hover:bg-[var(--ink-100)]"}`}>
            {t(`tabs.${k}`)}{k === "approvals" && approvals.length > 0 && <span className="ml-1.5 rounded-full bg-[var(--kai-orange)] px-1.5 py-0.5 text-[11px] font-bold text-white">{approvals.length}</span>}
          </button>
        ))}
      </div>

      {tab === "approvals" ? (
        approvals.length === 0 ? (
          <div className={`${card} px-6 py-16 text-center text-sm text-[var(--ink-600)]`}>{t("noApprovals")}</div>
        ) : (
          <div className={`${card} overflow-x-auto`}>
            <table className="w-full min-w-[44rem] border-collapse text-sm">
              <thead className="border-b border-gray-100 bg-[var(--ink-50)]">
                <tr className="text-left text-[11px] font-bold tracking-[0.06em] text-[var(--ink-500)] uppercase">
                  <th className="px-4 py-3">{t("cols.store")}</th>
                  <th className="px-4 py-3">{t("cols.requestedPlan")}</th>
                  <th className="px-4 py-3">{t("cols.requestedAt")}</th>
                  <th className="w-64 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {approvals.map((r) => (
                  <tr key={r.storeId} className="border-b border-gray-100 last:border-b-0 hover:bg-[var(--ink-50)]">
                    <td className="px-4 py-3">
                      <span className="block font-semibold text-[var(--ink-900)]">{r.store}</span>
                      <span className="text-[12px] text-[var(--ink-500)]">{r.email}</span>
                    </td>
                    <td className="px-4 py-3">{r.requestedPlan && <Badge tone={r.requestedPlan === "pro" ? "brand" : "neutral"}>{t(`plan.${r.requestedPlan}`)}</Badge>}</td>
                    <td className="px-4 py-3 text-[var(--ink-600)]">{r.requestedAt ? endDate(r.requestedAt, locale) : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" disabled={busy === r.storeId} onClick={() => askPayment(r, "approve")}
                        className="inline-flex h-10 items-center rounded-full bg-[var(--kai-orange)] px-5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50">{busy === r.storeId ? t("processing") : t("approve")}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : tab === "accounts" ? (
        <div className={`${card} overflow-hidden`}>
          <div className="flex flex-col gap-3 border-b border-[var(--ink-200)] p-4 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative block lg:w-96">
              <span className="sr-only">{t("search")}</span>
              <span className="absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--ink-500)]"><SearchIcon size={16} /></span>
              <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); pager.setPage(1); }} placeholder={t("search")}
                className="h-11 w-full rounded-xl border border-border bg-white pr-3 pl-10 text-sm outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20" />
            </label>
            <div role="group" className="flex flex-wrap gap-1.5">
              {FILTERS.map((s) => (
                <button key={s} type="button" aria-pressed={filter === s} onClick={() => { setFilter(s); pager.setPage(1); }}
                  className={`rounded-full px-3.5 py-2 text-[13px] font-semibold ${filter === s ? "bg-[var(--ink-900)] text-white" : "text-[var(--ink-600)] hover:bg-[var(--ink-100)]"}`}>
                  {t(`filters.${s}`)} ({s === "all" ? rows.length : rows.filter((r) => r.state === s).length})
                </button>
              ))}
            </div>
          </div>
          {filtered.length === 0 ? (
            <p className="px-6 py-16 text-center text-sm text-[var(--ink-600)]">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[56rem] border-collapse text-sm">
                <thead className="border-b border-gray-100 bg-[var(--ink-50)]">
                  <tr className="text-left text-[11px] font-bold tracking-[0.06em] text-[var(--ink-500)] uppercase">
                    <th className="px-4 py-3">{t("cols.store")}</th>
                    <th className="px-4 py-3">{t("cols.plan")}</th>
                    <th className="px-4 py-3">{t("cols.expires")}</th>
                    <th className="px-4 py-3">{t("cols.state")}</th>
                    <th className="px-4 py-3 text-right">{t("cols.periods")}</th>
                    <th className="w-64 px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {pager.slice.map((r) => (
                    <tr key={r.storeId} className="border-b border-gray-100 last:border-b-0 hover:bg-[var(--ink-50)]">
                      <td className="px-4 py-3">
                        <span className="block font-semibold text-[var(--ink-900)]">{r.store}</span>
                        <span className="text-[12px] text-[var(--ink-500)]">{r.owner} · {r.email}</span>
                      </td>
                      <td className="px-4 py-3">{r.plan ? <Badge tone={r.plan === "pro" ? "brand" : "neutral"}>{t(`plan.${r.plan}`)}</Badge> : r.requestedPlan ? <Badge tone="warn">{t("requested", { plan: t(`plan.${r.requestedPlan}`) })}</Badge> : <span className="text-[var(--ink-500)]">—</span>}</td>
                      <td className="px-4 py-3">
                        {r.periodEnd !== null && r.daysLeft !== null ? (
                          <>
                            <span className="block text-[var(--ink-900)]">{endDate(r.periodEnd, locale)}</span>
                            <span className="text-[12px] text-[var(--ink-500)]">{daysText(r.daysLeft)}</span>
                          </>
                        ) : <span className="text-[var(--ink-500)]">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={TONE[r.state]}>{t(`state.${r.state}`)}</Badge>
                        {r.reason && <span className="mt-1 block text-[12px] text-[var(--ink-500)]">{t(`reason.${r.reason}`)}</span>}
                      </td>
                      <td className="mono-num px-4 py-3 text-right text-[var(--ink-600)]">{r.periodsPaid}</td>
                      <td className="px-4 py-3 text-right">
                        {r.state === "pending" ? (
                          <button type="button" disabled={busy === r.storeId} onClick={() => askPayment(r, "approve")}
                            className="inline-flex h-9 items-center rounded-full bg-[var(--kai-orange)] px-4 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50">{t("approve")}</button>
                        ) : r.state === "active" ? (
                          <div className="flex justify-end gap-2">
                            <button type="button" disabled={busy === r.storeId} onClick={() => askPayment(r, "renew")}
                              className="inline-flex h-9 items-center rounded-full border border-[var(--ink-200)] bg-white px-4 text-[13px] font-semibold text-[var(--ink-900)] hover:border-[var(--ink-300)] disabled:opacity-50">{busy === r.storeId ? t("processing") : t("renew")}</button>
                            <button type="button" disabled={busy === r.storeId} onClick={() => act(r, "deactivate")}
                              className="inline-flex h-9 items-center rounded-full border border-[var(--ink-200)] bg-white px-4 text-[13px] font-semibold text-[var(--kai-danger)] hover:border-[var(--kai-danger)] disabled:opacity-50">{t("deactivate")}</button>
                          </div>
                        ) : (
                          <button type="button" disabled={busy === r.storeId} onClick={() => askPayment(r, "activate")}
                            className="inline-flex h-9 items-center rounded-full bg-[var(--ink-900)] px-4 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50">{busy === r.storeId ? t("processing") : t("activate")}</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pager pager={pager} />
        </div>
      ) : grouped.length === 0 ? (
        <div className={`${card} px-6 py-16 text-center text-sm text-[var(--ink-600)]`}>{t("noDeadlines")}</div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ bucket, items }) => (
            <section key={bucket} className={`${card} overflow-hidden`}>
              <header className="flex items-center justify-between gap-3 border-b border-[var(--ink-200)] px-5 py-3.5">
                <h2 className="text-[15px] font-bold text-[var(--ink-900)]">{t(`buckets.${bucket}`)}</h2>
                <Badge tone={BUCKET_TONE[bucket]}>{items.length}</Badge>
              </header>
              <ul className="divide-y divide-gray-100">
                {items.map((r) => (
                  <li key={r.storeId} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--ink-900)]">{r.store}</p>
                      <p className="truncate text-[12px] text-[var(--ink-500)]">{r.email} · {t("sinceLine", { date: r.startedAt ? endDate(r.startedAt, locale) : "—", count: r.periodsPaid })}</p>
                    </div>
                    <div className="text-right">
                      <p className="mono-num font-semibold text-[var(--ink-900)]">{endDate(r.periodEnd, locale)}</p>
                      <p className="text-[12px] text-[var(--ink-500)]">
                        {daysText(r.daysLeft)}
                        {r.renewalAmount !== null && ` · ${t("renewal", { price: f.money(r.renewalAmount) })}`}
                        {r.reminded && ` · ${t("reminded")}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <Modal open={confirming !== null} onClose={() => !busy && setConfirming(null)} title={confirming ? t(confirming.action === "renew" ? "confirm.titleRenew" : confirming.action === "approve" ? "confirm.titleApprove" : "confirm.titleActivate", { store: confirming.row.store }) : ""}>
        {confirming && (
          <div>
            <p className="text-[13px] text-[var(--ink-600)]">{t("confirm.intro")}</p>
            <label className="mt-4 block text-[13px] font-semibold">
              {t(confirming.action === "approve" ? "confirm.planApprove" : "confirm.plan")}
              <select value={chosenPlan} onChange={(e) => setChosenPlan(e.target.value as PlanKey)} disabled={busy !== null}
                className="mt-1.5 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/20">
                {PLAN_KEYS.map((p) => (
                  <option key={p} value={p}>{t(`plan.${p}`)} · {t("confirm.perMonth", { price: f.money(PLAN_PRICES[p] * 100) })}</option>
                ))}
              </select>
            </label>
            <p className="mt-3 rounded-xl bg-[var(--ink-50)] px-3.5 py-2.5 text-[13px] text-[var(--ink-700)]">{t(confirming.action === "renew" ? "confirm.noteRenew" : confirming.action === "approve" ? "confirm.noteApprove" : "confirm.noteActivate")}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" disabled={busy !== null} onClick={() => setConfirming(null)} className="inline-flex h-10 items-center rounded-full border border-[var(--ink-200)] bg-white px-4 text-[13px] font-semibold disabled:opacity-50">{t("confirm.cancel")}</button>
              <button type="button" disabled={busy !== null} onClick={() => act(confirming.row, confirming.action, chosenPlan)} className="inline-flex h-10 items-center rounded-full bg-[var(--ink-900)] px-5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50">
                {busy !== null ? t("processing") : t(confirming.action === "approve" ? "confirm.confirmApprove" : "confirm.confirm")}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/** Accounts and subscriptions: who is on which plan, until when, and the switch that lets an administrator turn an account on or off. */
export function SubscriptionsView({ rows }: { rows: SubscriptionRow[] }) {
  return (
    <ToastProvider>
      <Body rows={rows} />
    </ToastProvider>
  );
}
