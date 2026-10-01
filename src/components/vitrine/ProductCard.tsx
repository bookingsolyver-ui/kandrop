"use client";

import { useTranslations } from "next-intl";
import { BoxIcon, FlagIcon, HeartIcon, PlaneIcon, ThermometerIcon } from "@/components/kai/icons";
import { BRAND_BUTTON_CLASS } from "@/components/ui/BrandButton";
import { Link } from "@/i18n/navigation";
import { supplierOfProduct } from "@/shared/supplier/mock";
import type { VitrineProduct } from "@/shared/vitrine/mock";

/**
 * One product of the showcase. Reusable: the national and the international page both render it,
 * and the real catalogue will too (it only needs a `VitrineProduct`). The image area shows the
 * supplier's photo when there is one (`imageUrl`), otherwise a neutral placeholder.
 */
export function ProductCard({
  product,
  priceLabel,
  favorite,
  selected,
  onToggleFavorite,
  onStart,
  imageUrl,
}: {
  product: VitrineProduct;
  /** The cost price, already formatted for the reader's language. */
  priceLabel: string;
  favorite: boolean;
  selected: boolean;
  onToggleFavorite: () => void;
  onStart: () => void;
  imageUrl?: string;
}) {
  const t = useTranslations("Vitrine");
  const international = product.kind === "internacional";
  const supplier = supplierOfProduct(product);

  return (
    <article className="flex flex-col overflow-hidden rounded-[var(--r-lg)] border border-[var(--ink-200)] bg-[var(--ink-0)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--sh-md)]">
      <div className="relative aspect-square overflow-hidden bg-[var(--ink-100)]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- supplier photos come from many hosts
          <img src={imageUrl} alt={product.title} loading="lazy" className="size-full object-cover" />
        ) : (
          <div
            role="img"
            aria-label={product.title}
            className="grid size-full place-items-center bg-gradient-to-br from-[var(--ink-50)] to-[var(--ink-200)] text-[var(--ink-300)]"
          >
            <BoxIcon size={56} />
          </div>
        )}

        {selected && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-green-700 px-2.5 py-1 text-[10.5px] font-bold tracking-[0.04em] text-white uppercase shadow-sm">
            <span aria-hidden>✓</span>
            {t("inStore")}
          </span>
        )}

        <button
          type="button"
          onClick={onToggleFavorite}
          aria-pressed={favorite}
          aria-label={favorite ? t("unfavorite") : t("favorite")}
          className={`absolute top-2 right-2 flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/35 backdrop-blur-sm transition-all hover:bg-black/50 active:scale-95 ${
            favorite ? "text-brand-orange" : "text-white"
          }`}
        >
          <HeartIcon size={18} filled={favorite} />
        </button>

        {/* The green "in your store" badge owns the top-left corner; the origin tag stays at the bottom. */}
        <div className="absolute bottom-2 left-2 flex flex-col items-start gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[10.5px] font-bold tracking-[0.04em] text-brand-black uppercase shadow-sm">
            {international ? <PlaneIcon size={12} /> : <FlagIcon size={12} />}
            {t(international ? "badge.international" : "badge.national")}
          </span>
          {product.isNew && (
            <span className="rounded-full bg-white px-2.5 py-1 text-[10.5px] font-bold tracking-[0.04em] text-brand-black uppercase shadow-sm">
              {t("new")}
            </span>
          )}
        </div>

        {!product.inStock && (
          <div className="absolute inset-0 grid place-items-center bg-white/70 backdrop-blur-[1px]">
            <span className="rounded-full bg-brand-black px-3 py-1 text-xs font-bold text-white">{t("out")}</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-[14px] leading-snug font-semibold text-[var(--ink-900)]">
          {product.title}
        </h3>

        {supplier && (
          <p className="-mt-1.5 truncate text-[12px] text-[var(--ink-500)]">
            {t("supplierLabel")}{" "}
            <Link href={`/dashboard/vitrine/fornecedor/${supplier.id}`} className="font-semibold text-[var(--ink-700)] underline-offset-2 hover:text-[var(--kai-orange-600)] hover:underline">
              {supplier.name}
            </Link>
          </p>
        )}

        {product.hot && (
          <div className="flex items-center gap-2 text-[12px] font-semibold text-[var(--kai-orange-600)]">
            <ThermometerIcon size={14} />
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--ink-100)]">
              <span className="block h-full w-4/5 rounded-full bg-brand-orange" />
            </span>
            <span>{t("hot")}</span>
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-[var(--ink-500)]">{t("cost")}</p>
            <p className="mono-num truncate text-[17px] font-extrabold tracking-[-0.02em] text-[var(--ink-900)]">
              {priceLabel}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onStart}
          disabled={!product.inStock}
          aria-pressed={selected}
          className={`${BRAND_BUTTON_CLASS} h-10 w-full px-4 text-[13px] ${
            selected ? "!bg-white !text-[var(--ink-900)] ring-1 ring-[var(--ink-200)] !shadow-none" : ""
          }`}
        >
          {selected ? t("added") : t("start")}
        </button>
      </div>
    </article>
  );
}
