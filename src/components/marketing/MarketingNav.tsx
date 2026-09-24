"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { CloseIcon, MenuIcon } from "@/components/shell/icons";
import { Link, usePathname } from "@/i18n/navigation";

const LINKS = [
  { key: "home", href: "/" },
  { key: "plans", href: "/#planos" },
  { key: "affiliates", href: "/afiliados" },
  { key: "about", href: "/sobre" },
] as const;

const cta =
  "inline-flex h-10 items-center justify-center rounded-md bg-accent px-5 text-sm font-semibold text-on-action transition-opacity hover:opacity-90";

/**
 * Top navigation: wordmark, four links, "Sign in" and the highlighted "Get started". On phones
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
    <header className="sticky top-0 z-40 border-b border-line bg-page">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Kandrop"
          className="font-serif text-2xl font-semibold tracking-tight text-ink"
        >
          Kandrop
        </Link>

        <nav aria-label={t("label")} className="hidden md:block">
          <ul className="flex items-center gap-1">
            {LINKS.map(({ key, href }) => (
              <li key={key}>
                <Link
                  href={href}
                  aria-current={isCurrent(href) ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center rounded-md px-3 text-sm transition-colors ${
                    isCurrent(href) ? "text-ink" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <div className="hidden md:block">
            <LocaleSwitcher />
          </div>
          <Link
            href="/login"
            className="hidden min-h-10 items-center rounded-md px-3 text-sm text-ink-2 hover:text-ink sm:inline-flex"
          >
            {t("login")}
          </Link>
          <Link href="/register" className={cta}>
            {t("start")}
          </Link>
          <button
            type="button"
            onClick={() => sheet.current?.showModal()}
            aria-label={t("open")}
            aria-haspopup="dialog"
            className="grid size-11 place-items-center rounded-md text-ink-2 hover:text-ink md:hidden"
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
          <span className="font-serif text-2xl font-semibold tracking-tight">Kandrop</span>
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
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-col gap-3">
            <Link href="/register" onClick={close} className={`${cta} h-12 text-base`}>
              {t("start")}
            </Link>
            <Link
              href="/login"
              onClick={close}
              className="inline-flex h-12 items-center justify-center rounded-md border border-field text-base font-medium hover:bg-ink/5"
            >
              {t("login")}
            </Link>
            <div className="pt-1">
              <LocaleSwitcher />
            </div>
          </div>
        </nav>
      </dialog>
    </header>
  );
}
