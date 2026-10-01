"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { isPrivatePath } from "@/lib/meta-pixel";
import { PixelRouteEvents } from "./PixelRouteEvents";

/**
 * Loads the pixel only on PUBLIC routes. On /admin, /dashboard and the supplier portal nothing is loaded at all (no
 * script, no automatic PageView). `usePathname` is available during SSR too, so a private page never even receives
 * the snippet in its HTML.
 */
export function PixelLoader({ snippet, nonce }: { snippet: string; nonce?: string }) {
  const pathname = usePathname();
  if (isPrivatePath(pathname)) return null;
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive" nonce={nonce} dangerouslySetInnerHTML={{ __html: snippet }} />
      <PixelRouteEvents />
    </>
  );
}
