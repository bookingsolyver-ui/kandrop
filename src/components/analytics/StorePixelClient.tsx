"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";
import { isPrivatePath, registerStorePixel, storePageview } from "@/lib/meta-pixel";

/**
 * Registers the merchant's pixel while their store page is open: it is initialised, counts its own `PageView`, and
 * hears every conversion event (InitiateCheckout, Purchase) next to the platform pixel. On leaving the page it is
 * unregistered, so it never receives events from anywhere else. The base code is included too (same script id as the
 * platform's: it is only loaded once), so the merchant's pixel works even when the platform has none.
 */
export function StorePixelClient({ id, snippet, nonce }: { id: string; snippet: string; nonce?: string }) {
  const pathname = usePathname();
  useEffect(() => {
    registerStorePixel(id);
    storePageview();
    return () => registerStorePixel(null);
  }, [id, pathname]);
  if (isPrivatePath(pathname)) return null;
  return <Script id="meta-pixel-base" strategy="afterInteractive" nonce={nonce} dangerouslySetInnerHTML={{ __html: snippet }} />;
}
