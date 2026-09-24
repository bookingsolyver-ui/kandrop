import { useTranslations } from "next-intl";
import type { ProductStatus } from "@/shared/products/schemas";

/** The label carries the meaning; the dot shape (solid / ring / dash) is a second, non-colour cue. */
export function StatusBadge({ status }: { status: ProductStatus }) {
  const t = useTranslations("Catalog.status");
  return (
    <span className="inline-flex items-center gap-2 text-[13px] whitespace-nowrap text-ink-2">
      <svg aria-hidden width="8" height="8" viewBox="0 0 8 8" className="shrink-0">
        {status === "active" && <circle cx="4" cy="4" r="4" className="fill-up" />}
        {status === "draft" && (
          <circle cx="4" cy="4" r="3" fill="none" strokeWidth="1.5" className="stroke-ink-muted" />
        )}
        {status === "archived" && (
          <path d="M0 4h8" strokeWidth="1.5" className="stroke-ink-muted" />
        )}
      </svg>
      {t(status)}
    </span>
  );
}
