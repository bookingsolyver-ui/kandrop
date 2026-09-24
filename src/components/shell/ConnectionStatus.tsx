"use client";

import { useTranslations } from "next-intl";
import { useDashboardLive, type LiveStatus } from "@/components/dashboard/useDashboardLive";

const DOT: Record<LiveStatus, string> = {
  live: "bg-accent pulse",
  connecting: "bg-ink-muted",
  reconnecting: "bg-series-2",
};

/**
 * State of the real-time channel: green and "Online" while connected. The word is always
 * present for assistive tech, and shown next to the dot from `sm` up (colour alone is not enough).
 */
export function ConnectionStatus() {
  const t = useTranslations("Shell.connection");
  const { status } = useDashboardLive();
  const label = t(status);

  return (
    <p
      role="status"
      title={`${t("title")}: ${label}`}
      className="flex items-center gap-2 text-[13px] text-ink-2"
    >
      <span aria-hidden className={`size-2 rounded-full ${DOT[status]}`} />
      <span className="max-sm:sr-only">
        <span className="sr-only">{t("title")}: </span>
        {label}
      </span>
    </p>
  );
}
