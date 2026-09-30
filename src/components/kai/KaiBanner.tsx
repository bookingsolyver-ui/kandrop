"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";

const SLIDES = [
  { key: "academy", href: "/dashboard/academy", from: "#ff6b1a", to: "#c2410c" },
  { key: "affiliates", href: "/dashboard/affiliates", from: "#1a1814", to: "#46413a" },
  { key: "whatsapp", href: "/dashboard/automations", from: "#15803d", to: "#166534" },
] as const;

/** Rotating promo banner (changes every 6 s, never while the pointer is over it or motion is reduced). */
export function KaiBanner() {
  const t = useTranslations("Kai.banner");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 6000);
    return () => clearInterval(timer);
  }, [paused]);

  const slide = SLIDES[index]!;
  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div key={slide.key} className="animate-fade-in">
        <Link
          href={slide.href}
          className="relative block overflow-hidden rounded-[var(--r-lg)] transition-transform hover:-translate-y-0.5 sm:aspect-[4/1]"
          style={{ background: `linear-gradient(120deg, ${slide.from}, ${slide.to})` }}
        >
          <div className="flex h-full flex-col justify-center gap-2 px-8 py-8 text-white sm:px-12">
            <p className="text-[11px] font-bold tracking-[0.12em] uppercase opacity-80">
              {t(`${slide.key}.eyebrow`)}
            </p>
            <h2 className="max-w-xl text-[24px] leading-tight font-extrabold tracking-[-0.02em] sm:text-[30px]">
              {t(`${slide.key}.title`)}
            </h2>
            <span className="mt-1 inline-flex w-fit items-center rounded-[var(--r-pill)] bg-white px-4 py-2 text-[13px] font-semibold text-[var(--ink-900)]">
              {t(`${slide.key}.cta`)}
            </span>
          </div>
        </Link>
      </div>
      <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
        {SLIDES.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={t("show", { n: i + 1, total: SLIDES.length })}
            aria-current={i === index}
            className={`h-2 rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-all ${
              i === index ? "w-5 bg-white" : "w-2 bg-white/60 hover:bg-white/90"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
