"use client";

import { useTranslations } from "next-intl";
import type { TopProduct } from "@/server/modules/dashboard/schema";
import { Panel } from "./Panel";
import { useFormatters } from "./useFormatters";

const TH = "pb-3 text-[11px] font-medium tracking-[0.14em] uppercase text-ink-muted";

export function TopProductsTable({ products, live }: { products: TopProduct[]; live: boolean }) {
  const t = useTranslations("Dashboard.products");
  const f = useFormatters();
  const sorted = [...products].sort((a, b) => b.revenue - a.revenue);
  const max = sorted[0]?.revenue ?? 1;

  return (
    <Panel title={t("title")} subtitle={t("subtitle")}>
      {sorted.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-muted">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th scope="col" className={`${TH} font-medium`}>
                  {t("product")}
                </th>
                <th scope="col" className={`${TH} pl-4 text-right`}>
                  {t("units")}
                </th>
                <th scope="col" className={`${TH} pl-4 text-right`}>
                  {t("revenue")}
                </th>
                <th scope="col" className={`${TH} hidden pl-4 text-right sm:table-cell`}>
                  {t("margin")}
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="min-w-32 py-4 pr-2">
                    <div className="font-medium">{p.name}</div>
                    {/* One series, one colour: bar length alone encodes revenue share. */}
                    <div aria-hidden className="mt-2 h-0.5 w-full rounded-full bg-line">
                      <div
                        className="h-0.5 rounded-full bg-series-1 transition-[width] duration-700 motion-reduce:transition-none"
                        style={{ width: `${Math.max(3, (p.revenue / max) * 100)}%` }}
                      />
                    </div>
                  </td>
                  <td className="py-4 pl-4 text-right text-ink-2 tabular-nums">
                    <span key={p.unitsSold} className={live ? "settle" : undefined}>
                      {f.integer(p.unitsSold)}
                    </span>
                  </td>
                  <td className="py-4 pl-4 text-right font-medium whitespace-nowrap tabular-nums">
                    {f.money(p.revenue)}
                  </td>
                  <td className="hidden py-4 pl-4 text-right text-ink-2 tabular-nums sm:table-cell">
                    {f.percent(p.marginRate, 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
