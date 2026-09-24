import { ImageIcon } from "./icons";

/** Decorative: the product title is always next to it. */
export function ProductThumb({ src }: { src?: string }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-page text-ink-muted">
      {src ? (
        // Authenticated, already-resized images (or in-browser previews): next/image cannot add anything here.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
      ) : (
        <ImageIcon />
      )}
    </span>
  );
}
