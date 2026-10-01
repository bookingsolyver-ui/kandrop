import { useFormatter, useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import type { StorefrontProduct } from "@/server/modules/storefront/schema";
import { DeliveryCutoff } from "./DeliveryCutoff";
import { BuyActions } from "./BuyActions";
import { ChevronDownIcon, ClockIcon, LockIcon, ShieldIcon, StarIcon, WalletIcon, WhatsAppIcon } from "./icons";
import { OfferTimer } from "./OfferTimer";
import { ProductGallery } from "./ProductGallery";
import { RichText } from "./RichText";
import { useMoney } from "./useMoney";
import { ViewBeacon } from "./ViewBeacon";

/** The price block: what is charged, and, only while an offer stands, what it replaces. */
function PriceBlock({ p }: { p: StorefrontProduct }) {
  const t = useTranslations("Storefront.price");
  const money = useMoney();
  const format = useFormatter();
  const off = p.discountRate === null ? null : format.number(p.discountRate, { style: "percent" });

  return (
    <div className="flex flex-wrap items-end gap-x-3 gap-y-1.5">
      <p className="text-4xl leading-none font-extrabold tracking-tight tabular-nums">
        <span className="sr-only">{p.regularPrice === null ? "" : `${t("now")}: `}</span>
        {money(p.price)}
      </p>
      {p.regularPrice !== null && (
        <>
          <p className="pb-0.5 text-lg text-ink-muted tabular-nums">
            <span className="sr-only">{t("regular")}: </span>
            <s className="line-through">{money(p.regularPrice)}</s>
          </p>
          {off && <p className="mb-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800 tabular-nums">{t("save", { percent: off })}</p>}
        </>
      )}
    </div>
  );
}

/** A secondary block that starts closed: native <details>, so it works without JavaScript and is keyboard accessible. */
function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-2xl border border-line bg-surface">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-base font-bold [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDownIcon className="shrink-0 text-ink-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-3 px-5 pb-5 text-[15px] leading-relaxed text-ink-2">{children}</div>
    </details>
  );
}

/**
 * The product's sales page, built to convert: gallery (left) and buy box (right) above the fold, a clear
 * pay-on-delivery button with its trust badges, the full description right below, two closed accordions (technical
 * details, warranty and delivery), how buying works, and, on phones, a bottom bar that appears once the main button
 * is out of sight. Everything shown is real (product data, stock, offer); nothing is invented. The only exception is the
 * rating line, which is example content and therefore appears in test mode only (there is no review system yet).
 */
export function StorefrontView({ product: p, whatsapp }: { product: StorefrontProduct; whatsapp: string | null }) {
  const t = useTranslations("Storefront");
  const price = useMoney()(p.price);
  const soldOut = p.stock.state === "out";
  const lastUnits = p.stock.state === "low";
  const trust = [
    { key: "delivery", icon: <ClockIcon width={22} height={22} /> },
    { key: "courier", icon: <WalletIcon width={22} height={22} /> },
    { key: "secure", icon: <ShieldIcon width={22} height={22} /> },
  ] as const;

  return (
    <div className="min-h-screen bg-page pb-28 text-ink lg:pb-20">
      <ViewBeacon slug={p.slug} />

      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <p className="min-w-0 truncate text-sm font-semibold">{p.storeName}</p>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-[12px] font-medium text-ink-2 sm:inline-flex"><LockIcon width={14} height={14} />{t("landing.secureBadge")}</span>
            <LocaleSwitcher />
          </div>
        </div>
      </header>

      {/* Above the fold: 50/50 on desktop, stacked on phones. */}
      <main className="mx-auto grid max-w-6xl gap-8 px-4 pt-6 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:pt-10">
        <ProductGallery images={p.images} title={p.title} />

        <div className="space-y-6">
          <div className="space-y-4">
            <h1 className="text-3xl leading-tight font-bold tracking-tight text-balance text-ink">{p.title}</h1>
            {p.sandbox && (
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
                <span role="img" aria-label={t("page.ratingLabel")} className="flex gap-0.5 text-amber-400">
                  {Array.from({ length: 5 }, (_, i) => <StarIcon key={i} width={20} height={20} />)}
                </span>
                <span>{t("page.rating")}</span>
                <span className="rounded-full border border-line px-2 py-px text-[10px] font-semibold tracking-wide text-ink-muted uppercase">{t("reviews.badge")}</span>
              </p>
            )}
            <PriceBlock p={p} />
            {p.offerEndsAt && <OfferTimer endsAt={p.offerEndsAt} now={p.now} />}
            {(lastUnits || soldOut) && (
              <p className={`inline-flex items-center gap-2.5 rounded-full px-4 py-1.5 text-sm font-semibold ${soldOut ? "bg-line text-ink-2" : "bg-orange-100 text-red-900"}`}>
                <span aria-hidden className={`size-2.5 rounded-full ${soldOut ? "bg-ink-muted" : "animate-pulse bg-red-600"}`} />
                {soldOut ? t("banner.out") : t("page.lastUnits")}
              </p>
            )}
          </div>

          <BuyActions slug={p.slug} soldOut={soldOut} price={price} label={t("page.cta")} shortLabel={t("page.ctaShort")} soldOutLabel={t("buy.soldOut")} note={soldOut ? t("buy.soldOutNote") : t("page.ctaNote")} />

          <DeliveryCutoff now={p.now} />

          <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {trust.map(({ key, icon }) => (
              <li key={key} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 xl:flex-col xl:items-start xl:gap-2">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand text-on-brand">{icon}</span>
                <span className="text-[13px] leading-snug font-semibold">{t(`page.trust.${key}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>

      <div className="mx-auto mt-12 max-w-6xl space-y-12 px-4 sm:px-6 lg:mt-16">
        {p.description && (
          <section aria-labelledby="description-title">
            <h2 id="description-title" className="border-b border-line pb-3 text-2xl font-extrabold tracking-tight">{t("page.details")}</h2>
            <div className="mt-6 max-w-3xl">
              <RichText text={p.description} />
            </div>
          </section>
        )}

        <section className="space-y-3" aria-label={t("page.moreInfo")}>
          <Accordion title={t("page.specs.title")}>
            <p>{t("page.specs.body")}</p>
            {whatsapp && (
              <a href={`https://wa.me/244${whatsapp}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-semibold text-ink underline underline-offset-4">
                <WhatsAppIcon width={18} height={18} />
                {t("landing.store.whatsapp")}
              </a>
            )}
          </Accordion>
          <Accordion title={t("page.warranty.title")}>
            <p>{t("page.warranty.delivery")}</p>
            <p>{t("page.warranty.payment")}</p>
            <p>{t("page.warranty.returns")}</p>
          </Accordion>
        </section>

        <section aria-labelledby="how-title">
          <h2 id="how-title" className="border-b border-line pb-3 text-2xl font-extrabold tracking-tight">{t("page.how.title")}</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(["s1", "s2", "s3", "s4"] as const).map((s, i) => (
              <li key={s} className="flex gap-3.5 rounded-2xl border border-line bg-surface p-4">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-action text-sm font-extrabold text-on-action">{i + 1}</span>
                <span>
                  <span className="block text-sm font-semibold">{t(`page.how.${s}.title`)}</span>
                  <span className="block text-[13px] leading-snug text-ink-2">{t(`page.how.${s}.body`)}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-sm font-bold">{t("landing.store.title")}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{t("landing.store.body", { store: p.storeName })}</p>
          {whatsapp && (
            <a href={`https://wa.me/244${whatsapp}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex h-11 items-center gap-2 rounded-full border border-field px-5 text-sm font-semibold transition-colors hover:border-ink">
              <WhatsAppIcon width={18} height={18} />
              {t("landing.store.whatsapp")}
            </a>
          )}
        </section>
      </div>

      <footer className="mx-auto mt-14 max-w-6xl px-4 text-[13px] text-ink-muted sm:px-6">
        <p>{t("footer.soldBy", { store: p.storeName })} · {t("footer.payments")}</p>
      </footer>
    </div>
  );
}
