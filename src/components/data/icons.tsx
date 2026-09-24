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

export const SearchIcon = ({ size = 16 }: P) => (
  <Icon size={size}>
    <circle cx="7" cy="7" r="4.5" />
    <path d="m10.5 10.5 3 3" />
  </Icon>
);
export const CloseIcon = ({ size = 16 }: P) => (
  <Icon size={size}>
    <path d="m4 4 8 8M12 4l-8 8" />
  </Icon>
);
export const AlertIcon = ({ size = 14 }: P) => (
  <Icon size={size}>
    <circle cx="8" cy="8" r="6.25" />
    <path d="M8 4.75v3.6M8 10.9v.01" />
  </Icon>
);
/** Shows which way a column is sorted; dimmed arrows when it is not. */
export function SortIcon({ dir }: { dir: "asc" | "desc" | null }) {
  return (
    <svg
      aria-hidden
      width="10"
      height="14"
      viewBox="0 0 10 14"
      fill="currentColor"
      className="shrink-0"
    >
      <path d="M5 1 9 6H1z" opacity={dir === "asc" ? 1 : 0.3} />
      <path d="M5 13 1 8h8z" opacity={dir === "desc" ? 1 : 0.3} />
    </svg>
  );
}
