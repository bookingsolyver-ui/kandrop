"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { OrdersIcon, OverviewIcon, WalletIcon } from "@/components/shell/icons";

type Kind = "revenue" | "order" | "payout";

/** Whole Kwanzas. Invented for illustration — the page says so next to the cards. */
const EVENTS: Array<{ kind: Kind; kz: number; minutes: number; city: string }> = [
  { kind: "revenue", kz: 50_000, minutes: 2, city: "Luanda" },
  { kind: "order", kz: 32_000, minutes: 4, city: "Benguela" },
  { kind: "payout", kz: 300_000, minutes: 11, city: "Huambo" },
  { kind: "revenue", kz: 128_500, minutes: 1, city: "Lubango" },
  { kind: "order", kz: 18_500, minutes: 3, city: "Luanda" },
  { kind: "payout", kz: 450_000, minutes: 9, city: "Cabinda" },
  { kind: "revenue", kz: 76_000, minutes: 2, city: "Lobito" },
  { kind: "order", kz: 54_900, minutes: 6, city: "Luanda" },
  { kind: "payout", kz: 200_000, minutes: 14, city: "Malanje" },
];

const ICON = { revenue: OverviewIcon, order: OrdersIcon, payout: WalletIcon } as const;

/** Where each of the three cards floats around the mockup (large screens); stacked below that. */
const SPOTS = [
  "lg:absolute lg:-top-7 lg:-right-4 xl:-right-10",
  "lg:absolute lg:top-[38%] lg:-left-6 xl:-left-14",
  "lg:absolute lg:-bottom-11 lg:right-6 xl:right-2",
] as const;

const INTERVAL_MS = 4500;

/**
 * Floating "sales happening now" cards. They are ILLUSTRATIVE and are labelled so by the caller:
 * a fixed list on a timer, not real data. They stop moving for visitors who ask for reduced motion.
 */
export function LiveProof() {
  const t = useTranslations("Marketing.hero.proof");
  const f = useFormatters();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setTick((n) => n + 1), INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    // Decorative: the caption beside it, in real text, says these are examples.
    <div aria-hidden className="mt-5 grid gap-3 lg:mt-0 lg:block">
      {SPOTS.map((spot, k) => {
        const event = EVENTS[(tick * 3 + k) % EVENTS.length]!;
        const Icon = ICON[event.kind];
        return (
          <div key={k} className={`float ${spot}`} style={{ "--i": k } as React.CSSProperties}>
            <div
              key={`${k}-${tick}`}
              className="proof-in flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.75)] lg:min-w-[15.5rem]"
              style={{ "--i": k } as React.CSSProperties}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                <Icon size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm leading-snug font-semibold tabular-nums">
                  {t(event.kind, { amount: f.money(event.kz * 100) })}
                </span>
                <span className="block text-[13px] text-ink-muted">
                  {t("ago", { minutes: event.minutes })} · {event.city}
                </span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
