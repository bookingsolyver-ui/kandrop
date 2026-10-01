"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { BrandLink } from "@/components/ui/BrandButton";
import { CloseIcon, MenuIcon } from "@/components/shell/icons";
import { Link, usePathname } from "@/i18n/navigation";

const LINKS = [
  { key: "home", href: "/" },
  { key: "plans", href: "/#planos" },
  { key: "affiliates", href: "/afiliados" },
  { key: "about", href: "/sobre" },
  { key: "suppliers", href: "/fornecedor/registo" },
] as const;

/** The supplier entry point: a darker label and a small "B2B" tag, so it reads apart from the plain links. */
const B2B = (
  <span aria-hidden className="ml-2 rounded-md bg-[var(--ink-900)] px-1.5 py-0.5 text-[10px] leading-none font-bold tracking-wide text-white">
    B2B
  </span>
);

const LOCALE_PILL =
  "h-10 cursor-pointer rounded-full border border-[var(--ink-200)] bg-white px-3 text-[13px] font-medium text-[var(--ink-700)] transition-all hover:border-[var(--ink-300)] hover:text-[var(--ink-900)]";

const LOGO = (
  <Image
    src="/logo-kandrop-full.png"
    alt=""
    width={1024}
    height={206}
    priority
    className="h-6 w-auto object-contain min-[400px]:h-7 md:h-8"
  />
);

/**
 * Top navigation: wordmark, five links, "Sign in" and the highlighted "Get started". On phones
 * the links and the language selector move into a sheet (native `<dialog>`: focus trap, Esc).
 */
export function MarketingNav() {
  const t = useTranslations("Marketing.nav");
  const pathname = usePathname();
  const sheet = useRef<HTMLDialogElement>(null);
  const close = () => sheet.current?.close();

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const onChange = () => query.matches && sheet.current?.close();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const isCurrent = (href: string) => (href === "/" ? pathname === "/" : pathname === href);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--ink-200)] bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 md:gap-10 lg:px-8">
        <Link href="/" aria-label="Kandrop" className="inline-flex shrink-0 items-center rounded-md">
          {LOGO}
        </Link>

        <nav aria-label={t("label")} className="hidden md:block">
          <ul className="flex items-center gap-2">
            {LINKS.map(({ key, href }) => (
              <li key={key}>
                <Link
                  href={href}
                  aria-current={isCurrent(href) ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-medium transition-colors ${
                    isCurrent(href)
                      ? "bg-[var(--ink-100)] text-[var(--ink-900)]"
                      : key === "suppliers"
                        ? "font-semibold text-[var(--ink-900)] hover:bg-[var(--ink-100)]"
                        : "text-[var(--ink-600)] hover:bg-[var(--ink-100)] hover:text-[var(--ink-900)]"
                  }`}
                >
                  {t(key)}
                  {key === "suppliers" && B2B}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 md:gap-3">
          <div className="hidden md:block">
            <LocaleSwitcher className={LOCALE_PILL} />
          </div>
          {/* A wrapper, not `hidden` on the link itself: the button's own `inline-flex` would win. */}
          <div className="hidden md:block">
            <BrandLink href="/login" size="sm">
              {t("login")}
            </BrandLink>
          </div>
          <BrandLink href="/register" size="sm">
            {t("start")}
          </BrandLink>
          <button
            type="button"
            onClick={() => sheet.current?.showModal()}
            aria-label={t("open")}
            aria-haspopup="dialog"
            className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--ink-200)] bg-white text-[var(--ink-700)] hover:text-[var(--ink-900)] md:hidden"
          >
            <MenuIcon />
          </button>
        </div>
      </div>

      <dialog
        ref={sheet}
        aria-label={t("label")}
        onClick={(e) => e.target === sheet.current && close()}
        className="fixed inset-x-0 top-0 m-0 max-h-dvh w-full max-w-none overflow-y-auto border-b border-line bg-page p-0 text-ink backdrop:bg-black/60 md:hidden"
      >
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <span className="inline-flex items-center">{LOGO}</span>
          <button
            type="button"
            onClick={close}
            aria-label={t("close")}
            className="grid size-11 place-items-center rounded-md text-ink-2 hover:text-ink"
          >
            <CloseIcon />
          </button>
        </div>
        <nav aria-label={t("label")} className="px-4 pb-4 sm:px-6">
          <ul className="divide-y divide-line border-y border-line">
            {LINKS.map(({ key, href }) => (
              <li key={key}>
                <Link
                  href={href}
                  onClick={close}
                  aria-current={isCurrent(href) ? "page" : undefined}
                  className="flex min-h-14 items-center font-serif text-xl"
                >
                  {t(key)}
                  {key === "suppliers" && B2B}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-col gap-3">
            <BrandLink href="/register" onClick={close} size="md" className="text-base">
              {t("start")}
            </BrandLink>
            <BrandLink href="/login" onClick={close} size="md" className="text-base">
              {t("login")}
            </BrandLink>
            <div className="pt-1">
              <LocaleSwitcher className={LOCALE_PILL} />
            </div>
          </div>
        </nav>
      </dialog>
    </header>
  );
}
