"use client";

import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Breadcrumbs } from "./Breadcrumbs";
import { ConnectionStatus } from "./ConnectionStatus";
import { MenuIcon } from "./icons";
import { UserMenu } from "./UserMenu";

/** Top bar: menu button (phones), breadcrumbs, live-connection state, language, account. */
export function Header({
  user,
  onMenu,
}: {
  user: { name: string; email: string };
  onMenu: () => void;
}) {
  const t = useTranslations("Shell");
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenu}
          aria-label={t("openMenu")}
          aria-haspopup="dialog"
          className="-ml-2 grid size-11 shrink-0 place-items-center rounded-md text-ink-2 hover:text-ink lg:hidden"
        >
          <MenuIcon />
        </button>

        <div className="min-w-0 flex-1">
          <Breadcrumbs />
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <ConnectionStatus />
          <div className="hidden sm:block">
            <LocaleSwitcher />
          </div>
          <UserMenu name={user.name} email={user.email} />
        </div>
      </div>
    </header>
  );
}
