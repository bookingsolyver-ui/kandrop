"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { ChevronLeftIcon } from "@/components/kai/icons";
import { Link } from "@/i18n/navigation";
import { useFavorites } from "@/lib/vitrine/store";
import type { VitrineProduct } from "@/shared/vitrine/mock";
import { ProductCard } from "./ProductCard";
import { ProductDetails } from "./ProductDetails";
import { useImport } from "./useImport";

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

/** An approved supplier's page in the Vitrine: identity and a grid with only its approved products. */
export function SupplierProfileView({ supplier, products, importedIds }: { supplier: { id: string; name: string; location: string; since: number }; products: VitrineProduct[]; importedIds: string[] }) {
  const t = useTranslations("Vitrine.supplier");
  const f = useFormatters();
  const favorites = useFavorites();
  const { imported, start, busy } = useImport(importedIds);
  const [details, setDetails] = useState<VitrineProduct | null>(null);

  return (
    <div>
      <Link href="/dashboard/vitrine/nacional" className="mb-4 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--ink-600)] hover:text-[var(--ink-900)]">
        <ChevronLeftIcon size={16} />
        {t("back")}
      </Link>

      <header className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-0)]">
        <div aria-hidden className="h-28 sm:h-36" style={{ backgroundImage: "linear-gradient(120deg, #ff7e2e, #ff5a00)" }} />
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:px-7">
          <span aria-hidden className="-mt-10 grid size-20 shrink-0 place-items-center rounded-2xl border-4 border-white bg-[var(--ink-900)] text-2xl font-extrabold text-white shadow-[var(--sh-md)] sm:-mt-12 sm:size-24">
            {initials(supplier.name)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-900)] sm:text-[28px]">{supplier.name}</h1>
            {supplier.location && <p className="mt-1 text-[13px] text-[var(--ink-500)]">{supplier.location}</p>}
          </div>
          <dl className="flex shrink-0 gap-6 text-sm">
            <div>
              <dt className="text-[11px] text-[var(--ink-500)]">{t("since")}</dt>
              <dd className="mono-num font-extrabold">{supplier.since}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-[var(--ink-500)]">{t("products")}</dt>
              <dd className="mono-num font-extrabold">{products.length}</dd>
            </div>
          </dl>
        </div>
      </header>

      <p className="my-5 text-[13px] text-[var(--ink-600)]">{t("onlyFrom", { name: supplier.name })}</p>

      {products.length === 0 ? (
        <p className="rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white px-6 py-16 text-center text-[var(--ink-600)]">{t("empty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} priceLabel={f.money(p.costPrice)} favorite={favorites.has(p.id)} selected={imported.has(p.id)} busy={busy === p.id} imageUrl={p.imageUrl}
              onToggleFavorite={() => favorites.toggle(p.id)} onStart={() => start(p)} onDetails={() => setDetails(p)} />
          ))}
        </div>
      )}
      <ProductDetails product={details} imported={details ? imported.has(details.id) : false} busy={details ? busy === details.id : false} onClose={() => setDetails(null)} onStart={() => details && start(details)} />
    </div>
  );
}
