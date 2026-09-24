"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export function LocaleSwitcher() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  return (
    <label className="text-sm text-ink-muted">
      <span className="sr-only">{t("Common.language")}</span>
      <select
        value={locale}
        onChange={(e) => router.replace({ pathname, params } as never, { locale: e.target.value as Locale })}
        className="rounded-md border border-line bg-surface px-2 py-1"
      >
        {routing.locales.map((l) => (
          <option key={l} value={l}>
            {t(`Locales.${l}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
