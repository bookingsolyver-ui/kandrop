import type { ReactNode } from "react";

function Icon({ size, children }: { size: number; children: ReactNode }) {
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

export const OverviewIcon = ({ size = 20 }: P) => (
  <Icon size={size}>
    <rect x="2.5" y="2.5" width="6" height="8" rx="1.25" />
    <rect x="11.5" y="2.5" width="6" height="4.5" rx="1.25" />
    <rect x="11.5" y="10" width="6" height="7.5" rx="1.25" />
    <rect x="2.5" y="13.5" width="6" height="4" rx="1.25" />
  </Icon>
);
export const ProductsIcon = ({ size = 20 }: P) => (
  <Icon size={size}>
    <path d="M10 2.5 16.5 6v8L10 17.5 3.5 14V6z" />
    <path d="M3.75 6.1 10 9.5l6.25-3.4M10 9.5v8" />
  </Icon>
);
export const OrdersIcon = ({ size = 20 }: P) => (
  <Icon size={size}>
    <path d="M4.5 2.5h11v15l-2.75-1.75L10 17.5l-2.75-1.75L4.5 17.5z" />
    <path d="M7.5 7h5M7.5 10.5h5" />
  </Icon>
);
export const SettingsIcon = ({ size = 20 }: P) => (
  <Icon size={size}>
    <path d="M3 6h7M14 6h3M3 14h3M10 14h7" />
    <circle cx="12" cy="6" r="2" />
    <circle cx="8" cy="14" r="2" />
  </Icon>
);
export const PayoutsIcon = ({ size = 20 }: P) => (
  <Icon size={size}>
    <path d="M2.5 8 10 3l7.5 5M4 8.5V15M8 8.5V15M12 8.5V15M16 8.5V15M2.5 17h15" />
  </Icon>
);
export const MenuIcon = ({ size = 20 }: P) => (
  <Icon size={size}>
    <path d="M3 5.5h14M3 10h14M3 14.5h14" />
  </Icon>
);
export const CloseIcon = ({ size = 20 }: P) => (
  <Icon size={size}>
    <path d="m5 5 10 10M15 5 5 15" />
  </Icon>
);
/** Points left; the collapse button rotates it once the sidebar is a rail. */
export const CollapseIcon = ({ size = 20 }: P) => (
  <Icon size={size}>
    <path d="m11.5 5-5 5 5 5M16 5l-5 5 5 5" />
  </Icon>
);
export const ChevronIcon = ({ size = 14 }: P) => (
  <Icon size={size}>
    <path d="m7.5 4.5 5.5 5.5-5.5 5.5" />
  </Icon>
);
export const LogoutIcon = ({ size = 18 }: P) => (
  <Icon size={size}>
    <path d="M8 3.5H4.5v13H8M12 6.5 15.5 10 12 13.5M15.5 10H8" />
  </Icon>
);

export const WalletIcon = ({ size = 20 }: P) => (
  <Icon size={size}>
    <path d="M3 6.5A2 2 0 0 1 5 4.5h9.5v2.5" />
    <rect x="3" y="6.5" width="14" height="10" rx="2" />
    <path d="M13 11.5h4v2.5h-4a1.25 1.25 0 0 1 0-2.5z" />
  </Icon>
);
/** Premium B2B catalogue: a cut stone. */
export const CatalogIcon = ({ size = 20 }: P) => (
  <Icon size={size}>
    <path d="M6 3.5h8l3 4-7 9-7-9z" />
    <path d="M3 7.5h14M8 3.5l-1.5 4L10 16.5l3.5-9L12 3.5" />
  </Icon>
);
export const LandingPageIcon = ({ size = 20 }: P) => (
  <Icon size={size}>
    <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
    <path d="M2.5 7h15M6 10.5h5M6 13h3" />
    <rect x="12" y="10" width="3" height="3.5" rx=".75" />
  </Icon>
);
export const CustomersIcon = ({ size = 20 }: P) => (
  <Icon size={size}>
    <circle cx="8" cy="7" r="2.75" />
    <path d="M2.5 16.5c.4-2.8 2.6-4.5 5.5-4.5s5.1 1.7 5.5 4.5" />
    <path d="M13 4.6a2.6 2.6 0 0 1 0 4.8M14.5 12.3c1.6.5 2.7 1.9 3 4.2" />
  </Icon>
);
/** WhatsApp automations: a speech bubble with a spark. */
export const WhatsAppIcon = ({ size = 20 }: P) => (
  <Icon size={size}>
    <path d="M3 16.5 4.2 13A6.5 6.5 0 1 1 7 15.8z" />
    <path d="m10.6 6.6-2 3.2h2.6l-1.6 3" />
  </Icon>
);
export const LogisticsIcon = ({ size = 20 }: P) => (
  <Icon size={size}>
    <path d="M2.5 5.5h9v8h-9zM11.5 8.5h3l2.5 2.5v2.5h-5.5" />
    <circle cx="6" cy="14.5" r="1.6" />
    <circle cx="14" cy="14.5" r="1.6" />
  </Icon>
);
/** Affiliates: one node sharing out to two others. */
export const AffiliatesIcon = ({ size = 20 }: P) => (
  <Icon size={size}>
    <circle cx="10" cy="5" r="2.25" />
    <circle cx="4.75" cy="14.5" r="2.25" />
    <circle cx="15.25" cy="14.5" r="2.25" />
    <path d="m8.9 7 -3 5.4M11.1 7l3 5.4M7 14.5h6" />
  </Icon>
);
export const AcademyIcon = ({ size = 20 }: P) => (
  <Icon size={size}>
    <path d="m10 4-8 3.5L10 11l8-3.5z" />
    <path d="M5.5 9.3v3.4c0 1 2 2.3 4.5 2.3s4.5-1.3 4.5-2.3V9.3M18 7.5v4.5" />
  </Icon>
);
export const SupportIcon = ({ size = 20 }: P) => (
  <Icon size={size}>
    <circle cx="10" cy="10" r="7" />
    <circle cx="10" cy="10" r="2.75" />
    <path d="m5.1 5.1 2.9 2.9M12 12l2.9 2.9M14.9 5.1 12 8M8 12l-2.9 2.9" />
  </Icon>
);
export const UpgradeIcon = ({ size = 20 }: P) => (
  <Icon size={size}>
    <path d="M10 16.5v-12M5 9.5l5-5 5 5" />
  </Icon>
);

export const CartIcon = ({ size = 20 }: P) => (
  <Icon size={size}>
    <path d="M2.5 3.5h2.2l1.6 8.2h8.1l1.6-5.9H5.4" />
    <circle cx="8" cy="15.5" r="1.3" />
    <circle cx="14" cy="15.5" r="1.3" />
  </Icon>
);
