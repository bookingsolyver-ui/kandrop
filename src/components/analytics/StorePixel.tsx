import { headers } from "next/headers";
import { isPixelId } from "@/lib/meta-pixel";
import { PIXEL_BASE_SNIPPET } from "@/lib/meta-pixel-snippet";
import { StorePixelClient } from "./StorePixelClient";

/**
 * The MERCHANT's own pixel, for the pages of that merchant's store (product page, checkout, order confirmation).
 * Renders nothing when the merchant has not set one (or the id is not valid), so the page works exactly as before and
 * only the platform pixel, if any, runs. The id comes from the store's settings in the database, never from the URL.
 */
export async function StorePixel({ id }: { id: string | null | undefined }) {
  if (!isPixelId(id)) return null;
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <StorePixelClient id={id} snippet={PIXEL_BASE_SNIPPET} nonce={nonce} />;
}
