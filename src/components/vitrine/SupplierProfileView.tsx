"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { ChevronLeftIcon } from "@/components/kai/icons";
import { useToast } from "@/components/ui/Toast";
import { Link, useRouter } from "@/i18n/navigation";
import { useSubmissions } from "@/lib/supplier/store";
import { useFavorites, useMyProducts } from "@/lib/vitrine/store";
import { productsOfSupplier, submissionToVitrine, supplierById } from "@/shared/supplier/mock";
import { importFromCatalog } from "@/shared/vitrine/imported";
import type { VitrineProduct } from "@/shared/vitrine/mock";
import { ProductCard } from "./ProductCard";

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

/** A supplier's page in the Vitrine: banner, identity and a grid with only its products. */
export function SupplierProfileView({ supplierId }: { supplierId: string }) {
  const t = useTranslations("Vitrine.supplier");
  const v = useTranslations("Vitrine");
  const f = useFormatters();
  const router = useRouter();
  const toast = useToast();
  const favorites = useFavorites();
  const mine = useMyProducts();
  const { items } = useSubmissions();
  const supplier = supplierById(supplierId);

  const products = useMemo<VitrineProduct[]>(() => {
    const approved = items.filter((s) => s.supplierId === supplierId && s.status === "approved").map(submissionToVitrine);
    return [...approved, ...productsOfSupplier(supplierId)];
  }, [items, supplierId]);

  if (!supplier) return null;

  const start = (p: VitrineProduct) => {
    const open = () => router.push("/dashboard/meus-produtos");
    if (mine.has(p.id)) return open();
    mine.add(importFromCatalog(p));
    toast({ message: v("toast.added"), action: { label: v("toast.view"), onClick: open } });
  };

  return (
    <div>
      <Link href={supplier.kind === "nacional" ? "/dashboard/vitrine/nacional" : "/dashboard/vitrine/internacional"} className="mb-4 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--ink-600)] hover:text-[var(--ink-900)]">
        <ChevronLeftIcon size={16} />
        {t("back")}
      </Link>

      <header className="overflow-hidden rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-0)]">
        <div aria-hidden className="h-32 sm:h-44" style={{ backgroundImage: `linear-gradient(120deg, ${supplier.banner[0]}, ${supplier.banner[1]})` }} />
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:px-7">
          <span aria-hidden className="-mt-10 grid size-20 shrink-0 place-items-center rounded-2xl border-4 border-white text-2xl font-extrabold text-white shadow-[var(--sh-md)] sm:-mt-12 sm:size-24" style={{ backgroundImage: `linear-gradient(135deg, ${supplier.banner[0]}, ${supplier.banner[1]})` }}>
            {initials(supplier.name)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-bold tracking-tight text-[var(--ink-900)] sm:text-[28px]">{supplier.name}</h1>
            <p className="mt-1 text-[13px] text-[var(--ink-600)]">{supplier.description}</p>
            <p className="mt-1 text-[12px] text-[var(--ink-500)]">{supplier.municipality}, {supplier.province}</p>
          </div>
          <dl className="flex shrink-0 gap-6 text-sm">
            <div>
              <dt className="text-[11px] text-[var(--ink-500)]">{t("rating")}</dt>
              <dd className="mono-num font-extrabold">★ {supplier.rating.toFixed(1)}<span className="font-medium text-[var(--ink-500)]">/5</span></dd>
            </div>
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
            <ProductCard key={p.id} product={p} priceLabel={f.money(p.costPrice)} favorite={favorites.has(p.id)} selected={mine.has(p.id)} onToggleFavorite={() => favorites.toggle(p.id)} onStart={() => start(p)} />
          ))}
        </div>
      )}
    </div>
  );
}
