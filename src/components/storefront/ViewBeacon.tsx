"use client";

import { useEffect } from "react";

/**
 * Tells the shop this page was opened (the "Views" column of the merchant's products). Once per
 * browser session per product, from the browser after it loaded, so refreshes do not inflate it
 * and most crawlers never run it. Simulated analytics: failures are ignored on purpose.
 */
export function ViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `kandrop:viewed:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage blocked: count it (better one extra view than none) */
    }
    fetch(`/api/store/${encodeURIComponent(slug)}/view`, { method: "POST", keepalive: true }).catch(
      () => {
        /* analytics only */
      }
    );
  }, [slug]);
  return null;
}
