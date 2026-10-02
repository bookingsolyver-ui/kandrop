import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";

export async function MarketingFooter() {
  const t = await getTranslations("Marketing.footer");
  const nav = await getTranslations("Marketing.nav");
  const link = "inline-flex min-h-9 items-center text-sm text-ink-2 hover:text-ink";
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-14 sm:px-6 md:flex-row md:justify-between lg:px-8">
        <div className="max-w-xs">
          <Image src="/logo-kandrop-full.png" alt="Kandrop" width={1024} height={206} className="h-8 w-auto object-contain" />
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">{t("tagline")}</p>
        </div>
        <nav aria-label={t("label")} className="grid grid-cols-2 gap-x-16 gap-y-2 sm:gap-x-24">
          <ul>
            <li>
              <Link href="/" className={link}>
                {nav("home")}
              </Link>
            </li>
            <li>
              <Link href="/#planos" className={link}>
                {nav("plans")}
              </Link>
            </li>
            <li>
              <Link href="/afiliados" className={link}>
                {nav("affiliates")}
              </Link>
            </li>
            <li>
              <Link href="/sobre" className={link}>
                {nav("about")}
              </Link>
            </li>
          </ul>
          <ul>
            <li>
              <Link href="/termos" className={link}>
                {t("terms")}
              </Link>
            </li>
            <li>
              <Link href="/privacidade" className={link}>
                {t("privacy")}
              </Link>
            </li>
            <li>
              <Link href="/entregas" className={link}>
                {t("deliveries")}
              </Link>
            </li>
            <li>
              <Link href="/login" className={link}>
                {nav("login")}
              </Link>
            </li>
            <li>
              <Link href="/register" className={link}>
                {t("register")}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-7xl px-4 py-6 text-[13px] text-ink-muted sm:px-6 lg:px-8">
          {t("copyright", { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  );
}
