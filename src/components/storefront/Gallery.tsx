"use client";

import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

const ImageGlyph = () => (
  <svg
    aria-hidden
    width="40"
    height="40"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
    <circle cx="7" cy="8" r="1.4" />
    <path d="m3 14.5 4-3.5 3 2.5 3-3 4 4" />
  </svg>
);

/**
 * Product photos as a swipeable strip (CSS scroll-snap: native, smooth, cheap on a low-end
 * phone). The first photo is requested first; the rest load as they come near. A photo counter
 * and dots show where you are; the strip is also reachable with the arrow keys.
 */
export function Gallery({
  images,
  title,
}: {
  images: Array<{ id: string; url: string }>;
  title: string;
}) {
  const t = useTranslations("Storefront.gallery");
  const track = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);

  if (images.length === 0) {
    return (
      <div className="grid aspect-square w-full place-items-center bg-page text-ink-muted lg:sticky lg:top-6 lg:self-start lg:rounded-lg lg:border lg:border-line">
        <div className="flex flex-col items-center gap-2 text-sm">
          <ImageGlyph />
          {t("none")}
        </div>
      </div>
    );
  }

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: i * el.clientWidth, behavior: calm ? "auto" : "smooth" });
  };

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={t("label")}
      className="relative lg:sticky lg:top-6 lg:self-start lg:overflow-hidden lg:rounded-lg lg:border lg:border-line"
    >
      <ul
        ref={track}
        tabIndex={0}
        aria-label={t("label")}
        onScroll={(e) =>
          setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))
        }
        className="flex snap-x snap-mandatory overflow-x-auto bg-page [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((image, i) => (
          <li key={image.id} className="aspect-square w-full shrink-0 snap-center">
            {/* Shopper-facing photo from our own API, already resized when it was uploaded. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt={t("slide", { title, current: i + 1, total: images.length })}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "auto"}
              decoding="async"
              className="size-full object-cover"
            />
          </li>
        ))}
      </ul>

      {images.length > 1 && (
        <>
          <p
            aria-hidden
            className="absolute top-3 right-3 rounded-full bg-page/90 px-2.5 py-1 text-[12px] font-medium text-ink tabular-nums"
          >
            {t("counter", { current: index + 1, total: images.length })}
          </p>
          <div className="flex justify-center gap-1 py-2">
            {images.map((image, i) => (
              <button
                key={image.id}
                type="button"
                onClick={() => go(i)}
                aria-label={t("goTo", { n: i + 1 })}
                aria-current={i === index}
                className="grid size-6 place-items-center"
              >
                <span
                  className={`size-2 rounded-full transition-colors motion-reduce:transition-none ${
                    i === index ? "bg-ink" : "bg-field"
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
