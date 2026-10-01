"use client";

import { useTranslations } from "next-intl";
import { Tooltip } from "@/components/ui/Tooltip";
import { hasPublicPage, type MyProductRow } from "@/shared/products/myProducts";
import type { PromoteTarget } from "./PromoteModal";

const ShareIcon = () => (
  <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="2.6" />
    <circle cx="6" cy="12" r="2.6" />
    <circle cx="18" cy="19" r="2.6" />
    <path d="m8.3 10.7 7.4-4.3M8.3 13.3l7.4 4.3" />
  </svg>
);

/**
 * The "Links" cell: ONE prominent button, "Divulgar", that opens the promotion links of the product. Only an active
 * product has public pages; for the others the button is inactive and says why.
 */
export function ProductLinks({ product, onPromote }: { product: Pick<MyProductRow, "id" | "slug" | "status" | "title">; onPromote: (product: PromoteTarget) => void }) {
  const t = useTranslations("MyProducts.links");

  if (!hasPublicPage(product)) {
    return (
      <div className="flex justify-center">
        <Tooltip label={t("inactive")}>
          <span role="img" aria-label={`${t("promote")} (${t("inactive")})`} className="inline-flex h-9 cursor-not-allowed items-center gap-2 rounded-full border border-[var(--ink-100)] bg-[var(--ink-50)] px-4 text-[13px] font-semibold text-[var(--ink-300)]">
            <ShareIcon />
            {t("promote")}
          </span>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={() => onPromote({ id: product.id, slug: product.slug, title: product.title })}
        aria-label={`${t("promote")}: ${product.title}`}
        className="inline-flex h-9 items-center gap-2 rounded-full bg-brand-orange px-4 text-[13px] font-bold text-brand-black shadow-[0_6px_16px_-8px_rgba(255,90,0,0.8)] transition-all duration-150 hover:-translate-y-px hover:shadow-[0_10px_20px_-8px_rgba(255,90,0,0.9)] focus-visible:ring-4 focus-visible:ring-primary/25 focus-visible:outline-none active:translate-y-0"
      >
        <ShareIcon />
        {t("promote")}
      </button>
    </div>
  );
}
