import type { ReactNode } from "react";

function Icon({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 16 16"
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

export const TrashIcon = ({ size = 16 }: P) => (
  <Icon size={size}>
    <path d="M2.5 4.5h11M6 4.5V3h4v1.5M4 4.5l.6 8h6.8l.6-8" />
  </Icon>
);
export const ImageIcon = ({ size = 16 }: P) => (
  <Icon size={size}>
    <rect x="2" y="3" width="12" height="10" rx="1.5" />
    <circle cx="5.75" cy="6.5" r="1" />
    <path d="m2.5 12 3.5-3.5 2.5 2.5 2-2 3 3" />
  </Icon>
);
export const PlusIcon = ({ size = 16 }: P) => (
  <Icon size={size}>
    <path d="M8 3v10M3 8h10" />
  </Icon>
);
