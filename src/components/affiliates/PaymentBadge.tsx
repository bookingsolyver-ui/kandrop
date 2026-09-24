import { useTranslations } from "next-intl";
import type { PaymentState } from "@/shared/affiliates/schemas";

const TONE: Record<PaymentState, string> = {
  paid: "text-up",
  pending: "text-ink-muted",
  overdue: "text-down",
  free: "text-ink-muted",
};

/** The label carries the meaning; the glyph (tick / clock / exclamation / dash) is a second cue. */
export function PaymentBadge({ state }: { state: PaymentState }) {
  const t = useTranslations("Affiliates.payment");
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
        className={`shrink-0 ${TONE[state]}`}
      >
        {state === "paid" && <path d="M2 6.5 4.75 9 10 3" />}
        {state === "pending" && (
          <>
            <circle cx="6" cy="6" r="4.75" />
            <path d="M6 3.5V6l1.75 1.1" />
          </>
        )}
        {state === "overdue" && (
          <>
            <circle cx="6" cy="6" r="4.75" />
            <path d="M6 3.5v3M6 8.5v.01" />
          </>
        )}
        {state === "free" && <path d="M3 6h6" />}
      </svg>
      {t(state)}
    </span>
  );
}
