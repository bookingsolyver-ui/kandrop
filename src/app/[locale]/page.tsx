import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Link } from "@/i18n/navigation";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("Home");
  const common = await getTranslations("Common");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-6">
      <div className="flex items-center justify-between">
        <span className="font-semibold tracking-tight text-brand">{common("appName")}</span>
        <LocaleSwitcher />
      </div>
      <p className="text-sm uppercase tracking-widest text-ink-muted">{t("eyebrow")}</p>
      <h1 className="text-4xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-lg text-ink-muted">{t("subtitle")}</p>
      <Link href="/dashboard" className="w-fit rounded-md bg-brand px-5 py-2.5 text-white">
        {t("cta")}
      </Link>
    </main>
  );
}
