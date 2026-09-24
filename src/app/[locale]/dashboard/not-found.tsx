import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/**
 * A missing page or product inside the merchant area. Rendered *inside* the dashboard layout, so
 * the sidebar and header stay: without this file Next.js falls back to the root 404 and the
 * whole shell disappears.
 */
export default async function DashboardNotFound() {
  const t = await getTranslations("Shell.notFound");
  return (
    <main className="max-w-xl py-6">
      <p className="text-[11px] font-medium tracking-[0.18em] text-ink-muted uppercase">404</p>
      <h1 className="mt-3 font-serif text-[2.25rem] leading-[1.05] font-normal tracking-[-0.02em] sm:text-[2.75rem]">
        {t("title")}
      </h1>
      <p className="mt-3 text-base text-ink-2">{t("body")}</p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex h-12 items-center rounded-md bg-action px-6 text-sm font-semibold text-on-action hover:opacity-90"
      >
        {t("back")}
      </Link>
    </main>
  );
}
