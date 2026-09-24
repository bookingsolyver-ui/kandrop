import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { BlockedPanel } from "@/components/checkout/StatePanels";
import { CheckoutView } from "@/components/checkout/CheckoutView";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getEnv } from "@/server/config/env";
import { createDemoCheckout, getPublicCheckout } from "@/server/modules/checkout/service";

// Depends on the session in the URL and on live state: never prerender at build time.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Checkout" });
  // A payment page must never be indexed or shared through search results.
  return { title: `${t("title")} — Kandrop`, robots: { index: false, follow: false } };
}

/**
 * Public buyer page. Reached with `?session=<id>` created by the merchant (POST /api/checkout).
 * In sandbox mode, opening `/checkout` bare creates a demo cart so the flow can be tried at once.
 */
export default async function CheckoutPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const sandbox = getEnv().PAYMENTS_MODE === "sandbox";
  const { session } = await searchParams;

  if (!session) {
    if (!sandbox) notFound();
    const demo = createDemoCheckout();
    redirect({ href: { pathname: "/checkout", query: { session: demo.id } }, locale });
  }

  const checkout = session ? getPublicCheckout(session) : null;
  if (!checkout) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4">
        <BlockedPanel reason="notFound" />
      </main>
    );
  }

  return <CheckoutView checkout={checkout} sandbox={sandbox} />;
}
