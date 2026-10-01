"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { BoxIcon, CartIcon, ChevronDownIcon, MenuBarsIcon, WalletIcon } from "@/components/kai/icons";
import { CloseIcon } from "@/components/shell/icons";
import { ToastProvider } from "@/components/ui/Toast";
import { Link, usePathname } from "@/i18n/navigation";

type NavLabel = "merchants" | "orders" | "finance" | "cashFlow" | "reconciliation" | "courierClose" | "adjustments" | "payouts" | "showcase" | "catalog" | "inventory";
type Leaf = { key: NavLabel; href: string };
type Item =
  | { type: "link"; key: NavLabel; href: string; icon: ReactNode }
  | { type: "group"; key: NavLabel; icon: ReactNode; children: Leaf[] };

const UsersIcon = () => (
  <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const NAV: Item[] = [
  { type: "link", key: "merchants", href: "/admin/lojistas", icon: <UsersIcon /> },
  { type: "link", key: "orders", href: "/admin/encomendas", icon: <CartIcon size={18} /> },
  {
    type: "group",
    key: "finance",
    icon: <WalletIcon size={18} />,
    children: [
      { key: "cashFlow", href: "/admin/financeiro/fluxo-caixa" },
      { key: "reconciliation", href: "/admin/financeiro/conciliacao" },
      { key: "courierClose", href: "/admin/financeiro/fecho-estafetas" },
      { key: "adjustments", href: "/admin/financeiro/ajustes" },
      { key: "payouts", href: "/admin/financeiro/saques" },
    ],
  },
  {
    type: "group",
    key: "showcase",
    icon: <BoxIcon size={18} />,
    children: [
      { key: "catalog", href: "/admin/vitrine/catalogo" },
      { key: "inventory", href: "/admin/vitrine/inventario" },
    ],
  },
];

const activeClass = "bg-brand-orange font-bold text-brand-black shadow-[0_4px_20px_rgba(255,90,0,0.3)]";
const idleClass = "text-[var(--ink-700)] hover:bg-[var(--ink-100)] hover:text-[var(--ink-900)]";

function GroupMenu({ item, onNavigate }: { item: Extract<Item, { type: "group" }>; onNavigate?: () => void }) {
  const t = useTranslations("Admin.nav");
  const pathname = usePathname();
  const inside = item.children.some((c) => pathname === c.href || pathname.startsWith(`${c.href}/`));
  const [open, setOpen] = useState(inside);
  const expanded = open || inside;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={expanded}
        className={`flex w-full items-center gap-3 rounded-[var(--r-md)] px-3 py-2.5 text-left text-sm font-medium transition-all ${
          inside ? "bg-[var(--ink-100)] text-[var(--ink-900)]" : idleClass
        }`}
      >
        {item.icon}
        <span className="flex-1 truncate">{t(item.key)}</span>
        <span className={`text-[var(--ink-500)] transition-transform ${expanded ? "" : "-rotate-90"}`}>
          <ChevronDownIcon size={14} />
        </span>
      </button>
      {expanded && (
        <ul className="mt-0.5 ml-4 flex flex-col gap-0.5 border-l border-[var(--ink-200)] pl-2">
          {item.children.map((c) => {
            const current = pathname === c.href || pathname.startsWith(`${c.href}/`);
            return (
              <li key={c.key}>
                <Link
                  href={c.href}
                  onClick={onNavigate}
                  aria-current={current ? "page" : undefined}
                  className={`flex rounded-[var(--r-md)] px-3 py-2 text-[13px] font-medium transition-all ${current ? activeClass : idleClass}`}
                >
                  {t(c.key)}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("Admin.nav");
  const pathname = usePathname();
  return (
    <nav aria-label={t("label")} className="flex flex-col gap-1 px-3 py-2">
      {NAV.map((item) =>
        item.type === "group" ? (
          <GroupMenu key={item.key} item={item} onNavigate={onNavigate} />
        ) : (
          <Link
            key={item.key}
            href={item.href}
            onClick={onNavigate}
            aria-current={pathname.startsWith(item.href) ? "page" : undefined}
            className={`flex items-center gap-3 rounded-[var(--r-md)] px-3 py-2.5 text-sm font-medium transition-all ${
              pathname.startsWith(item.href) ? activeClass : idleClass
            }`}
          >
            {item.icon}
            <span className="truncate">{t(item.key)}</span>
          </Link>
        )
      )}
    </nav>
  );
}

const Logo = () => (
  <Link href="/admin" aria-label="Kandrop" className="inline-flex items-center gap-2">
    <Image src="/logo-kandrop-full.png" alt="" width={1024} height={206} priority className="h-7 w-auto object-contain" />
    <span className="rounded-full bg-brand-black px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">Admin</span>
  </Link>
);

/** The operator console's frame: its own sidebar (with sub-menus) and header, a drawer on phones. */
export function AdminShell({ user, children }: { user: string; children: ReactNode }) {
  const t = useTranslations("Admin");
  const pathname = usePathname();
  const drawer = useRef<HTMLDialogElement>(null);

  useEffect(() => drawer.current?.close(), [pathname]);

  return (
    <ToastProvider>
      <div className="workspace flex h-screen w-full overflow-hidden bg-[var(--ink-50)]" style={{ background: "var(--ink-0)" }}>
        <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--ink-200)] bg-[var(--ink-0)] lg:flex">
          <div className="border-b border-[var(--ink-200)] p-5">
            <Logo />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <AdminNav />
          </div>
          <div className="border-t border-[var(--ink-200)] p-4">
            <Link href="/dashboard" className="flex h-10 items-center justify-center rounded-full border border-[var(--ink-200)] bg-white text-[13px] font-semibold text-[var(--ink-900)] hover:border-[var(--ink-300)]">
              {t("backToApp")}
            </Link>
          </div>
        </aside>

        <dialog
          ref={drawer}
          aria-label={t("nav.label")}
          onClick={(e) => e.target === drawer.current && drawer.current?.close()}
          className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-72 max-w-[85vw] overflow-y-auto border-r border-[var(--ink-200)] bg-[var(--ink-0)] p-0 text-[var(--ink-900)] backdrop:bg-black/50 lg:hidden"
        >
          <div className="flex items-center justify-between border-b border-[var(--ink-200)] p-4">
            <Logo />
            <button type="button" onClick={() => drawer.current?.close()} aria-label={t("close")} className="grid size-10 place-items-center rounded-full border border-[var(--ink-200)] bg-white">
              <CloseIcon />
            </button>
          </div>
          <AdminNav onNavigate={() => drawer.current?.close()} />
        </dialog>

        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--ink-100)] lg:m-2 lg:ml-0 lg:rounded-xl lg:shadow-sm">
          <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-3 border-b border-[var(--ink-200)] bg-white/85 px-3 backdrop-blur-md sm:px-6">
            <button type="button" onClick={() => drawer.current?.showModal()} aria-label={t("open")} aria-haspopup="dialog" className="grid size-10 place-items-center rounded-full border border-[var(--ink-200)] bg-white lg:hidden">
              <MenuBarsIcon size={18} />
            </button>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.08em] text-[var(--ink-500)] uppercase">{t("console")}</p>
              <p className="truncate text-[15px] font-bold text-[var(--ink-900)]">{user}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden rounded-full bg-[var(--kai-warn-bg)] px-3 py-1 text-[11px] font-bold text-[var(--kai-warn)] sm:inline">{t("sampleData")}</span>
              <LocaleSwitcher className="h-9 cursor-pointer rounded-full border border-[var(--ink-200)] bg-white px-3 text-[13px] font-medium text-[var(--ink-700)]" />
            </div>
          </header>
          <main id="content" tabIndex={-1} className="workspace min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 outline-none sm:p-8" style={{ background: "transparent" }}>
            <div className="mx-auto w-full max-w-[1440px]">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
