"use client";

import { useTranslations } from "next-intl";
import { Modal } from "@/components/admin/ui";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { BoxIcon } from "@/components/kai/icons";
import { BRAND_BUTTON_CLASS } from "@/components/ui/BrandButton";
import { Link } from "@/i18n/navigation";
import { suggestedSalePrice } from "@/shared/vitrine/catalog";
import type { VitrineProduct } from "@/shared/vitrine/types";

/** A supplier product in detail: what it costs the merchant, what the supplier has, and a margin to aim for. */
export function ProductDetails({ product, imported, busy, onClose, onStart }: { product: VitrineProduct | null; imported: boolean; busy: boolean; onClose: () => void; onStart: () => void }) {
  const t = useTranslations("Vitrine.details");
  const v = useTranslations("Vitrine");
  const f = useFormatters();
  const open = product !== null;
  const cost = product?.costPrice ?? 0;
  const suggested = suggestedSalePrice(cost);
  const margin = suggested - cost;

  return (
    <Modal open={open} onClose={onClose} title={product?.title ?? t("title")}>
      {product && (
        <div className="space-y-5">
          <div className="flex gap-4">
            <div className="grid size-28 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--ink-100)] text-[var(--ink-300)] sm:size-32">
              {product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- private supplier photo route
                <img src={product.imageUrl} alt={product.title} className="size-full object-cover" />
              ) : <BoxIcon size={40} />}
            </div>
            <div className="min-w-0 text-sm">
              {product.supplierId && (
                <p className="text-[var(--ink-500)]">{v("supplierLabel")}{" "}
                  <Link href={`/dashboard/vitrine/fornecedor/${product.supplierId}`} onClick={onClose} className="font-semibold text-[var(--ink-800,var(--ink-900))] hover:underline">{product.supplierName}</Link>
                </p>
              )}
              <p className="mt-2 text-[var(--ink-500)]">{t("stock")}</p>
              <p className="font-semibold">{t("units", { count: product.stock ?? 0 })}</p>
            </div>
          </div>

          {product.description && (
            <div>
              <p className="text-xs font-semibold tracking-wide text-[var(--ink-500)] uppercase">{t("description")}</p>
              <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-[var(--ink-700)]">{product.description}</p>
            </div>
          )}

          <dl className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--ink-200)] bg-[var(--ink-50)] p-4 text-sm sm:grid-cols-3">
            <div><dt className="text-[12px] text-[var(--ink-500)]">{t("cost")}</dt><dd className="mono-num mt-0.5 text-[17px] font-extrabold">{f.money(cost)}</dd></div>
            <div><dt className="text-[12px] text-[var(--ink-500)]">{t("suggested")}</dt><dd className="mono-num mt-0.5 text-[17px] font-extrabold">{f.money(suggested)}</dd></div>
            <div><dt className="text-[12px] text-[var(--ink-500)]">{t("margin")}</dt><dd className="mono-num mt-0.5 text-[17px] font-extrabold text-[var(--kai-success)]">{f.money(margin)}</dd></div>
          </dl>
          <p className="text-[12px] text-[var(--ink-500)]">{t("marginHint")}</p>

          <div className="flex justify-end gap-3 border-t border-[var(--ink-100)] pt-4">
            <button type="button" onClick={onClose} className="inline-flex h-10 items-center rounded-full border border-[var(--ink-200)] bg-white px-4 text-sm font-semibold">{t("close")}</button>
            <button type="button" onClick={onStart} disabled={!product.inStock || busy} className={`${BRAND_BUTTON_CLASS} h-10 px-5 text-sm`}>
              {busy ? v("importing") : imported ? v("added") : v("start")}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
