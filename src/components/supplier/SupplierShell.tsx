"use client";

import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { BoxIcon, MenuBarsIcon, TrendingUpIcon, WalletIcon } from "@/components/kai/icons";
import { CloseIcon } from "@/components/shell/icons";
import { ToastProvider } from "@/components/ui/Toast";
import { Link, usePathname } from "@/i18n/navigation";
import { useCurrentSupplier } from "@/lib/supplier/store";

const NAV = [
  { key: "dashboard", href: "/fornecedor", icon: <TrendingUpIcon size={18} /> },
  { key: "products", href: "/fornecedor/produtos", icon: <BoxIcon size={18} /> },
  { key: "finance", href: "/fornecedor/financeiro", icon: <WalletIcon size={18} /> },
] as const;

// A neutral, graphite look (not the merchant's orange, not the admin's white) so the portals read as different places.
const active = "bg-[var(--ink-900)] font-semibold text-white";
const idle = "text-[var(--ink-700)] hover:bg-[var(--ink-200)] hover:text-[var(--ink-900)]";

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("Supplier.nav");
  const pathname = usePathname();
  return (
    <nav aria-label={t("label")} className="flex flex-col gap-1 px-3 py-3">
      {NAV.map((item) => {
        const current = item.href === "/fornecedor" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link key={item.key} href={item.href} onClick={onNavigate} aria-current={current ? "page" : undefined}
            className={`flex items-center gap-3 rounded-[var(--r-md)] px-3 py-2.5 text-sm transition-all ${current ? active : idle}`}>
            {item.icon}
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}

const Logo = () => (
  <Link href="/fornecedor" aria-label="Kandrop" className="inline-flex items-center gap-2">
    <Image src="/logo-kandrop-full.png" alt="" width={1024} height={206} priority className="h-7 w-auto object-contain" />
    <span className="rounded-full bg-[var(--ink-900)] px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">Fornecedor</span>
  </Link>
);

/** The supplier portal's frame: graphite sidebar and header with the company (the signed-in gate is the server's: proxy + layout). */
export function SupplierShell({ children }: { children: ReactNode }) {
  const t = useTranslations("Supplier.shell");
  const locale = useLocale();
  const pathname = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);
  const { supplier } = useCurrentSupplier();

  useEffect(() => drawer.current?.close(), [pathname]);
  if (!supplier) return <div className="min-h-screen bg-[var(--ink-100)]" aria-busy="true" />;

  /** The server clears the session cookie; then a full page load (drops every client-side cache). */
  const logout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) return;
    } catch {
      return;
    }
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/${locale}/fornecedor/login`;
  };

  return (
    <ToastProvider>
      <div className="workspace flex h-screen w-full overflow-hidden" style={{ background: "var(--ink-100)" }}>
        <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--ink-200)] bg-[var(--ink-100)] lg:flex">
          <div className="border-b border-[var(--ink-200)] p-5"><Logo /></div>
          <div className="min-h-0 flex-1 overflow-y-auto"><Nav /></div>
          <div className="border-t border-[var(--ink-200)] p-4">
            <p className="truncate text-sm font-semibold text-[var(--ink-900)]">{supplier.name}</p>
            <p className="truncate text-[12px] text-[var(--ink-500)]">{supplier.email}</p>
            <button type="button" onClick={logout} className="mt-3 h-10 w-full rounded-full border border-[var(--ink-300)] bg-white text-[13px] font-semibold text-[var(--ink-900)] hover:border-[var(--ink-500)]">{t("logout")}</button>
          </div>
        </aside>

        <dialog ref={drawer} aria-label={t("menu")} onClick={(e) => e.target === drawer.current && drawer.current?.close()}
          className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-72 max-w-[85vw] overflow-y-auto border-r border-[var(--ink-200)] bg-[var(--ink-100)] p-0 text-[var(--ink-900)] backdrop:bg-black/50 lg:hidden">
          <div className="flex items-center justify-between border-b border-[var(--ink-200)] p-4">
            <Logo />
            <button type="button" onClick={() => drawer.current?.close()} aria-label={t("close")} className="grid size-10 place-items-center rounded-full border border-[var(--ink-300)] bg-white"><CloseIcon /></button>
          </div>
          <Nav onNavigate={() => drawer.current?.close()} />
          <div className="border-t border-[var(--ink-200)] p-4">
            <button type="button" onClick={logout} className="h-10 w-full rounded-full border border-[var(--ink-300)] bg-white text-[13px] font-semibold">{t("logout")}</button>
          </div>
        </dialog>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white lg:m-2 lg:ml-0 lg:rounded-xl lg:shadow-sm">
          <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-[var(--ink-200)] bg-white px-3 sm:px-6">
            <button type="button" onClick={() => drawer.current?.showModal()} aria-label={t("menu")} aria-haspopup="dialog" className="grid size-10 place-items-center rounded-full border border-[var(--ink-200)] bg-white lg:hidden"><MenuBarsIcon size={18} /></button>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--ink-500)] uppercase">{t("console")}</p>
              <p className="truncate text-[15px] font-bold text-[var(--ink-900)]">{supplier.name}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className={`hidden rounded-full px-3 py-1 text-[11px] font-bold sm:inline ${supplier.status === "active" ? "bg-[var(--kai-success-bg)] text-[var(--kai-success)]" : "bg-[var(--kai-warn-bg)] text-[var(--kai-warn)]"}`}>
                {t(supplier.status === "active" ? "statusActive" : "statusReview")}
              </span>
              <LocaleSwitcher className="h-9 cursor-pointer rounded-full border border-[var(--ink-200)] bg-white px-3 text-[13px] font-medium text-[var(--ink-700)]" />
            </div>
          </header>
          <main id="content" tabIndex={-1} className="workspace min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 outline-none sm:p-8" style={{ background: "transparent" }}>
            <div className="mx-auto w-full max-w-[1280px]">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
