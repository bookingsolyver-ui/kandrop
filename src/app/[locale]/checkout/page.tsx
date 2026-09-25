import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { BlockedPanel } from "@/components/checkout/StatePanels";
import { CheckoutView } from "@/components/checkout/CheckoutView";
import { SubscribeFlow } from "@/components/subscribe/SubscribeFlow";
import { hasAccess } from "@/server/auth/access";
import { readSession } from "@/server/auth/session";
import { getMe } from "@/server/modules/auth/service";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getEnv } from "@/server/config/env";
import { createDemoCheckout, getPublicCheckout } from "@/server/modules/checkout/service";

// Depends on the session in the URL and on live state: never prerender at build time.
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session?: string; demo?: string }>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const { session, demo } = await searchParams;
  if (!session && demo === undefined) {
    // The payment gate's page (a signed-in account with nothing paid): not for search engines.
    const s = await getTranslations({ locale, namespace: "Subscribe.meta" });
    return {
      title: `${s("title")} — Kandrop`,
      description: s("description"),
      robots: { index: false, follow: false },
    };
  }
  const t = await getTranslations({ locale, namespace: "Checkout" });
  // A payment page must never be indexed or shared through search results.
  return { title: `${t("title")} — Kandrop`, robots: { index: false, follow: false } };
}

/**
 * Two things live at this address:
 *  - `/checkout` (no parameters): the PAYMENT GATE'S page. A signed-in account with nothing paid
 *    lands here (after sign-up, after a sign-in, or when it tries to open the dashboard), chooses a
 *    plan and pays. Signed out → the sign-up page; already paid → the dashboard.
 *  - `/checkout?session=<id>`: the buyer's payment page, created by a merchant (POST /api/checkout)
 *    or by "Buy now" on a product page. In sandbox mode, `/checkout?demo` creates a demo cart so
 *    that flow can be tried at once.
 */
export default async function CheckoutPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const sandbox = getEnv().PAYMENTS_MODE === "sandbox";
  const { session, demo } = await searchParams;

  if (!session && demo === undefined) {
    const current = await readSession();
    if (!current) redirect({ href: "/register", locale });
    if (hasAccess(current!)) redirect({ href: "/dashboard", locale });
    const me = await getMe(current!);
    return <SubscribeFlow email={me.email} sandbox={sandbox} />;
  }

  if (!session) {
    if (!sandbox) notFound();
    const demoCheckout = createDemoCheckout();
    redirect({ href: { pathname: "/checkout", query: { session: demoCheckout.id } }, locale });
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
