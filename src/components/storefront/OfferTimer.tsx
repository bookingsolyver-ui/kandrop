"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * A real countdown to the merchant's deadline, not a decoration: when it reaches zero the page
 * is refreshed and the price goes back to the regular one (the server decides, see `offerOf`).
 * It counts from the server's clock and a monotonic timer, so a wrong clock on the shopper's
 * phone cannot make the offer look longer or shorter than it is.
 */
export function OfferTimer({ endsAt, now }: { endsAt: string; now: string }) {
  const t = useTranslations("Storefront.timer");
  const router = useRouter();
  const total = Math.max(0, Math.ceil((Date.parse(endsAt) - Date.parse(now)) / 1000));
  const [left, setLeft] = useState(total);

  useEffect(() => {
    const started = performance.now();
    const timer = setInterval(
      () => setLeft(Math.max(0, total - Math.floor((performance.now() - started) / 1000))),
      1000
    );
    return () => clearInterval(timer);
  }, [total]);

  const ended = left === 0;
  useEffect(() => {
    if (!ended) return;
    // A moment later, so the server's own clock has certainly passed the deadline too.
    const timer = setTimeout(() => router.refresh(), 800);
    return () => clearTimeout(timer);
  }, [ended, router]);

  const days = Math.floor(left / 86_400);
  const h = Math.floor((left % 86_400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const time = h > 0 || days > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;

  return (
    <p
      role="timer"
      className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-md border border-line bg-page px-4 py-3 text-[15px]"
    >
      <svg
        aria-hidden
        width="18"
        height="18"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-ink-2"
      >
        <circle cx="10" cy="10.5" r="6.5" />
        <path d="M10 7v3.75l2.25 1.25M8 2.5h4" />
      </svg>
      {ended ? (
        <span className="font-medium">{t("ended")}</span>
      ) : (
        <>
          <span className="text-ink-2">{t("label")}</span>
          <span className="text-lg font-semibold tracking-tight tabular-nums">
            {days > 0 ? t("days", { days, time }) : time}
          </span>
        </>
      )}
    </p>
  );
}
