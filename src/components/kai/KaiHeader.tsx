"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { useDashboardLive } from "@/components/dashboard/useDashboardLive";
import { useFormatters } from "@/components/dashboard/useFormatters";
import { Link } from "@/i18n/navigation";
import { formatKwzMillions } from "@/lib/money";
import { CartIcon, MenuBarsIcon, RefreshIcon, TrendingUpIcon } from "./icons";
import { NotificationsPopover } from "./NotificationsPopover";

const KZ = 100;
/** Revenue goals (Kz) the progress bar aims at: the first one not reached yet. */
const GOALS = [1_000_000, 5_000_000, 10_000_000, 50_000_000, 100_000_000];

const goalLabel = (kz: number) => formatKwzMillions(kz / 1_000_000);

/** Top bar: greeting, revenue goal, and the quick actions. */
export function KaiHeader({ firstName, onMenu }: { firstName: string; onMenu: () => void }) {
  const t = useTranslations("Kai.header");
  const shell = useTranslations("Shell");
  const f = useFormatters();
  const { summary, refresh } = useDashboardLive();
  const [spinning, setSpinning] = useState(false);

  const gross = summary?.grossRevenue.value.amount ?? 0;
  const goal = GOALS.find((g) => g * KZ > gross) ?? GOALS[GOALS.length - 1]!;
  const pct = Math.min(100, Math.round((gross / (goal * KZ)) * 100));

  async function reload() {
    setSpinning(true);
    await refresh();
    setSpinning(false);
  }

  const round =
    "relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--ink-200)] bg-[var(--ink-0)] text-[var(--ink-700)] transition-all hover:border-[var(--ink-300)] hover:text-[var(--ink-900)]";

  return (
    <header
      className="sticky top-0 z-40 flex h-16 w-full shrink-0 items-center gap-2 border-b border-[var(--ink-200)] px-3 sm:gap-4 sm:px-6"
      style={{ background: "rgba(241, 241, 240, 0.85)", backdropFilter: "blur(16px) saturate(160%)" }}
    >
      <button
        type="button"
        onClick={onMenu}
        aria-label={shell("openMenu")}
        aria-haspopup="dialog"
        className="-ml-1 grid size-10 shrink-0 place-items-center rounded-md text-[var(--ink-700)] lg:hidden"
      >
        <MenuBarsIcon size={20} />
      </button>

      {/* The official icon from KANDROP_VISUAL (1k.png: the white K on the orange square, public/brand/k-ok.png): next to the menu button and the
          greeting on a phone. The full wordmark lives in the desktop sidebar. */}
      <Link href="/dashboard" aria-label="Kandrop" className="shrink-0 outline-none focus-visible:outline-none lg:hidden">
        <Image src="/brand/k-ok.png" alt="" width={32} height={32} priority className="size-8 rounded-md" />
      </Link>

      <div className="flex min-w-0 flex-col leading-tight">
        <span className="text-[11px] font-semibold tracking-[0.08em] text-[var(--ink-500)] uppercase">
          {t("welcome")}
        </span>
        <span
          className="truncate font-bold tracking-[-0.01em] text-[var(--ink-900)]"
          style={{ fontSize: 17 }}
        >
          {firstName}
        </span>
      </div>

      <div className="ml-auto hidden items-center gap-3 lg:flex">
        <div className="flex items-center gap-3 rounded-[var(--r-pill)] border border-[var(--ink-200)] bg-[var(--ink-0)] px-4 py-2.5 shadow-[var(--sh-xs)]">
          <TrendingUpIcon size={18} className="shrink-0 text-[var(--kai-orange)]" />
          <div className="flex flex-col gap-0">
            <span className="text-[10.5px] font-semibold tracking-[0.06em] text-[var(--ink-500)] uppercase">
              {t("revenue")}
            </span>
            <span className="mono-num text-[14px] leading-tight font-bold text-[var(--ink-900)]">
              {f.money(gross)}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="h-1.5 w-24 overflow-hidden rounded-[var(--r-pill)] bg-[var(--ink-200)]">
              <div
                className="h-full rounded-[var(--r-pill)]"
                style={{
                  width: `${pct}%`,
                  background: "linear-gradient(90deg, var(--kai-orange-300), var(--kai-orange))",
                }}
              />
            </div>
            <span className="text-[10.5px] font-medium text-[var(--ink-500)]">
              {pct}% / {goalLabel(goal)}
            </span>
          </div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2 lg:ml-3">
        <div className="hidden sm:block">
          <LocaleSwitcher className="h-9 cursor-pointer rounded-full border border-[var(--ink-200)] bg-[var(--ink-0)] px-3 text-[13px] font-medium text-[var(--ink-700)] transition-all hover:border-[var(--ink-300)] hover:text-[var(--ink-900)]" />
        </div>
        <button
          type="button"
          title={t("refresh")}
          aria-label={t("refresh")}
          onClick={reload}
          className={round}
        >
          <RefreshIcon size={16} className={spinning ? "animate-spin" : ""} />
        </button>
        <NotificationsPopover className={round} />
        <Link href="/dashboard/orders" title={t("orders")} aria-label={t("orders")} className={round}>
          <CartIcon size={16} />
        </Link>
      </div>
    </header>
  );
}
