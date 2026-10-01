import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

/**
 * THE primary button of the platform, copied from the waitlist's: a solid brand-orange pill with
 * black text (6.3:1, better than white on orange), a soft orange glow that grows on hover, a lighter
 * orange on hover and a darker one when pressed, and a two-tone focus ring. Sign-in, sign-up, the
 * landing pages and the dashboard all use it (the old `bg-action` buttons are restyled to match in
 * `globals.css`).
 */
export const BRAND_BUTTON_CLASS =
  "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-brand-orange font-bold whitespace-nowrap text-brand-black shadow-[0_4px_20px_rgba(255,90,0,0.3)] transition-all duration-500 ease-out select-none touch-manipulation [-webkit-tap-highlight-color:transparent] hover:bg-[#ff6b1a] hover:shadow-[0_6px_24px_rgba(255,90,0,0.45)] active:bg-[#e05200] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-progress disabled:opacity-60 disabled:shadow-none";

const SIZES = { sm: "h-10 px-5 text-sm", md: "h-12 px-6 text-sm", lg: "h-14 px-8 text-base" } as const;

/** A link that looks exactly like the primary button. */
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
    >
      <span className="relative inline-flex items-center justify-center gap-2">{children}</span>
    </Link>
  );
}
