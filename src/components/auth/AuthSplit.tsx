import Image from "next/image";
import type { ReactNode } from "react";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export const DARK = "linear-gradient(135deg, #000000 0%, #141414 45%, #2e2e2e 100%)";
const DOTS = "radial-gradient(circle, rgba(255,255,255,0.55) 1px, transparent 1px)";
const GLOW = (a: number, b: number) =>
  `radial-gradient(circle, rgba(255, 90, 0, ${a}) 0%, rgba(255, 90, 0, ${b}) 45%, transparent 75%)`;

export function ShieldCheckIcon() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
export function CheckCircleIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

/** The two trust badges under the form. */
export function TrustStrip({ secure, support }: { secure: string; support: string }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:mt-5">
      <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground">
        <ShieldCheckIcon />
        {secure}
      </span>
      <span aria-hidden className="hidden h-3 w-px bg-border sm:block" />
      <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground">
        <CheckCircleIcon className="text-emerald-600" />
        {support}
      </span>
    </div>
  );
}

/**
 * The split screen of sign-in and sign-up: the white side with the logo, the language and the form
 * (`children`), and the dark promo side (`aside`). On phones the promo becomes a compact hero on top.
 */
export function AuthSplit({
  tag,
  mobileTitle,
  mobileLink,
  topLink,
  aside,
  children,
}: {
  tag: string;
  mobileTitle: ReactNode;
  /** The short link in the phone hero (e.g. "Create account →"). */
  mobileLink: ReactNode;
  /** The prompt + link at the top of the white side (e.g. "No account? Sign up"). */
  topLink: ReactNode;
  aside: ReactNode;
  children: ReactNode;
}) {
  return (
    // `workspace`: the light tokens, whatever the device's colour scheme.
    <div className="workspace relative flex min-h-screen w-full" style={{ background: "#fff" }}>
      <div className="relative flex w-full flex-col lg:w-1/2">
        <div className="relative overflow-hidden lg:hidden" style={{ background: DARK }}>
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.10]" style={{ backgroundImage: DOTS, backgroundSize: "22px 22px" }} />
          <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-[320px] w-[320px] rounded-full" style={{ background: GLOW(0.55, 0.18), filter: "blur(60px)" }} />
          <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 h-[300px] w-[300px] rounded-full" style={{ background: GLOW(0.45, 0.12), filter: "blur(70px)" }} />
          <div className="relative z-10 px-5 pt-7 pb-16 sm:px-8 sm:pt-9 sm:pb-20">
            <div className="flex items-center justify-between">
              <Image src="/logo-kandrop-full.png" alt="Kandrop" width={1024} height={206} priority className="h-8 w-auto brightness-0 invert" />
              {mobileLink}
            </div>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium tracking-wide text-white/85 backdrop-blur">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              {tag}
            </div>
            <h2 className="mt-3 text-2xl leading-[1.1] font-bold text-white sm:text-3xl">{mobileTitle}</h2>
          </div>
        </div>

        <div aria-hidden className="pointer-events-none absolute inset-0 hidden opacity-[0.5] lg:block" style={{ backgroundImage: "radial-gradient(circle, rgba(15,15,20,0.08) 1px, transparent 1px)", backgroundSize: "22px 22px", maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)" }} />
        <div aria-hidden className="pointer-events-none absolute top-0 left-1/2 -z-0 hidden h-[500px] w-[700px] -translate-x-1/2 opacity-[0.10] lg:block" style={{ background: "radial-gradient(ellipse at top, rgba(255,90,0,0.55) 0%, rgba(255,90,0,0.15) 40%, transparent 70%)", filter: "blur(80px)" }} />

        <header className="relative z-10 hidden items-center justify-between px-6 py-5 sm:px-10 sm:py-6 lg:flex lg:px-14">
          <Image src="/logo-kandrop-full.png" alt="Kandrop" width={1024} height={206} priority className="h-9 w-auto" />
          <div className="flex items-center gap-4">
            <LocaleSwitcher className="h-9 cursor-pointer rounded-full border border-border bg-white px-3 text-[13px] font-medium text-foreground" />
            <span className="hidden text-sm font-medium text-foreground sm:inline-flex">{topLink}</span>
          </div>
        </header>

        <main className="relative z-10 flex flex-1 items-start justify-center px-4 pb-8 sm:items-center sm:px-10 sm:py-8 lg:items-center lg:px-14">
          <div className="-mt-10 w-full max-w-md sm:-mt-14 lg:mt-0">
            <div className="animate-fade-in">{children}</div>
          </div>
        </main>
      </div>

      <aside className="relative hidden overflow-hidden lg:flex lg:w-1/2" style={{ background: DARK }}>
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.10]" style={{ backgroundImage: DOTS, backgroundSize: "26px 26px" }} />
        <div aria-hidden className="pointer-events-none absolute -top-32 -right-32 h-[480px] w-[480px] rounded-full" style={{ background: GLOW(0.55, 0.18), filter: "blur(70px)" }} />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-32 h-[420px] w-[420px] rounded-full" style={{ background: GLOW(0.45, 0.12), filter: "blur(80px)" }} />
        <div className="relative z-10 flex h-full w-full flex-col justify-between p-12 xl:p-16">{aside}</div>
      </aside>
    </div>
  );
}
