"use client";

import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { BoxIcon, LogOutIcon, MenuBarsIcon, TrendingUpIcon, WalletIcon } from "@/components/kai/icons";
import { CloseIcon } from "@/components/shell/icons";
import { ToastProvider } from "@/components/ui/Toast";
import { Link, usePathname } from "@/i18n/navigation";
import { useCurrentSupplier } from "@/lib/supplier/store";

const TruckIcon = () => (
  <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 17h4V5H2v12h3" /><path d="M14 8h4l4 4v5h-3" /><circle cx="7.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
  </svg>
);

const NAV = [
  { key: "dashboard", href: "/fornecedor", icon: <TrendingUpIcon size={18} /> },
  { key: "products", href: "/fornecedor/produtos", icon: <BoxIcon size={18} /> },
  { key: "orders", href: "/fornecedor/encomendas", icon: <TruckIcon /> },
  { key: "finance", href: "/fornecedor/financeiro", icon: <WalletIcon size={18} /> },
] as const;

// A neutral, graphite look (not the merchant's orange, not the admin's white) so the portals read as different places.
const active = "bg-[var(--ink-900)] font-semibold text-white shadow-[0_6px_16px_-8px_rgba(0,0,0,0.5)]";
const idle = "font-medium text-[var(--ink-700)] hover:bg-white hover:text-[var(--ink-900)] hover:shadow-[0_1px_2px_rgba(16,16,24,0.06)]";

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("Supplier.nav");
  const pathname = usePathname();
  return (
    <nav aria-label={t("label")} className="flex flex-col gap-1.5 px-4 py-5">
      {NAV.map((item) => {
        const current = item.href === "/fornecedor" ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link key={item.key} href={item.href} onClick={onNavigate} aria-current={current ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition-all duration-150 ${current ? active : idle}`}>
            <span className={current ? "text-white" : "text-[var(--ink-500)]"}>{item.icon}</span>
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}

const Logo = () => (
  <Link href="/fornecedor" aria-label="Kandrop" className="inline-flex items-center">
    <Image src="/logo-kandrop-full.png" alt="" width={1024} height={206} priority className="h-7 w-auto object-contain" />
  </Link>
);

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

/** The signed-in company as a small floating card: avatar, name, e-mail, and the sign-out button. */
function UserCard({ name, email, onLogout, label }: { name: string; email: string; onLogout: () => void; label: string }) {
  return (
    <div className="m-4 rounded-2xl border border-[var(--ink-200)] bg-white p-3.5 shadow-[0_1px_2px_rgba(16,16,24,0.05),0_10px_24px_-14px_rgba(16,16,24,0.18)]">
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--ink-900)] text-[13px] font-bold text-white">{initials(name)}</span>
        <div className="min-w-0">
          <p className="truncate text-sm leading-tight font-semibold text-[var(--ink-900)]" title={name}>{name}</p>
          <p className="mt-0.5 truncate text-[12px] leading-tight text-[var(--ink-500)]" title={email}>{email}</p>
        </div>
      </div>
      <button type="button" onClick={onLogout}
        className="mt-3.5 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--ink-200)] bg-[var(--ink-50)] text-[13px] font-semibold text-[var(--ink-800,var(--ink-900))] transition-colors hover:border-[var(--ink-300)] hover:bg-[var(--ink-100)]">
        <LogOutIcon size={15} />
        {label}
      </button>
    </div>
  );
}

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
        <aside className="hidden w-[17rem] shrink-0 flex-col border-r border-[var(--ink-200)] bg-[var(--ink-100)] lg:flex">
          <div className="flex h-16 shrink-0 items-center px-6"><Logo /></div>
          <p className="px-7 pt-2 text-[11px] font-semibold tracking-[0.08em] text-[var(--ink-500)] uppercase">{t("console")}</p>
          <div className="min-h-0 flex-1 overflow-y-auto"><Nav /></div>
          <UserCard name={supplier.name} email={supplier.email} onLogout={logout} label={t("logout")} />
        </aside>

        <dialog ref={drawer} aria-label={t("menu")} onClick={(e) => e.target === drawer.current && drawer.current?.close()}
          className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-80 max-w-[88vw] overflow-hidden border-r border-[var(--ink-200)] bg-[var(--ink-100)] p-0 text-[var(--ink-900)] backdrop:bg-black/50 open:flex open:flex-col lg:hidden">
          <div className="flex h-16 shrink-0 items-center justify-between px-5">
            <Logo />
            <button type="button" onClick={() => drawer.current?.close()} aria-label={t("close")} className="grid size-10 place-items-center rounded-full border border-[var(--ink-200)] bg-white"><CloseIcon /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto"><Nav onNavigate={() => drawer.current?.close()} /></div>
          <UserCard name={supplier.name} email={supplier.email} onLogout={logout} label={t("logout")} />
        </dialog>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white lg:m-2 lg:ml-0 lg:rounded-xl lg:shadow-sm">
          <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-[var(--ink-200)] bg-white px-4 sm:px-8">
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
          <main id="content" tabIndex={-1} className="workspace min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 outline-none sm:px-8 sm:py-9 lg:px-10" style={{ background: "transparent" }}>
            <div className="mx-auto w-full max-w-[1200px]">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
