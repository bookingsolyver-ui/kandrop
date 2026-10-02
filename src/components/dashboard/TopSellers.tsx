import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { formatKwz } from "@/lib/money";
import type { RankingView } from "@/server/modules/ranking/service";

/**
 * "Top Lojistas do Mês": where this store stands by sales volume this month. The best five are named; sales volumes
 * are shown ONLY for this store (a competitor's numbers are not ours to publish). Renders nothing if the ranking is unavailable.
 */
export async function TopSellers({
  ranking,
  locale,
}: {
  ranking: RankingView | null;
  locale: Locale;
}) {
  if (!ranking) return null;
  const t = await getTranslations({ locale, namespace: "Highlights.ranking" });
  const month = new Intl.DateTimeFormat(locale, {
    month: "long",
    timeZone: "Africa/Luanda",
  }).format(ranking.monthStart + 3_600_000);
  const { you } = ranking;

  return (
    <section
      aria-labelledby="ranking-title"
      className="rounded-2xl border border-[var(--ink-200)] bg-white p-4 sm:p-6"
    >
      <p className="text-[11px] font-bold tracking-[0.12em] text-[var(--kai-orange-600)] uppercase">
        {t("eyebrow", { month })}
      </p>
      <h2
        id="ranking-title"
        className="mt-1 text-[18px] font-bold tracking-tight text-[var(--ink-900)] sm:text-[22px]"
      >
        {t("title")}
      </h2>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,16rem)_1fr]">
        <div className="rounded-xl bg-[var(--ink-50)] p-4">
          {you ? (
            <>
              <p className="text-[12px] text-[var(--ink-600)]">{t("yourPosition")}</p>
              <p className="mt-1 text-[2.25rem] leading-none font-extrabold tabular-nums">
                #{you.rank}
              </p>
              <p className="mt-1 text-[12px] text-[var(--ink-600)]">
                {t("ofStores", { count: ranking.ranked })}
              </p>
              <p className="mt-3 text-[13px] font-semibold tabular-nums">
                {t("volume", { amount: formatKwz(you.sales, locale) })}
              </p>
              <p className="text-[12px] text-[var(--ink-600)]">
                {t("orders", { count: you.orders })}
              </p>
            </>
          ) : (
            <p className="text-[13px] leading-snug text-[var(--ink-600)]">{t("noSales")}</p>
          )}
        </div>
        {ranking.top.length > 0 ? (
          <ol className="space-y-2">
            {ranking.top.map((r) => (
              <li
                key={r.rank}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${r.you ? "border-[var(--ink-900)]" : "border-[var(--ink-200)]"}`}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--ink-900)] text-[13px] font-extrabold text-white tabular-nums">
                  {r.rank}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{r.name}</span>
                {r.you && (
                  <span className="rounded-full bg-brand-orange px-2 py-0.5 text-[11px] font-bold text-brand-black">
                    {t("you")}
                  </span>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="self-center text-[13px] text-[var(--ink-600)]">{t("empty")}</p>
        )}
      </div>
    </section>
  );
}
