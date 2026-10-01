"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { BoxIcon, CartIcon } from "@/components/kai/icons";
import { ProductLinks } from "@/components/products/ProductLinks";
import { PromoteModal, type PromoteTarget } from "@/components/products/PromoteModal";
import { BrandLink } from "@/components/ui/BrandButton";
import { Link } from "@/i18n/navigation";
import { hasPublicPage, publicPath, type MyProductRow } from "@/shared/products/myProducts";

const card = "rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-0)]";

/** The merchant's sales pages: one real landing page + direct checkout per product, live only while it is active. */
export function LandingPagesView({ products, siteOrigin }: { products: MyProductRow[]; siteOrigin: string }) {
  const t = useTranslations("LandingPages");
  const f = useFormatters();
  const locale = useLocale();
  const [promote, setPromote] = useState<PromoteTarget | null>(null);
  const live = products.filter(hasPublicPage).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-7 sm:gap-6">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-[var(--ink-900)] sm:text-[26px]">{t("title")}</h1>
          <p className="mt-1 text-[12px] text-[var(--ink-600)] sm:text-[15px]">{t("subtitle")}</p>
        </div>
        {products.length > 0 && <span className="rounded-full bg-[var(--kai-orange-50)] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--kai-orange-600)]">{t("live", { live, total: products.length })}</span>}
      </div>

      {products.length === 0 ? (
        <div className={`${card} flex flex-col items-center gap-4 px-6 py-20 text-center`}>
          <span className="grid size-14 place-items-center rounded-2xl bg-[var(--kai-orange-50)] text-[var(--kai-orange-600)]">
            <BoxIcon size={26} />
          </span>
          <h2 className="text-lg font-bold text-[var(--ink-900)]">{t("empty.title")}</h2>
          <p className="max-w-md text-sm text-[var(--ink-600)]">{t("empty.body")}</p>
          <BrandLink href="/dashboard/vitrine/nacional" size="md">
            <CartIcon size={16} />
            {t("empty.cta")}
          </BrandLink>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => {
            const active = hasPublicPage(p);
            return (
              <li key={p.id} className={`${card} flex flex-col gap-4 p-4`}>
                <div className="flex items-center gap-3">
                  {p.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.cover} alt="" className="size-14 shrink-0 rounded-xl border border-[var(--ink-200)] object-cover" />
                  ) : (
                    <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-[var(--ink-100)] text-[var(--ink-500)]">
                      <BoxIcon size={22} />
                    </span>
                  )}
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-[var(--ink-900)]">{p.title}</h2>
                    <p className="mono-num text-sm text-[var(--ink-600)]">{f.money(p.salePrice)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-[var(--ink-600)]">
                  <span className={`rounded-full px-2.5 py-1 font-semibold ${active ? "bg-[var(--kai-success-bg)] text-[var(--kai-success)]" : "bg-[var(--kai-warn-bg)] text-[var(--kai-warn)]"}`}>
                    {t(active ? "status.live" : "status.off")}
                  </span>
                  <span>{t("views", { count: p.views })}</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-[var(--ink-100)] pt-3">
                  {active ? (
                    <a href={publicPath(locale, p.slug)} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[var(--ink-900)] underline-offset-4 hover:underline">
                      {t("view")}
                    </a>
                  ) : (
                    <Link href={`/dashboard/products/${p.id}`} className="text-sm font-semibold text-[var(--ink-900)] underline-offset-4 hover:underline">
                      {t("activate")}
                    </Link>
                  )}
                  <ProductLinks product={p} onPromote={setPromote} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <PromoteModal product={promote} siteOrigin={siteOrigin} onClose={() => setPromote(null)} />
    </div>
  );
}
