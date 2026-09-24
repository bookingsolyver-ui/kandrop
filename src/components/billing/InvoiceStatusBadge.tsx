import { useTranslations } from "next-intl";
import type { InvoiceStatus } from "@/shared/billing/schemas";

const TONE: Record<InvoiceStatus, string> = {
  paid: "text-up",
  pending: "text-ink-muted",
  failed: "text-down",
};

/** The label carries the meaning; the glyph (tick / clock / exclamation) is a second cue. */
export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const t = useTranslations("Billing.invoices.statuses");
  return (
    <span className="inline-flex items-center gap-2 text-[13px] whitespace-nowrap text-ink">
      <svg
        aria-hidden
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`shrink-0 ${TONE[status]}`}
      >
        {status === "paid" && <path d="M2 6.5 4.75 9 10 3" />}
        {status === "pending" && (
          <>
            <circle cx="6" cy="6" r="4.75" />
            <path d="M6 3.5V6l1.75 1.1" />
          </>
        )}
        {status === "failed" && (
          <>
            <circle cx="6" cy="6" r="4.75" />
            <path d="M6 3.5v3M6 8.5v.01" />
          </>
        )}
      </svg>
      {t(status)}
    </span>
  );
}
