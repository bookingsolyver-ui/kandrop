import type { ReactNode } from "react";

function Icon({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 22 22"
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

export const LockIcon = ({ size = 14 }: { size?: number }) => (
  <Icon size={size}>
    <rect x="4.5" y="9.5" width="13" height="9" rx="2" />
    <path d="M7.5 9.5V7a3.5 3.5 0 0 1 7 0v2.5" />
  </Icon>
);

export const PhoneIcon = ({ size = 22 }: { size?: number }) => (
  <Icon size={size}>
    <rect x="6.5" y="2.5" width="9" height="17" rx="2" />
    <path d="M10 16.5h2" />
  </Icon>
);

export const CardIcon = ({ size = 22 }: { size?: number }) => (
  <Icon size={size}>
    <rect x="2.5" y="5" width="17" height="12" rx="2" />
    <path d="M2.5 9h17M6 13.5h3" />
  </Icon>
);
