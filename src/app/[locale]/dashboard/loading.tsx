import { getTranslations } from "next-intl/server";

/**
 * Instant loading state for every merchant page. Next.js prefetches it with the layout and shows
 * it the moment a link is clicked, while the page itself streams in — the sidebar and header
 * (the layout) never leave. It mirrors the pages' own header so nothing jumps when they arrive.
 */
export default async function DashboardLoading() {
  const t = await getTranslations("Shell");
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden>
        <div className="mb-8 max-w-2xl">
          <div className="pulse h-2.5 w-24 rounded bg-line" />
          <div className="pulse mt-4 h-10 w-72 max-w-full rounded bg-line sm:h-12" />
          <div className="pulse mt-4 h-4 w-96 max-w-full rounded bg-line" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="pulse h-40 rounded-lg border border-line bg-surface lg:col-span-2" />
          <div className="pulse h-40 rounded-lg border border-line bg-surface" />
        </div>
        <div className="pulse mt-6 h-72 rounded-lg border border-line bg-surface" />
      </div>
    </div>
  );
}
