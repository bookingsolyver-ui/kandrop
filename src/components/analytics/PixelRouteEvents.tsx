"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { pageview } from "@/lib/meta-pixel";

/** One `PageView` for every client-side navigation after the first load (the snippet already counted that one). */
export function PixelRouteEvents() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    pageview();
  }, [pathname]);
  return null;
}
