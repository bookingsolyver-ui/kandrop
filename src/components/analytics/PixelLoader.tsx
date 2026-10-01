"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";
import { isPrivatePath, platformPageview } from "@/lib/meta-pixel";

/** One platform `PageView` per page: the first load and every client-side navigation. Nothing on private routes. */
function PlatformPageviews() {
  const pathname = usePathname();
  useEffect(() => {
    platformPageview(); // refuses private routes itself
  }, [pathname]);
  return null;
}

/** Loads Meta's base code and counts the platform's page views, only on PUBLIC routes (`usePathname` also works in SSR). */
export function PixelLoader({ snippet, nonce }: { snippet: string; nonce?: string }) {
  const pathname = usePathname();
  if (isPrivatePath(pathname)) return null;
  return (
    <>
      <Script id="meta-pixel-base" strategy="afterInteractive" nonce={nonce} dangerouslySetInnerHTML={{ __html: snippet }} />
      <PlatformPageviews />
    </>
  );
}
