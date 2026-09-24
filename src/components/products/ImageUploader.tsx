"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { PublicProduct } from "@/server/modules/products/schema";
import { MAX_IMAGES, type ImageRef } from "@/shared/products/schemas";
import { CloseIcon } from "@/components/data/icons";
import { PlusIcon } from "./icons";
import { prepareImage } from "./resizeImage";

/** An image in the form: either one the product already has (`id`) or a new upload (`dataUrl`). */
export interface ImageItem {
  key: string;
  /** What the `<img>` shows: the API URL for kept images, the resized data URL for new ones. */
  src: string;
  id?: string;
  dataUrl?: string;
}

export const itemsFromProduct = (images: PublicProduct["images"]): ImageItem[] =>
  images.map((image) => ({ key: image.id, id: image.id, src: image.url }));

export const toImageRefs = (items: ImageItem[]): ImageRef[] =>
  items.map((item) => (item.id ? { id: item.id } : { dataUrl: item.dataUrl! }));

export function ImageUploader({
  items,
  onChange,
  error,
}: {
  items: ImageItem[];
  onChange: Dispatch<SetStateAction<ImageItem[]>>;
  /** Already translated server-side/field-level error. */
  error?: string;
}) {
  const t = useTranslations("Catalog.form.images");
  const problems = useTranslations("Catalog.imageErrors");
  const inputRef = useRef<HTMLInputElement>(null);
  const counter = useRef(0);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const room = MAX_IMAGES - items.length;

  async function add(files: File[]) {
    if (files.length === 0) return;
    let issue = files.length > room ? problems("max", { max: MAX_IMAGES }) : null;
    setProblem(null);
    setBusy(true);

    const added: ImageItem[] = [];
    for (const file of files.slice(0, Math.max(room, 0))) {
      const result = await prepareImage(file);
      if (result.ok) {
        added.push({
          key: `new-${++counter.current}`,
          src: result.dataUrl,
          dataUrl: result.dataUrl,
        });
      } else {
        issue ??= problems(result.problem);
      }
    }

    setBusy(false);
    setProblem(issue);
    if (added.length) onChange((prev) => [...prev, ...added].slice(0, MAX_IMAGES));
  }

  const message = problem ?? error;

  return (
    <div>
      <p className="text-sm text-ink-2">{t("hint", { max: MAX_IMAGES })}</p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void add(Array.from(e.dataTransfer.files));
        }}
        className={`mt-4 rounded-lg border border-dashed p-4 transition-colors motion-reduce:transition-none ${
          dragging ? "border-select bg-page" : "border-field"
        }`}
      >
        {items.length > 0 && (
          <ul className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {items.map((item, index) => (
              <li key={item.key}>
                <div className="relative aspect-square overflow-hidden rounded-md border border-line bg-page">
                  {/* Previews are data URLs or authenticated API images: next/image cannot optimise them. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.src}
                    alt={t("alt", { n: index + 1 })}
                    className="size-full object-cover"
                  />
                  {index === 0 && (
                    <span className="absolute bottom-1.5 left-1.5 rounded bg-surface px-1.5 py-0.5 text-[11px] font-medium text-ink">
                      {t("cover")}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onChange((prev) => prev.filter((p) => p.key !== item.key))}
                    aria-label={t("remove", { n: index + 1 })}
                    className="absolute top-1 right-1 grid size-9 place-items-center rounded-full border border-line bg-surface text-ink hover:text-down"
                  >
                    <CloseIcon size={14} />
                  </button>
                </div>
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange((prev) => [item, ...prev.filter((p) => p.key !== item.key)])
                    }
                    className="mt-1 min-h-11 w-full text-[13px] text-ink-2 underline underline-offset-4 hover:text-ink"
                  >
                    {t("makeCover")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={room <= 0 || busy}
            aria-busy={busy}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-field bg-surface px-4 text-sm font-medium hover:bg-page disabled:opacity-50"
          >
            <PlusIcon />
            {t("add")}
          </button>
          <span className="hidden text-[13px] text-ink-muted sm:inline">{t("drop")}</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            tabIndex={-1}
            aria-hidden
            className="hidden"
            onChange={(e) => {
              void add(Array.from(e.target.files ?? []));
              e.target.value = ""; // lets the same file be chosen again after removing it
            }}
          />
        </div>
      </div>

      {message && (
        <p role="alert" className="mt-2 text-[13px] leading-snug text-down">
          {message}
        </p>
      )}
    </div>
  );
}
