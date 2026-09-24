"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useDashboardLive } from "@/components/dashboard/useDashboardLive";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { ListMessage, ListSkeleton, primaryButton } from "@/components/data/ListStates";
import { Pagination } from "@/components/data/Pagination";
import { TH } from "@/components/data/SortableTh";
import { useOrderFormat } from "@/components/orders/useOrderFormat";
import { Link, useRouter } from "@/i18n/navigation";
import type { PayoutPage } from "@/server/modules/payouts/schema";
import { PayoutStatusBadge } from "./PayoutStatusBadge";
import { listPayouts, type ApiResult } from "./payoutsApi";
import { RequestPayoutDialog } from "./RequestPayoutDialog";

const PAGE_SIZE = 10;
/** While a payout is pending, look again this often so its badge turns to "Completed" on its own. */
const WATCH_MS = 4000;

export function PayoutsView({ canManage }: { canManage: boolean }) {
  const t = useTranslations("Payouts");
  const errors = useTranslations("Errors");
  const f = useFormatters();
  const fmt = useOrderFormat();
  const router = useRouter();
  const { summary } = useDashboardLive();

  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [dialog, setDialog] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Each result remembers the request it answers, so "loading" is derived and the previous rows
  // stay on screen while a new page is fetched.
  const requestKey = JSON.stringify([page, reload]);
  const [loaded, setLoaded] = useState<{ key: string; result: ApiResult<PayoutPage> } | null>(null);
  const fetching = loaded?.key !== requestKey;

  useEffect(() => {
    const controller = new AbortController();
    listPayouts({ page, pageSize: PAGE_SIZE }, controller.signal)
      .then((result) => setLoaded({ key: requestKey, result }))
      .catch(() => {
        /* aborted: a newer request has replaced this one */
      });
    return () => controller.abort();
  }, [requestKey, page]);

  useEffect(() => {
    if (loaded && !loaded.result.ok && loaded.result.code === "unauthenticated") {
      router.replace("/login");
    }
  }, [loaded, router]);

  const result = loaded?.result;
  const data = result?.ok ? result.data : null;

  useEffect(() => {
    if (!data?.hasPending) return;
    const timer = setTimeout(() => setReload((n) => n + 1), WATCH_MS);
    return () => clearTimeout(timer);
  }, [data]);

  // The live feed is the same one the dashboard shows, so the two pages never disagree; the
  // API's own figure covers the moment before the first push.
  const balance = summary?.availableBalance.value.amount ?? data?.available ?? null;
  const releasing = summary?.availableBalance.releasing.amount;
  const minAmount = data?.minAmount ?? 0;

  /** Why the request button is not available — the reason is always said, never just greyed out. */
  const blocked = !data
    ? null
    : !data.bank
      ? "noBank"
      : data.hasPending
        ? "pending"
        : (balance ?? 0) < data.minAmount
          ? "low"
          : null;

  const table = (() => {
    if (!loaded || (!data && fetching)) return <ListSkeleton />;
    if (!result?.ok) {
      return (
        <ListMessage
          title={t("loadError.title")}
          body={errors(result?.code ?? "internal")}
          action={
            <button type="button" onClick={() => setReload((n) => n + 1)} className={primaryButton}>
              {t("loadError.retry")}
            </button>
          }
        />
      );
    }
    if (result.data.total === 0) {
      return <ListMessage title={t("empty.title")} body={t("empty.body")} />;
    }
    return (
      <table className="w-full text-sm">
        <caption className="sr-only">{t("history.caption")}</caption>
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className={`${TH} py-3`}>
              {t("history.date")}
            </th>
            <th scope="col" className={`${TH} hidden py-3 pl-4 md:table-cell`}>
              {t("history.reference")}
            </th>
            <th scope="col" className={`${TH} hidden py-3 pl-4 lg:table-cell`}>
              {t("history.account")}
            </th>
            <th scope="col" className={`${TH} py-3 pl-4 text-right`}>
              {t("history.amount")}
            </th>
            <th scope="col" className={`${TH} py-3 pl-4`}>
              {t("history.status")}
            </th>
          </tr>
        </thead>
        <tbody>
          {result.data.items.map((p) => (
            <tr key={p.id} className="border-b border-line last:border-0">
              <td className="py-3.5 whitespace-nowrap tabular-nums">{fmt.short(p.createdAt)}</td>
              <td className="hidden py-3.5 pl-4 whitespace-nowrap text-ink-2 tabular-nums md:table-cell">
                {p.reference}
              </td>
              <td className="hidden py-3.5 pl-4 whitespace-nowrap text-ink-2 tabular-nums lg:table-cell">
                {p.bank.ibanMasked}
              </td>
              <td className="py-3.5 pl-4 text-right font-medium whitespace-nowrap tabular-nums">
                {f.money(p.amount)}
              </td>
              <td className="py-3.5 pl-4">
                <PayoutStatusBadge status={p.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  })();

  return (
    <div className="flex flex-col gap-8">
      {/* The balance, large: the one number this page is about. */}
      <section
        aria-labelledby="balance-label"
        className="rounded-lg bg-brand p-6 text-on-brand sm:p-10"
      >
        <p
          id="balance-label"
          className="text-[11px] font-medium tracking-[0.16em] text-on-brand-muted uppercase"
        >
          {t("balance.label")}
        </p>
        <p className="mt-3 font-serif text-[3rem] leading-none font-normal tracking-[-0.02em] tabular-nums sm:text-[4.5rem]">
          {balance === null ? "—" : f.money(balance)}
        </p>
        {releasing !== undefined && releasing > 0 && (
          <p className="mt-3 text-sm text-on-brand-muted tabular-nums">
            {t("balance.releasing", { amount: f.money(releasing) })}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-sm">
            {data?.bank ? (
              <p className="text-on-brand-muted">
                {t("request.destination")}{" "}
                <span className="font-medium whitespace-nowrap text-on-brand tabular-nums">
                  {data.bank.ibanMasked}
                </span>
              </p>
            ) : null}
            {blocked && (
              <p className="mt-1 text-on-brand-muted">
                {t(`request.blocked.${blocked}`, { amount: f.money(minAmount) })}
              </p>
            )}
          </div>

          {blocked === "noBank" ? (
            canManage ? (
              <Link
                href={{ pathname: "/dashboard/settings", query: { tab: "bank" } }}
                className="inline-flex h-14 shrink-0 items-center justify-center rounded-md bg-action px-8 text-base font-semibold text-on-action hover:opacity-90"
              >
                {t("request.addBank")}
              </Link>
            ) : null
          ) : (
            <button
              type="button"
              disabled={!canManage || !data || blocked !== null}
              onClick={() => {
                setNotice(null);
                setDialog(true);
              }}
              className="inline-flex h-14 shrink-0 items-center justify-center gap-3 rounded-md bg-action px-8 text-base font-semibold text-on-action transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("request.cta")}
              <svg
                aria-hidden
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3.5 9h11M10 4.5 14.5 9 10 13.5" />
              </svg>
            </button>
          )}
        </div>
        {!canManage && <p className="mt-4 text-sm text-on-brand-muted">{t("request.ownerOnly")}</p>}
      </section>

      <p role="status" className="-mt-4 text-sm text-up empty:hidden">
        {notice}
      </p>

      <section
        aria-busy={fetching}
        className="rounded-lg border border-line bg-surface px-4 py-2 sm:px-6 sm:py-3"
      >
        <header className="border-b border-line py-4">
          <h2 className="font-serif text-[1.375rem] leading-tight font-medium tracking-tight">
            {t("history.title")}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{t("history.subtitle")}</p>
        </header>
        <div
          className={`transition-opacity motion-reduce:transition-none ${fetching && data ? "opacity-50" : ""}`}
        >
          {table}
        </div>
        {data && (
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            count={data.items.length}
            total={data.total}
            onPage={setPage}
          />
        )}
      </section>

      {data?.bank && (
        <RequestPayoutDialog
          open={dialog}
          available={balance ?? data.available}
          minAmount={data.minAmount}
          bank={data.bank}
          onClose={() => setDialog(false)}
          onCreated={(payout) => {
            setDialog(false);
            setPage(1);
            setReload((n) => n + 1);
            setNotice(t("request.created", { reference: payout.reference }));
          }}
        />
      )}
    </div>
  );
}
