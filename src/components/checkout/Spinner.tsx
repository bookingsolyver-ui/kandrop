import type { ReactNode } from "react";

/**
 * A thin ring with one arc travelling round it and a quiet glyph inside: an unhurried "we are
 * waiting for the bank", not an anxious loader. Motion is a single slow rotation, and is
 * removed for people who ask for reduced motion (the arc then just stays put).
 */
export function Spinner({ children }: { children: ReactNode }) {
  return (
    <div aria-hidden className="relative mx-auto mb-6 grid size-24 place-items-center">
      <svg viewBox="0 0 96 96" fill="none" className="absolute inset-0 size-full">
        <circle cx="48" cy="48" r="44" strokeWidth="2" className="stroke-line" />
        <circle
          cx="48"
          cy="48"
          r="44"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="72 204.5"
          className="spinner-arc stroke-select"
        />
      </svg>
      <span className="text-ink-2">{children}</span>
    </div>
  );
}
