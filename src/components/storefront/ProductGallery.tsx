"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * The product photos: one large main image (subtle zoom on hover) and a grid of thumbnails below; clicking a
 * thumbnail makes it the main image. The first photo loads with priority, the others as they come near.
 */
export function ProductGallery({ images, title }: { images: Array<{ id: string; url: string }>; title: string }) {
  const t = useTranslations("Storefront.gallery");
  const [current, setCurrent] = useState(0);
  const active = images[Math.min(current, images.length - 1)];

  if (!active) {
    return (
      <div className="grid aspect-square place-items-center rounded-2xl border border-line bg-surface text-sm text-ink-muted">{t("none")}</div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="group aspect-square overflow-hidden rounded-2xl border border-line bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element -- the shopper-facing photo from our own API */}
        <img key={active.id} src={active.url} alt={title} fetchPriority="high" className="size-full object-cover transition-transform duration-500 ease-out motion-reduce:transition-none [@media(hover:hover)]:group-hover:scale-110" />
      </div>
      {images.length > 1 && (
        <ul aria-label={t("label")} className="grid grid-cols-4 gap-2.5 sm:grid-cols-5">
          {images.map((image, i) => (
            <li key={image.id}>
              <button type="button" onClick={() => setCurrent(i)} aria-label={t("goTo", { n: i + 1 })} aria-pressed={i === current}
                className={`block aspect-square w-full overflow-hidden rounded-xl border-2 bg-surface transition-all focus-visible:ring-4 focus-visible:ring-action/20 focus-visible:outline-none ${i === current ? "border-action" : "border-line opacity-80 hover:opacity-100"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- the shopper-facing photo from our own API */}
                <img src={image.url} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
