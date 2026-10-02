"use client";

import { useLocale, useTranslations } from "next-intl";
import { Fragment, useMemo, useState } from "react";
import { Badge, Modal, PageHeader, Pager, StatCard, card, dateTime, fold, usePager } from "@/components/admin/ui";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { BoxIcon, ClockIcon, TrendingUpIcon, WalletIcon } from "@/components/kai/icons";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { useRouter } from "@/i18n/navigation";
import { LOGISTICS_JOURNEY, nextLogisticsStatus, type LogisticsStatus } from "@/shared/fulfilment/schemas";
import { ORDER_PAYMENT_STATUSES, type OrderPaymentProvider, type OrderPaymentStatus } from "@/shared/payments/orderPayment";

export interface LogisticsRow {
  orderId: string;
  orderNumber: number;
  orderStatus: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  storeName: string;
  createdAt: number;
  total: number;
  paymentStatus: OrderPaymentStatus;
  paymentProvider: OrderPaymentProvider;
  paymentReference: string;
  evidence: { reference?: string; note?: string; proofAt?: number; verifiedAt?: number; verifiedBy?: string };
  customer: { name: string; phone: string; email?: string } | null;
  address: { street: string; city: string; province: string; reference?: string; deliveryDate?: string } | null;
  cashOnDelivery: boolean;
  coupon: string | null;
  productTitle: string;
  line: null | {
    id: string;
    supplierName: string;
    quantity: number;
    saleTotal: number;
    costTotal: number;
    commission: number;
    merchantNet: number;
    status: LogisticsStatus;
    invoices: Array<{ party: "merchant" | "supplier"; number: string }>;
  };
}

const PAY_TONE: Record<OrderPaymentStatus, "warn" | "brand" | "success"> = { pending_payment: "warn", proof_submitted: "brand", paid_verified: "success" };
const LOG_TONE: Record<LogisticsStatus, "warn" | "brand" | "success" | "neutral"> = { pending: "warn", preparing: "brand", picked_up: "brand", in_transit: "brand", delivered: "success", cancelled: "neutral" };

function Body({ rows }: { rows: LogisticsRow[] }) {
  const t = useTranslations("Admin.logistics");
  const f = useFormatters();
  const locale = useLocale();
  const toast = useToast();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | OrderPaymentStatus>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<LogisticsRow | null>(null);
  const [evidence, setEvidence] = useState<Record<string, { reference: string; note: string }>>({});

  const shown = useMemo(() => {
    const q = fold(query.trim());
    return rows.filter((r) => (filter === "all" || r.paymentStatus === filter) && (!q || fold(`${r.orderNumber} ${r.paymentReference} ${r.storeName} ${r.line?.supplierName ?? ""} ${r.productTitle} ${r.customer?.name ?? ""}`).includes(q)));
  }, [rows, filter, query]);
  const pager = usePager(shown, 10);
  const count = (s: OrderPaymentStatus) => rows.filter((r) => r.paymentStatus === s).length;
  const lines = rows.filter((r) => r.line);
  const sum = (pick: (l: NonNullable<LogisticsRow["line"]>) => number) => lines.reduce((n, r) => n + pick(r.line!), 0);

  const call = async (key: string, url: string, payload: unknown, okMessage: string) => {
    setBusy(key);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) {
        toast({ message: okMessage });
        router.refresh();
      } else {
        const code = ((await res.json().catch(() => ({}))) as { error?: { code?: string } }).error?.code;
        toast({ message: code === "payment_unverified" ? t("toast.unverified") : t("toast.failed") });
      }
    } finally {
      setBusy(null);
    }
  };

  const pay = (r: LogisticsRow, action: "proof" | "confirm") => {
    const e = evidence[r.orderId] ?? { reference: "", note: "" };
    return call(`${r.orderId}:${action}`, `/api/admin/orders/${r.orderId}/payment`, { action, reference: e.reference || undefined, note: e.note || undefined }, t(action === "proof" ? "toast.proof" : "toast.verified"));
  };
  const advance = (r: LogisticsRow) => {
    const to = r.line && nextLogisticsStatus(r.line.status);
    if (!r.line || !to) return;
    return call(r.line.id, `/api/admin/logistics/${r.line.id}/status`, { status: to }, t("toast.updated", { status: t(`status.${to}`) }));
  };

  /** Only an administrator reaches this (the page and the API both check): the order is cancelled and its stock goes back. */
  const cancel = async (r: LogisticsRow) => {
    setBusy(`${r.orderId}:cancel`);
    try {
      const res = await fetch(`/api/admin/orders/${r.orderId}/cancel`, { method: "POST" });
      if (res.ok) {
        const data = ((await res.json().catch(() => ({}))) as { data?: { restored?: number; refundDue?: boolean } }).data;
        toast({ message: data?.refundDue ? t("toast.cancelledRefund") : t("toast.cancelled", { count: data?.restored ?? 0 }) });
        setCancelling(null);
        router.refresh();
      } else {
        const code = ((await res.json().catch(() => ({}))) as { error?: { code?: string } }).error?.code;
        toast({ message: code === "invalid_transition" ? t("toast.cannotCancel") : t("toast.failed") });
      }
    } finally {
      setBusy(null);
    }
  };

  const th = "px-4 py-3";
  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard label={t("cards.toVerify")} value={String(count("proof_submitted"))} note={t("cards.toVerifyNote")} icon={<WalletIcon size={18} />} tone={count("proof_submitted") > 0 ? "warn" : "default"} />
        <StatCard label={t("cards.awaiting")} value={String(count("pending_payment"))} note={t("cards.awaitingNote")} icon={<ClockIcon size={18} />} />
        <StatCard label={t("cards.toPrepare")} value={String(lines.filter((r) => r.line!.status === "pending" || r.line!.status === "preparing").length)} note={t("cards.toPrepareNote")} icon={<BoxIcon size={18} />} />
        <StatCard label={t("cards.commission")} value={f.money(sum((l) => l.commission))} note={t("cards.commissionNote")} icon={<TrendingUpIcon size={18} />} />
      </div>

      <section className={`${card} mt-6 overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-[var(--ink-200)] p-4 lg:flex-row lg:items-center lg:justify-between">
          <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); pager.setPage(1); }} placeholder={t("search")} aria-label={t("search")} className="h-11 w-full rounded-xl border border-[var(--ink-200)] bg-white px-3.5 text-sm outline-none focus-visible:border-primary/50 focus-visible:ring-4 focus-visible:ring-primary/15 lg:w-96" />
          <div role="group" className="flex flex-wrap gap-1.5">
            {(["all", ...ORDER_PAYMENT_STATUSES] as const).map((k) => (
              <button key={k} type="button" aria-pressed={filter === k} onClick={() => { setFilter(k); pager.setPage(1); }}
                className={`rounded-full px-3.5 py-2 text-[13px] font-semibold ${filter === k ? "bg-[var(--ink-900)] text-white" : "text-[var(--ink-600)] hover:bg-[var(--ink-100)]"}`}>
                {k === "all" ? t("filters.all") : t(`payment.${k}`)}
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 ? <p className="px-6 py-16 text-center text-sm text-[var(--ink-600)]">{t("empty")}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[68rem] border-collapse text-sm">
              <thead className="border-b border-[var(--ink-200)] bg-[var(--ink-50)]">
                <tr className="text-left text-[11px] font-bold tracking-[0.06em] text-[var(--ink-500)] uppercase">
                  <th className={th}>{t("cols.order")}</th><th className={th}>{t("cols.product")}</th><th className={th}>{t("cols.store")}</th>
                  <th className={`${th} text-right`}>{t("cols.total")}</th><th className={th}>{t("cols.payment")}</th><th className={th}>{t("cols.logistics")}</th>
                  <th className={`${th} text-right`}>{t("cols.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {pager.slice.map((r) => {
                  const manual = r.paymentProvider === "manual_whatsapp_transfer" && !r.cashOnDelivery;
                  const next = r.line ? nextLogisticsStatus(r.line.status) : null;
                  const cancelled = r.orderStatus === "cancelled";
                  const canCancel = (r.orderStatus === "pending" || r.orderStatus === "processing") && (!r.line || r.line.status === "pending" || r.line.status === "preparing");
                  const blocked = !cancelled && !r.cashOnDelivery && next === "delivered" && r.paymentStatus !== "paid_verified";
                  const e = evidence[r.orderId] ?? { reference: "", note: "" };
                  return (
                    <Fragment key={r.orderId}>
                      <tr className="border-b border-[var(--ink-100)] align-top hover:bg-[var(--ink-50)]">
                        <td className="mono-num px-4 py-3 font-semibold">#{r.orderNumber}<span className="block text-[12px] font-normal text-[var(--ink-500)]">{r.paymentReference}</span><span className="block text-[12px] font-normal text-[var(--ink-500)]">{dateTime(r.createdAt, locale)}</span></td>
                        <td className="px-4 py-3"><span className="line-clamp-2 max-w-xs font-semibold">{r.productTitle}</span>{r.line && <span className="text-[12px] text-[var(--ink-500)]">{r.line.supplierName}</span>}</td>
                        <td className="px-4 py-3 text-[var(--ink-700)]">{r.storeName}</td>
                        <td className="mono-num px-4 py-3 text-right font-bold">{f.money(r.total)}</td>
                        <td className="px-4 py-3"><Badge tone={PAY_TONE[r.paymentStatus]}>{t(`payment.${r.paymentStatus}`)}</Badge><span className="mt-1 block max-w-[14rem] text-[11px] leading-snug text-[var(--ink-500)]">{r.cashOnDelivery ? t("payment.cod") : t(`provider.${r.paymentProvider}`)}</span></td>
                        <td className="px-4 py-3">{cancelled ? <Badge tone="neutral">{t("status.cancelled")}</Badge> : r.line ? <Badge tone={LOG_TONE[r.line.status]}>{t(`status.${r.line.status}`)}</Badge> : <span className="text-[var(--ink-400,var(--ink-500))]">—</span>}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button type="button" onClick={() => setOpen(open === r.orderId ? null : r.orderId)} className="h-9 rounded-full border border-[var(--ink-200)] bg-white px-3.5 text-[13px] font-semibold hover:border-[var(--ink-300)]">{t("details")}</button>
                            {!cancelled && manual && r.paymentStatus !== "paid_verified" && (
                              <button type="button" disabled={busy === `${r.orderId}:confirm`} onClick={() => void pay(r, "confirm")} className="h-9 rounded-full bg-[var(--kai-success)] px-4 text-[13px] font-semibold whitespace-nowrap text-white hover:opacity-90 disabled:opacity-50">{t("confirmPayment")}</button>
                            )}
                            {canCancel && (
                              <button type="button" disabled={busy === `${r.orderId}:cancel`} onClick={() => setCancelling(r)} className="h-9 rounded-full border border-[var(--kai-danger)] bg-white px-4 text-[13px] font-semibold whitespace-nowrap text-[var(--kai-danger)] hover:bg-[var(--kai-danger-bg)] disabled:opacity-50">{t("cancel.action")}</button>
                            )}
                            {!cancelled && next && (
                              <button type="button" disabled={blocked || busy === r.line!.id} title={blocked ? t("blocked") : undefined} onClick={() => void advance(r)} className="h-9 rounded-full bg-[var(--ink-900)] px-4 text-[13px] font-semibold whitespace-nowrap text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-40">{t("advance", { status: t(`status.${next}`) })}</button>
                            )}
                          </div>
                          {blocked && <p className="mt-1.5 text-right text-[11px] text-[var(--kai-warn)]">{t("blocked")}</p>}
                        </td>
                      </tr>
                      {open === r.orderId && (
                        <tr className="border-b border-[var(--ink-100)] bg-[var(--ink-50)]">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="grid gap-5 text-sm md:grid-cols-3">
                              <div>
                                <p className="text-[11px] font-bold tracking-wide text-[var(--ink-500)] uppercase">{t("detail.deliverTo")}</p>
                                {r.customer && r.address ? (
                                  <p className="mt-1 leading-relaxed">{r.customer.name}<br />{r.customer.phone}{r.customer.email && <><br />{r.customer.email}</>}<br />{r.address.street}, {r.address.city}, {r.address.province}{r.address.reference ? <><br /><span className="text-[var(--ink-500)]">{r.address.reference}</span></> : null}{r.address.deliveryDate ? <><br /><span className="font-semibold">{t("detail.deliveryDate")}: {r.address.deliveryDate}</span></> : null}</p>
                                ) : <p className="mt-1 text-[var(--ink-500)]">—</p>}
                              </div>
                              <div>
                                <p className="text-[11px] font-bold tracking-wide text-[var(--ink-500)] uppercase">{t("detail.money")}</p>
                                {r.line ? (
                                  <dl className="mt-1 space-y-0.5">
                                    <div className="flex justify-between gap-4"><dt>{t("detail.sale")}</dt><dd className="mono-num">{f.money(r.line.saleTotal)}</dd></div>
                                    <div className="flex justify-between gap-4"><dt>{t("detail.supplierDue")}</dt><dd className="mono-num">{f.money(r.line.costTotal)}</dd></div>
                                    <div className="flex justify-between gap-4"><dt>{t("detail.commission")}</dt><dd className="mono-num">{f.money(r.line.commission)}</dd></div>
                                    {r.line.saleTotal - r.line.costTotal - r.line.commission - r.line.merchantNet > 0 && <div className="flex justify-between gap-4"><dt>{t("detail.coupon")}{r.coupon ? ` (${r.coupon})` : ""}</dt><dd className="mono-num">-{f.money(r.line.saleTotal - r.line.costTotal - r.line.commission - r.line.merchantNet)}</dd></div>}
                                    <div className="flex justify-between gap-4 font-bold"><dt>{t("detail.merchantNet")}</dt><dd className="mono-num">{f.money(r.line.merchantNet)}</dd></div>
                                  </dl>
                                ) : <p className="mt-1 text-[var(--ink-500)]">{t("detail.noSupplier")}</p>}
                                {r.line && <ul className="mt-2 space-y-0.5">{r.line.invoices.map((i) => <li key={i.number} className="mono-num text-[12px]">{i.number} <span className="text-[var(--ink-500)]">· {t(`detail.party.${i.party}`)}</span></li>)}</ul>}
                              </div>
                              <div>
                                <p className="text-[11px] font-bold tracking-wide text-[var(--ink-500)] uppercase">{t("detail.paymentTitle")}</p>
                                <p className="mt-1">{r.cashOnDelivery ? t("payment.cod") : t(`provider.${r.paymentProvider}`)}</p>{r.coupon && <p className="mt-1 text-[12px] text-[var(--ink-600)]">{t("detail.coupon")}: <span className="mono-num">{r.coupon}</span></p>}
                                {(r.evidence.reference || r.evidence.note) && <p className="mt-1 text-[var(--ink-600)]">{r.evidence.reference && <>{t("detail.slipRef")}: <span className="mono-num">{r.evidence.reference}</span><br /></>}{r.evidence.note}</p>}
                                {r.evidence.proofAt && <p className="mt-1 text-[12px] text-[var(--ink-500)]">{t("detail.proofAt", { when: dateTime(r.evidence.proofAt, locale) })}</p>}
                                {r.evidence.verifiedAt && <p className="mt-1 text-[12px] text-[var(--ink-500)]">{t("detail.verifiedAt", { when: dateTime(r.evidence.verifiedAt, locale), who: r.evidence.verifiedBy ?? "—" })}</p>}
                                {manual && r.paymentStatus !== "paid_verified" && (
                                  <div className="mt-3 space-y-2">
                                    <input value={e.reference} onChange={(ev) => setEvidence((s) => ({ ...s, [r.orderId]: { ...e, reference: ev.target.value } }))} maxLength={80} placeholder={t("detail.slipRefPlaceholder")} className="h-10 w-full rounded-xl border border-[var(--ink-200)] bg-white px-3 text-sm outline-none focus-visible:ring-4 focus-visible:ring-primary/15" />
                                    <input value={e.note} onChange={(ev) => setEvidence((s) => ({ ...s, [r.orderId]: { ...e, note: ev.target.value } }))} maxLength={300} placeholder={t("detail.notePlaceholder")} className="h-10 w-full rounded-xl border border-[var(--ink-200)] bg-white px-3 text-sm outline-none focus-visible:ring-4 focus-visible:ring-primary/15" />
                                    <div className="flex flex-wrap gap-2">
                                      {r.paymentStatus === "pending_payment" && <button type="button" disabled={busy === `${r.orderId}:proof`} onClick={() => void pay(r, "proof")} className="h-9 rounded-full border border-[var(--ink-200)] bg-white px-3.5 text-[13px] font-semibold hover:border-[var(--ink-300)] disabled:opacity-50">{t("registerProof")}</button>}
                                      <button type="button" disabled={busy === `${r.orderId}:confirm`} onClick={() => void pay(r, "confirm")} className="h-9 rounded-full bg-[var(--kai-success)] px-4 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50">{t("confirmPaymentLong")}</button>
                                    </div>
                                  </div>
                                )}
                                {!manual && !r.cashOnDelivery && r.paymentStatus !== "paid_verified" && <p className="mt-2 text-[12px] text-[var(--ink-500)]">{t("detail.automatic")}</p>}
                              </div>
                            </div>
                            {r.line && (
                              <ol className="mt-4 flex flex-wrap gap-2 text-[12px]">
                                {LOGISTICS_JOURNEY.map((s) => <li key={s} className={`rounded-full px-3 py-1 ${s === r.line!.status ? "bg-[var(--ink-900)] text-white" : "bg-white text-[var(--ink-500)] ring-1 ring-[var(--ink-200)]"}`}>{t(`status.${s}`)}</li>)}
                              </ol>
                            )}
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

      <Modal open={cancelling !== null} onClose={() => setCancelling(null)} title={t("cancel.title")}>
        {cancelling && (
          <div className="space-y-4 text-sm">
            <p>{t("cancel.body", { number: cancelling.orderNumber })}</p>
            <p className="text-[var(--ink-600)]">{t(cancelling.line ? "cancel.stock" : "cancel.noStock")}</p>
            {cancelling.paymentStatus === "paid_verified" && <p className="rounded-xl bg-[var(--kai-warn-bg)] p-3 font-semibold text-[var(--kai-warn)]">{t("cancel.refund")}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCancelling(null)} className="h-10 rounded-full border border-[var(--ink-200)] bg-white px-4 text-sm font-semibold">{t("cancel.keep")}</button>
              <button type="button" disabled={busy === `${cancelling.orderId}:cancel`} onClick={() => void cancel(cancelling)} className="h-10 rounded-full bg-[var(--kai-danger)] px-4 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">{t("cancel.confirm")}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/** The platform's desk: every order, how it is paid (verified by hand from the WhatsApp slip) and where the parcel is. */
export function AdminLogisticsView({ rows }: { rows: LogisticsRow[] }) {
  return (
    <ToastProvider>
      <Body rows={rows} />
    </ToastProvider>
  );
}
