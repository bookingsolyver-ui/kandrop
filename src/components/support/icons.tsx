import type { ReactNode } from "react";

function Svg({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

type P = { size?: number };

export const MailIcon = ({ size = 22 }: P) => (
  <Svg size={size}>
    <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
    <path d="m3.5 6 6.5 5 6.5-5" />
  </Svg>
);
export const ClockIcon = ({ size = 22 }: P) => (
  <Svg size={size}>
    <circle cx="10" cy="10" r="7.25" />
    <path d="M10 5.75V10l2.75 1.75" />
  </Svg>
);
export const InfoIcon = ({ size = 20 }: P) => (
  <Svg size={size}>
    <circle cx="10" cy="10" r="7.25" />
    <path d="M10 9v4.25M10 6.5v.01" />
  </Svg>
);
export const ChevronIcon = ({ size = 18 }: P) => (
  <Svg size={size}>
    <path d="m5.5 8 4.5 4.5L14.5 8" />
  </Svg>
);
export const CheckCircleIcon = ({ size = 20 }: P) => (
  <Svg size={size}>
    <circle cx="10" cy="10" r="7.25" />
    <path d="m6.75 10.25 2.25 2.25 4.25-4.75" />
  </Svg>
);
