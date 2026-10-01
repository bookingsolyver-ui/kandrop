"use client";

import { useTranslations } from "next-intl";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { HeartIcon } from "@/components/kai/icons";
import { BrandLink } from "@/components/ui/BrandButton";
import { useToast } from "@/components/ui/Toast";
import { Link, useRouter } from "@/i18n/navigation";
import { useFavorites, useMyProducts } from "@/lib/vitrine/store";
import { importFromCatalog } from "@/shared/vitrine/imported";
import { findVitrineProduct, type VitrineProduct } from "@/shared/vitrine/mock";
import { ProductCard } from "./ProductCard";

/** The Vitrine products the merchant marked with a heart, ready to import. */
export function FavoritesView() {
  const t = useTranslations("MyProducts");
  const v = useTranslations("Vitrine");
  const f = useFormatters();
  const router = useRouter();
  const toast = useToast();
  const favorites = useFavorites();
  const mine = useMyProducts();

  const products = favorites.ids
    .map((id) => findVitrineProduct(id))
    .filter((p): p is VitrineProduct => p !== undefined);

  const start = (p: VitrineProduct) => {
    const open = () => router.push("/dashboard/meus-produtos");
    if (mine.has(p.id)) return open();
    mine.add(importFromCatalog(p));
    toast({ message: v("toast.added"), action: { label: v("toast.view"), onClick: open } });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-7">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-[var(--ink-900)] sm:text-[26px]">{t("fav.title")}</h1>
          <p className="mt-1 text-[12px] text-[var(--ink-600)] sm:text-[15px]">{t("fav.subtitle")}</p>
        </div>
        <Link
          href="/dashboard/meus-produtos"
          className="inline-flex h-10 items-center rounded-full border border-[var(--ink-200)] bg-white px-4 text-sm font-semibold text-[var(--ink-900)] transition-colors hover:border-[var(--ink-300)]"
        >
          {t("fav.back")}
        </Link>
      </div>

      {!favorites.ready ? (
        <div className="h-64" aria-hidden />
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-white px-6 py-20 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-[var(--kai-orange-50)] text-[var(--kai-orange-600)]">
            <HeartIcon size={26} />
          </span>
          <h2 className="text-lg font-bold text-[var(--ink-900)]">{t("fav.emptyTitle")}</h2>
          <p className="max-w-md text-sm text-[var(--ink-600)]">{t("fav.emptyBody")}</p>
          <BrandLink href="/dashboard/vitrine/nacional" size="md">
            {t("explore")}
          </BrandLink>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              priceLabel={f.money(p.costPrice)}
              favorite
              selected={mine.has(p.id)}
              onToggleFavorite={() => favorites.toggle(p.id)}
              onStart={() => start(p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
