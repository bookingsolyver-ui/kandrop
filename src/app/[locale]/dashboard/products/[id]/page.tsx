import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/products/ProductForm";
import { Link, redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { readSession } from "@/server/auth/session";
import { ApiError } from "@/server/http/errors";
import { getProduct } from "@/server/modules/products/service";
import { PageTransition } from "@/components/shell/PageTransition";

// Depends on the session and on live catalogue state: never prerender.
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Catalog.form" });
  return { title: `${t("editTitle")} — Kandrop` };
}

export default async function EditProductPage({ params }: Props) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const session = await readSession();
  if (!session) redirect({ href: "/login", locale });

  // A missing product and another store's product look the same: a 404.
  const product = await getProduct(session!, id).catch((err: unknown) => {
    if (err instanceof ApiError && err.code === "not_found") notFound();
    throw err;
  });
  const t = await getTranslations("Catalog.form");

  return (
    <PageTransition>
      <main>
        <header className="mb-8 max-w-2xl">
          <Link
            href="/dashboard/products"
            className="inline-flex min-h-11 items-center text-sm text-ink-2 underline underline-offset-4 hover:text-ink"
          >
            {t("back")}
          </Link>
          <h1 className="mt-2 font-serif text-[2.25rem] leading-[1.05] font-normal tracking-[-0.02em] sm:text-[2.75rem]">
            {product.title}
          </h1>
          <p className="mt-3 text-base text-ink-2">{t("editSubtitle")}</p>
        </header>
        <ProductForm product={product} />
      </main>
    </PageTransition>
  );
}
