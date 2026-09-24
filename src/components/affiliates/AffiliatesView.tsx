"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ListMessage, primaryButton } from "@/components/data/ListStates";
import { Pagination } from "@/components/data/Pagination";
import { KpiCell, KpiSkeleton, KpiStrip } from "@/components/dashboard/KpiCard";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { Money } from "@/components/dashboard/Money";
import { useRouter } from "@/i18n/navigation";
import type { AffiliateOverview } from "@/server/modules/affiliates/schema";
import { COMMISSION_BPS } from "@/shared/affiliates/schemas";
import { getAffiliates, type ApiResult } from "./affiliatesApi";
import { LinkCard } from "./LinkCard";
import { ReferralsTable } from "./ReferralsTable";

const PAGE_SIZE = 10;

export function AffiliatesView() {
  const t = useTranslations("Affiliates");
  const errors = useTranslations("Errors");
  const f = useFormatters();
  const format = useFormatter();
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const key = `${page}:${reload}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    result: ApiResult<AffiliateOverview>;
  } | null>(null);
  const fetching = loaded?.key !== key;

  useEffect(() => {
    const controller = new AbortController();
    getAffiliates(page, PAGE_SIZE, controller.signal)
      .then((result) => setLoaded({ key, result }))
      .catch(() => {
        /* aborted: a newer request replaced it */
      });
    return () => controller.abort();
  }, [key, page]);

  const result = loaded?.result;
  const unauthenticated = result && !result.ok && result.code === "unauthenticated";
  useEffect(() => {
    if (unauthenticated) router.replace("/login");
  }, [unauthenticated, router]);

  if (!loaded) {
    return (
      <div aria-hidden className="space-y-6">
        <div className="h-64 animate-pulse rounded-lg border border-line bg-surface motion-reduce:animate-none" />
        <div className="grid gap-px sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <KpiSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!result?.ok) {
    return (
      <ListMessage
        title={result?.code === "forbidden" ? t("forbidden.title") : t("loadError.title")}
        body={
          result?.code === "forbidden" ? t("forbidden.body") : errors(result?.code ?? "internal")
        }
        action={
          result?.code === "forbidden" ? undefined : (
            <button type="button" onClick={() => setReload((n) => n + 1)} className={primaryButton}>
              {t("loadError.retry")}
            </button>
          )
        }
      />
    );
  }

  const { kpis, referrals } = result.data;
  const share = (part: number, whole: number) =>
    whole > 0 ? f.percent(part / whole, 0) : t("kpis.none");

  return (
    <div className="space-y-6">
      <LinkCard link={result.data.link} />

      <section aria-label={t("kpis.label")}>
        <KpiStrip>
          <KpiCell
            index={0}
            label={t("kpis.clicks")}
            value={f.integer(kpis.clicks)}
            valueKey={String(kpis.clicks)}
            live={false}
            hint={
              <p>
                {kpis.clicks > 0
                  ? t("kpis.clicksHint", { rate: share(kpis.signups, kpis.clicks) })
                  : t("kpis.none")}
              </p>
            }
          />
          <KpiCell
            index={1}
            label={t("kpis.signups")}
            value={f.integer(kpis.signups)}
            valueKey={String(kpis.signups)}
            live={false}
            hint={<p>{t("kpis.signupsHint", { count: kpis.signupsLast30Days })}</p>}
          />
          <KpiCell
            index={2}
            label={t("kpis.active")}
            value={f.integer(kpis.activePaying)}
            valueKey={String(kpis.activePaying)}
            live={false}
            hint={
              <p>
                {kpis.signups > 0
                  ? t("kpis.activeHint", { share: share(kpis.activePaying, kpis.signups) })
                  : t("kpis.none")}
              </p>
            }
          />
          <KpiCell
            index={3}
            emphasis
            label={t("kpis.commission")}
            value={<Money minor={kpis.availableCommission} />}
            valueKey={String(kpis.availableCommission)}
            live={false}
            hint={<p>{t("kpis.commissionHint", { amount: f.money(kpis.monthlyCommission) })}</p>}
          />
        </KpiStrip>
      </section>

      <section
        aria-labelledby="referrals-title"
        aria-busy={fetching}
        className="rounded-lg border border-line bg-surface px-4 py-2 sm:px-6 sm:py-3"
      >
        <header className="pt-4 pb-2">
          <h2
            id="referrals-title"
            className="font-serif text-[1.375rem] leading-tight font-medium tracking-tight"
          >
            {t("table.title")}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">{t("table.subtitle")}</p>
        </header>
        <div
          className={`transition-opacity motion-reduce:transition-none ${fetching ? "opacity-50" : ""}`}
        >
          {referrals.total === 0 ? (
            <ListMessage title={t("empty.title")} body={t("empty.body")} />
          ) : (
            <ReferralsTable items={referrals.items} />
          )}
        </div>
        <Pagination
          page={referrals.page}
          pageSize={referrals.pageSize}
          count={referrals.items.length}
          total={referrals.total}
          onPage={setPage}
        />
      </section>

      {result.data.example && (
        <p className="text-[13px] leading-relaxed text-ink-muted">
          {t("sandbox", {
            rate: format.number(COMMISSION_BPS / 10_000, { style: "percent" }),
          })}
        </p>
      )}
    </div>
  );
}
