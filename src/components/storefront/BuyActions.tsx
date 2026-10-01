"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { TruckIcon } from "./icons";

/**
 * The main buy button and, on phones only, a fixed bottom bar (price on the left, button on the right) that appears
 * once the main button has scrolled out of view, so the shopper can buy at any point of a long description.
 */
export function BuyActions({ slug, soldOut, price, label, shortLabel, soldOutLabel, note }: { slug: string; soldOut: boolean; price: string; label: string; shortLabel: string; soldOutLabel: string; note: string }) {
  const mainRef = useRef<HTMLDivElement>(null);
  const [mainVisible, setMainVisible] = useState(true);

  useEffect(() => {
    const el = mainRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setMainVisible(entry?.isIntersecting ?? true), { threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const showBar = !mainVisible && !soldOut;

  return (
    <>
      <div ref={mainRef}>
        {soldOut ? (
          <span aria-disabled="true" className="flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-line px-6 py-4 text-lg font-bold text-ink-muted">{soldOutLabel}</span>
        ) : (
          <Link href={`/checkout/${slug}`} className="flex w-full items-center justify-center gap-3 rounded-xl bg-action px-6 py-4 text-lg font-bold text-on-action shadow-[0_12px_30px_-12px_rgba(255,90,0,0.8)] transition-transform hover:scale-[1.02] focus-visible:ring-4 focus-visible:ring-action/30 focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:scale-100">
            <TruckIcon width={24} height={24} />
            {label}
          </Link>
        )}
        <p className="mt-2.5 text-center text-[12px] text-ink-muted">{note}</p>
      </div>

      {/* Phones only, and only once the main button is out of sight. */}
      <div aria-hidden={!showBar} className={`fixed bottom-0 left-0 z-50 w-full border-t bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-lg transition-transform duration-200 lg:hidden ${showBar ? "translate-y-0" : "pointer-events-none translate-y-full"}`}>
        <div className="mx-auto flex max-w-md items-center justify-between gap-4">
          <p className="text-xl font-extrabold tracking-tight tabular-nums">{price}</p>
          <Link href={`/checkout/${slug}`} tabIndex={showBar ? 0 : -1} className="flex items-center gap-2 rounded-xl bg-action px-5 py-3.5 text-base font-bold whitespace-nowrap text-on-action">
            <TruckIcon width={20} height={20} />
            {shortLabel}
          </Link>
        </div>
      </div>
    </>
  );
}
