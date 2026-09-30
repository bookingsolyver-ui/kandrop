import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

/** The brand gradient of the primary button (sign-in, landing page): light → main → dark orange. */
export const BRAND_GRADIENT = "linear-gradient(135deg, #ff7e2e 0%, #ff5a00 50%, #d94c00 100%)";

/** Everything that makes the primary button "the" button: shape, glow shadow, focus ring, shimmer. */
export const BRAND_BUTTON_CLASS =
  "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-2 font-semibold tracking-wide whitespace-nowrap text-white shadow-[0_6px_18px_-6px_rgba(255,90,0,0.6)] transition-all outline-none hover:shadow-[0_10px_24px_-6px_rgba(255,90,0,0.7)] focus-visible:ring-[3px] focus-visible:ring-primary/40 disabled:cursor-progress disabled:opacity-60 disabled:shadow-none";

/** The light sweep that crosses the button on hover. */
export const BrandShimmer = () => (
  <span
    aria-hidden
    className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
  />
);

const SIZES = { sm: "h-10 px-5 text-sm", md: "h-12 text-sm", lg: "h-14 px-8 text-base" } as const;

/** A link that looks exactly like the sign-in button. */
export function BrandLink({
  href,
  size = "md",
  className = "",
  onClick,
  children,
}: {
  href: string;
  size?: keyof typeof SIZES;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`${BRAND_BUTTON_CLASS} ${SIZES[size]} ${className}`}
      style={{ background: BRAND_GRADIENT }}
    >
      <BrandShimmer />
      <span className="relative inline-flex items-center justify-center gap-2">{children}</span>
    </Link>
  );
}
