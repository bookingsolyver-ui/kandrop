import type { ComponentType } from "react";
import {
  AcademyIcon,
  AffiliatesIcon,
  CatalogIcon,
  CouponIcon,
  CustomersIcon,
  LandingPageIcon,
  LogisticsIcon,
  OrdersIcon,
  OverviewIcon,
  ProductsIcon,
  SettingsIcon,
  SupportIcon,
  UpgradeIcon,
  WalletIcon,
  WhatsAppIcon,
} from "./icons";

export type NavKey =
  | "overview"
  | "wallet"
  | "orders"
  | "vitrineNational"
  | "vitrineInternational"
  | "products"
  | "landingPages"
  | "customers"
  | "coupons"
  | "whatsapp"
  | "logistics"
  | "affiliates"
  | "academy"
  | "support"
  | "settings"
  | "plans";

export type GroupKey = "main" | "dropshipping" | "accelerators" | "other";

export interface NavItem {
  key: NavKey;
  href: string;
  icon: ComponentType<{ size?: number }>;
}

export interface NavGroup {
  key: GroupKey;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    key: "main",
    items: [
      { key: "overview", href: "/dashboard", icon: OverviewIcon },
      { key: "wallet", href: "/dashboard/wallet", icon: WalletIcon },
      { key: "orders", href: "/dashboard/orders", icon: OrdersIcon },
    ],
  },
  {
    key: "dropshipping",
    items: [
      { key: "vitrineNational", href: "/dashboard/vitrine/nacional", icon: CatalogIcon },
      { key: "vitrineInternational", href: "/dashboard/vitrine/internacional", icon: CatalogIcon },
      { key: "products", href: "/dashboard/meus-produtos", icon: ProductsIcon },
      { key: "landingPages", href: "/dashboard/landing-pages", icon: LandingPageIcon },
      { key: "customers", href: "/dashboard/customers", icon: CustomersIcon },
      { key: "coupons", href: "/dashboard/coupons", icon: CouponIcon },
    ],
  },
  {
    key: "accelerators",
    items: [
      { key: "whatsapp", href: "/dashboard/automations", icon: WhatsAppIcon },
      { key: "logistics", href: "/dashboard/logistics", icon: LogisticsIcon },
      { key: "affiliates", href: "/dashboard/affiliates", icon: AffiliatesIcon },
    ],
  },
  {
    key: "other",
    items: [
      { key: "academy", href: "/dashboard/academy", icon: AcademyIcon },
      { key: "support", href: "/dashboard/support", icon: SupportIcon },
      { key: "settings", href: "/dashboard/settings", icon: SettingsIcon },
    ],
  },
];

/** Reachable but not in the menu: where the plan card's "Upgrade" goes. */
export const PLANS_ITEM: NavItem = {
  key: "plans",
  href: "/dashboard/billing",
  icon: UpgradeIcon,
};

export const ALL_NAV_ITEMS: NavItem[] = [...NAV_GROUPS.flatMap((g) => g.items), PLANS_ITEM];

/** URL segment of an item (`landing-pages`), used by the breadcrumbs. */
export const segmentOf = (item: NavItem) => item.href.split("/")[2] ?? "";

/** `/dashboard` is exact; every other item owns its whole subtree (`/dashboard/products/new`). */
export const isCurrent = (item: NavItem, pathname: string) =>
  item.href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
