"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Badge, PageHeader, StatCard, card } from "@/components/admin/ui";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { BoxIcon, ClockIcon, TrendingUpIcon, WalletIcon } from "@/components/kai/icons";
import { Link } from "@/i18n/navigation";
import { useCurrentSupplier } from "@/lib/supplier/store";
import { salesOfSupplier } from "@/shared/supplier/mock";
import { CRITICAL_STOCK } from "@/shared/admin/mock";

const MONTH = 30 * 86_400_000;
const NOW = Date.UTC(2026, 9, 1, 12, 0, 0);

/** The supplier's home: four headline numbers, the best sellers and the stock that needs attention. */
/** What the dashboard needs of the real catalogue (from the server). */
export interface DashboardProduct {
  id: string;
  name: string;
  stock: number;
  status: "in_review" | "approved" | "rejected";
}

export function SupplierDashboard({ products: catalogue }: { products: DashboardProduct[] }) {
  const t = useTranslations("Supplier.dashboard");
  const f = useFormatters();
  const { supplier, seeded } = useCurrentSupplier();

  const data = useMemo(() => {
    if (!supplier) return null;
    // Products come from the database; sales stay sample data (only the seeded demo suppliers have any).
    const inVitrine = catalogue.filter((p) => p.status === "approved").length;
    const pending = catalogue.filter((p) => p.status === "in_review").length;
    const sales = seeded ? salesOfSupplier(supplier.id).filter((s) => NOW - s.at <= MONTH) : [];
    const sold = sales.reduce((n, s) => n + s.quantity, 0);
    const gross = sales.reduce((n, s) => n + s.amount, 0);
    const critical = catalogue.filter((p) => p.status === "approved" && p.stock < CRITICAL_STOCK);
    const bySold = new Map<string, { title: string; qty: number; amount: number }>();
    for (const s of sales) {
      const row = bySold.get(s.productId) ?? { title: s.product, qty: 0, amount: 0 };
      row.qty += s.quantity;
      row.amount += s.amount;
      bySold.set(s.productId, row);
    }
    return { inVitrine, sold, gross, critical, top: [...bySold.values()].sort((a, b) => b.qty - a.qty).slice(0, 5), pending };
  }, [supplier, seeded, catalogue]);

  if (!supplier || !data) return null;

  return (
    <div>
      <PageHeader title={t("title", { name: supplier.name })} subtitle={t("subtitle")} />

      {supplier.status !== "active" && (
        <div role="status" className="mb-6 rounded-[var(--r-lg)] border border-[var(--kai-warn)] bg-[var(--kai-warn-bg)] p-4 text-sm text-[var(--ink-800,var(--ink-700))]">
          <p className="font-bold text-[var(--kai-warn)]">{t("review.title")}</p>
          <p className="mt-1">{t("review.body")}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard label={t("cards.products")} value={String(data.inVitrine)} note={t("cards.productsNote", { count: data.pending })} icon={<BoxIcon size={18} />} />
        <StatCard label={t("cards.sold")} value={String(data.sold)} note={t("cards.soldNote")} icon={<TrendingUpIcon size={18} />} />
        <StatCard label={t("cards.gross")} value={f.money(data.gross)} note={t("cards.grossNote")} icon={<WalletIcon size={18} />} />
        <StatCard label={t("cards.critical")} value={String(data.critical.length)} note={t("cards.criticalNote", { limit: CRITICAL_STOCK })} icon={<ClockIcon size={18} />} tone={data.critical.length > 0 ? "danger" : "default"} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className={`${card} overflow-hidden`}>
          <h2 className="border-b border-[var(--ink-200)] px-5 py-4 text-[17px] font-bold tracking-tight">{t("top.title")}</h2>
          {data.top.length === 0 ? <p className="px-5 py-10 text-center text-sm text-[var(--ink-600)]">{t("top.empty")}</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] border-collapse text-sm">
                <tbody>
                  {data.top.map((r) => (
                    <tr key={r.title} className="border-b border-gray-100 last:border-b-0">
                      <td className="px-5 py-3"><span className="line-clamp-1 max-w-xs font-semibold">{r.title}</span></td>
                      <td className="mono-num px-2 py-3 text-right text-[var(--ink-600)]">{t("top.units", { count: r.qty })}</td>
                      <td className="mono-num px-5 py-3 text-right font-bold">{f.money(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={`${card} overflow-hidden`}>
          <h2 className="border-b border-[var(--ink-200)] px-5 py-4 text-[17px] font-bold tracking-tight">{t("stock.title")}</h2>
          {data.critical.length === 0 ? <p className="px-5 py-10 text-center text-sm text-[var(--ink-600)]">{t("stock.empty")}</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] border-collapse text-sm">
                <tbody>
                  {data.critical.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 last:border-b-0">
                      <td className="px-5 py-3"><span className="line-clamp-1 max-w-xs font-semibold">{p.name}</span></td>
                      <td className="mono-num px-2 py-3 text-right font-extrabold">{p.stock}</td>
                      <td className="px-5 py-3 text-right">{p.stock === 0 ? <Badge tone="danger" className="animate-pulse font-bold uppercase">{t("stock.out")}</Badge> : <Badge tone="warn">{t("stock.lowShort")}</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <p className="mt-6 text-center text-sm text-[var(--ink-600)]">
        {t("cta")} <Link href="/fornecedor/produtos" className="font-semibold text-[var(--ink-900)] underline underline-offset-4">{t("ctaLink")}</Link>
      </p>
    </div>
  );
}
