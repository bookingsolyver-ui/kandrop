import { useTranslations } from "next-intl";
import type { PayoutStatus } from "@/shared/payouts/schemas";

/** The label carries the meaning; the glyph (ring / tick) is a second cue that is not colour. */
export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  const t = useTranslations("Payouts.status");
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
        className={`shrink-0 ${status === "completed" ? "text-up" : "text-series-2"}`}
      >
        {status === "pending" ? (
          <>
            <circle cx="6" cy="6" r="4.25" />
            <path d="M6 3.5V6l1.75 1" />
          </>
        ) : (
          <path d="M2 6.5 4.75 9 10 3" />
        )}
      </svg>
      {t(status)}
    </span>
  );
}
