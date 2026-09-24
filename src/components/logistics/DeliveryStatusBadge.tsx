import { useTranslations } from "next-intl";
import type { DeliveryStatus } from "@/shared/logistics/schemas";

const TONE: Record<DeliveryStatus, string> = {
  in_transit: "text-accent",
  delivered: "text-up",
  returned: "text-down",
};

/** The label carries the meaning; the glyph (arrow / tick / return arrow) is a second cue. */
export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  const t = useTranslations("Logistics.status");
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
        {status === "in_transit" && <path d="M1.5 6h8M6.5 2.5 10 6l-3.5 3.5" />}
        {status === "delivered" && <path d="M2 6.5 4.75 9 10 3" />}
        {status === "returned" && <path d="M10 6H2M5.5 2.5 2 6l3.5 3.5" />}
      </svg>
      {t(status)}
    </span>
  );
}
