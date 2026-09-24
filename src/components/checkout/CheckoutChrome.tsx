"use client";

import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { LockIcon } from "./icons";
import { useIsHttps } from "./useIsHttps";

/** The buyer-facing frame shared by the checkout and its success page. */
export function CheckoutHeader({ storeName }: { storeName: string }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <span className="truncate font-serif text-xl font-semibold tracking-tight">
          {storeName}
        </span>
        <LocaleSwitcher />
      </div>
    </header>
  );
}

export function SandboxBanner() {
  const t = useTranslations("Checkout.sandbox");
  return (
    <div className="border-b border-series-2 bg-series-2/10">
      <div className="mx-auto max-w-5xl px-4 py-3 text-[13px] leading-snug sm:px-6">
        <p className="font-medium">{t("banner")}</p>
        <details className="mt-1 text-ink-2">
          <summary className="min-h-6 cursor-pointer underline underline-offset-4">
            {t("details")}
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {(["phoneOk", "phoneDecline", "phoneFunds", "cardOk", "cardDecline"] as const).map(
              (key) => (
                <li key={key}>{t(key)}</li>
              )
            )}
          </ul>
        </details>
      </div>
    </div>
  );
}

/** TLS is a property of how the page is served, so only claim it when it is true. */
export function TrustFooter() {
  const t = useTranslations("Checkout");
  const https = useIsHttps();
  return (
    <p className="mt-8 flex items-center justify-center gap-2 text-center text-[13px] text-ink-muted">
      <LockIcon />
      <span>
        {https && `${t("trust.encrypted")} · `}
        {t("processedBy")}
      </span>
    </p>
  );
}
