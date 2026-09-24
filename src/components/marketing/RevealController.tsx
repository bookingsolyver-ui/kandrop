"use client";

import { useEffect } from "react";

/**
 * Scroll-in for `.reveal` blocks. Nothing is hidden beforehand: each block that starts below the
 * fold plays its entrance (`reveal-play`) once, the first time it reaches the screen. Where the
 * observer is missing, or the visitor asked for reduced motion, nothing happens at all.
 */
export function RevealController() {
  useEffect(() => {
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("reveal-play");
        observer.unobserve(entry.target);
      }
    });
    for (const el of document.querySelectorAll<HTMLElement>(".marketing .reveal")) {
      // Already on screen (a link straight to #planos, a tall window): no entrance, just there.
      if (el.getBoundingClientRect().top < window.innerHeight) continue;
      observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return null;
}
