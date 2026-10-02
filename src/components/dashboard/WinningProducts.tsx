import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { formatKwz } from "@/lib/money";
import type { CatalogProduct } from "@/server/modules/vitrine/service";
import { suggestedSalePrice } from "@/shared/vitrine/catalog";

/**
 * The "Winning Products" banner: the catalogue products the Kandrop team highlighted, right on the dashboard.
 * Renders nothing when there are none. Server component: the list is read on the server, scoped by nothing
 * private (the catalogue is the same for every merchant).
 */
export async function WinningProducts({
  products,
  locale,
}: {
  products: CatalogProduct[];
  locale: Locale;
}) {
  if (products.length === 0) return null;
  const t = await getTranslations({ locale, namespace: "Highlights.winning" });

  return (
    <section
      aria-labelledby="winning-title"
      className="rounded-2xl border border-[var(--ink-200)] bg-white p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] text-[var(--kai-orange-600)] uppercase">
            {t("eyebrow")}
          </p>
          <h2
            id="winning-title"
            className="mt-1 text-[18px] font-bold tracking-tight text-[var(--ink-900)] sm:text-[22px]"
          >
            {t("title")}
          </h2>
          <p className="mt-1 text-[13px] text-[var(--ink-600)]">{t("subtitle")}</p>
        </div>
        <Link
          href="/dashboard/vitrine/nacional"
          className="text-sm font-semibold text-[var(--ink-900)] underline underline-offset-4"
        >
          {t("all")}
        </Link>
      </div>
      <ul className="mt-4 flex snap-x gap-3 overflow-x-auto pb-1">
        {products.map((p) => (
          <li
            key={p.id}
            className="w-44 shrink-0 snap-start rounded-xl border border-[var(--ink-200)] p-3 sm:w-52"
          >
            <div className="relative aspect-square overflow-hidden rounded-lg bg-[var(--ink-50)]">
              {p.hasImage && (
                // eslint-disable-next-line @next/next/no-img-element -- the catalogue's own image route
                <img
                  src={`/api/vitrine/products/${p.id}/image?v=${p.updatedAt}`}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover"
                />
              )}
              <span className="absolute top-2 left-2 rounded-full bg-brand-orange px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-brand-black uppercase">
                {t("badge")}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-[13px] leading-snug font-semibold text-[var(--ink-900)]">
              {p.name}
            </p>
            <p className="mt-1 text-[12px] text-[var(--ink-600)]">
              {t("cost", { price: formatKwz(p.costPrice, locale) })}
            </p>
            <p className="text-[12px] font-semibold text-[var(--ink-900)]">
              {t("suggested", { price: formatKwz(suggestedSalePrice(p.costPrice), locale) })}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
