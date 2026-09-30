"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Link } from "@/i18n/navigation";

/**
 * Catches an error in any page under the locale layout (login, dashboard, checkout…) so the
 * person sees what happened instead of an empty screen. Light and self-contained on purpose: it
 * must render even when the page's own styles or data are what broke.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Crash");

  useEffect(() => {
    console.error("[app] unhandled error", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 text-neutral-900">
      <div role="alert" className="w-full max-w-lg rounded-2xl border border-neutral-200 p-6 shadow-sm">
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-sm text-neutral-600">{t("body")}</p>
        <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-neutral-100 p-3 text-xs break-words whitespace-pre-wrap text-neutral-800">
          {error.message}
          {error.digest ? `\n${t("reference")}: ${error.digest}` : ""}
        </pre>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="h-11 rounded-xl bg-[#ff5a00] px-5 text-sm font-semibold text-white"
          >
            {t("retry")}
          </button>
          <Link href="/" className="inline-flex h-11 items-center rounded-xl border border-neutral-300 px-5 text-sm font-medium">
            {t("home")}
          </Link>
        </div>
      </div>
    </div>
  );
}
