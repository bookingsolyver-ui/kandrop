import type { ReactNode } from "react";

function Svg({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

type P = { size?: number };

/** Three lesson states, three different shapes: colour only reinforces them. */
export const LockGlyph = ({ size = 18 }: P) => (
  <Svg size={size}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Svg>
);
export const PlayGlyph = ({ size = 18 }: P) => (
  <svg
    aria-hidden
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className="shrink-0"
  >
    <path d="M8.5 5.6v12.8a.8.8 0 0 0 1.2.7l10.2-6.4a.8.8 0 0 0 0-1.4L9.7 4.9a.8.8 0 0 0-1.2.7z" />
  </svg>
);
export const CheckGlyph = ({ size = 18 }: P) => (
  <Svg size={size}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Svg>
);
export const ExpandGlyph = ({ size = 20 }: P) => (
  <Svg size={size}>
    <path d="M3.5 9V4.5H8M20.5 9V4.5H16M3.5 15v4.5H8M20.5 15v4.5H16" />
  </Svg>
);
export const ShrinkGlyph = ({ size = 20 }: P) => (
  <Svg size={size}>
    <path d="M8 3.5V8H3.5M16 3.5V8h4.5M8 20.5V16H3.5M16 20.5V16h4.5" />
  </Svg>
);
/** Wide frame: the "theatre" (page-wide) mode. */
export const TheatreGlyph = ({ size = 20 }: P) => (
  <Svg size={size}>
    <rect x="3.5" y="5" width="17" height="14" rx="2" />
    <path d="M9 9.5 7.5 11M15 9.5l1.5 1.5" />
  </Svg>
);
export const ChevronGlyph = ({ size = 18 }: P) => (
  <Svg size={size}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);
