"use client";

import { useTranslations } from "next-intl";
import type { PublicCheckout } from "@/server/modules/checkout/schema";
import type { PublicPayment } from "@/server/modules/payments/schema";
import { CheckoutHeader, SandboxBanner, TrustFooter } from "./CheckoutChrome";
import { Lines } from "./OrderSummary";
import { SuccessPanel } from "./StatePanels";

/** The receipt: what was paid, how, and what was bought. */
export function SuccessView({
  payment,
  checkout,
  sandbox,
}: {
  payment: PublicPayment;
  checkout: PublicCheckout;
  sandbox: boolean;
}) {
  const t = useTranslations("Checkout.summary");
  return (
    <div className="min-h-screen pb-12">
      <CheckoutHeader storeName={checkout.storeName} />
      {sandbox && <SandboxBanner />}

      <main className="mx-auto max-w-xl px-4 pt-6 sm:px-6 sm:pt-10">
        <SuccessPanel payment={payment} checkout={checkout} />

        <section className="mt-6 rounded-lg border border-line bg-surface p-5 sm:p-6">
          <h2 className="mb-4 font-serif text-[1.375rem] leading-tight font-medium tracking-tight">
            {t("title")}
          </h2>
          <Lines checkout={checkout} />
        </section>

        <TrustFooter />
      </main>
    </div>
  );
}
