import { useTranslations } from "next-intl";
import type { OrderStatus } from "@/shared/orders/schemas";

const TONE: Record<OrderStatus, string> = {
  pending: "text-ink-muted",
  processing: "text-series-2",
  shipped: "text-series-1",
  delivered: "text-up",
  cancelled: "text-ink-muted",
};

/**
 * The label carries the meaning; the glyph (ring / half / arrow / tick / cross) is a second cue
 * that does not depend on colour.
 */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const t = useTranslations("Orders.status");
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
        {status === "pending" && <circle cx="6" cy="6" r="4.25" />}
        {status === "processing" && (
          <>
            <circle cx="6" cy="6" r="4.25" />
            <path d="M6 1.75a4.25 4.25 0 0 1 0 8.5z" fill="currentColor" />
          </>
        )}
        {status === "shipped" && <path d="M1.5 6h8M6.5 2.5 10 6l-3.5 3.5" />}
        {status === "delivered" && <path d="M2 6.5 4.75 9 10 3" />}
        {status === "cancelled" && <path d="m2.75 2.75 6.5 6.5M9.25 2.75l-6.5 6.5" />}
      </svg>
      {t(status)}
    </span>
  );
}
