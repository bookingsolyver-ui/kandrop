import { headers } from "next/headers";
import { META_PIXEL_ID, isPrivatePath } from "@/lib/meta-pixel";
import { PIXEL_BASE_SNIPPET } from "@/lib/meta-pixel-snippet";
import { PixelLoader } from "./PixelLoader";

/**
 * The PLATFORM pixel: Meta's base code plus Kandrop's own pixel, only when `NEXT_PUBLIC_META_PIXEL_ID` is set and only
 * on public routes (`PixelLoader` repeats the check in the browser). The inline script carries the request's CSP nonce
 * (src/proxy.ts). A merchant's own pixel is added by `<StorePixel />` on that merchant's store pages.
 */
export async function MetaPixel() {
  if (!META_PIXEL_ID) return null;
  const h = await headers();
  // A private route (admin, dashboard, supplier portal) never even receives the snippet in its HTML.
  if (isPrivatePath(h.get("x-pathname"))) return null;
  return <PixelLoader snippet={PIXEL_BASE_SNIPPET} nonce={h.get("x-nonce") ?? undefined} />;
}
