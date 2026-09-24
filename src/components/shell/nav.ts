import type { ComponentType } from "react";
import {
  AcademyIcon,
  AffiliatesIcon,
  CatalogIcon,
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
  | "catalog"
  | "products"
  | "landingPages"
  | "customers"
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
  /** Not built yet: the page says so, and the menu marks it "Soon" before you click. */
  soon?: boolean;
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
      { key: "catalog", href: "/dashboard/catalog", icon: CatalogIcon, soon: true },
      { key: "products", href: "/dashboard/products", icon: ProductsIcon },
      { key: "landingPages", href: "/dashboard/landing-pages", icon: LandingPageIcon, soon: true },
      { key: "customers", href: "/dashboard/customers", icon: CustomersIcon, soon: true },
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
      { key: "support", href: "/dashboard/support", icon: SupportIcon, soon: true },
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

/** URL segment of an item (`landing-pages`), used by the breadcrumbs and the "soon" route. */
export const segmentOf = (item: NavItem) => item.href.split("/")[2] ?? "";

/** The areas on the roadmap that have a "coming soon" page (and a sentence in `ComingSoon.features`). */
export type SoonKey = "catalog" | "landingPages" | "customers" | "support";

export const SOON_ITEMS = ALL_NAV_ITEMS.filter(
  (item): item is NavItem & { key: SoonKey } => item.soon === true
);

/** `/dashboard` is exact; every other item owns its whole subtree (`/dashboard/products/new`). */
export const isCurrent = (item: NavItem, pathname: string) =>
  item.href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
