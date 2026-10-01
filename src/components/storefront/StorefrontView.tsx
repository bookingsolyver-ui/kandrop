import { useFormatter, useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Link } from "@/i18n/navigation";
import type { StorefrontProduct } from "@/server/modules/storefront/schema";
import { Gallery } from "./Gallery";
import { BanknoteIcon, LockIcon, ShieldIcon, TruckIcon, WhatsAppIcon } from "./icons";
import { OfferTimer } from "./OfferTimer";
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
      <p className="text-[2.25rem] leading-none font-extrabold tracking-tight tabular-nums sm:text-[2.5rem]">
        <span className="sr-only">{p.regularPrice === null ? "" : `${t("now")}: `}</span>
        {money(p.price)}
      </p>
      {p.regularPrice !== null && (
        <>
          <p className="pb-0.5 text-lg text-ink-muted tabular-nums">
            <span className="sr-only">{t("regular")}: </span>
            <s>{money(p.regularPrice)}</s>
          </p>
          {off && <p className="mb-1 rounded-full bg-action px-2.5 py-0.5 text-[13px] font-bold text-on-action tabular-nums">{t("off", { percent: off })}</p>}
        </>
      )}
    </div>
  );
}

function CtaLink({ slug, soldOut, price, className = "" }: { slug: string; soldOut: boolean; price: string; className?: string }) {
  const t = useTranslations("Storefront.buy");
  const base = `flex h-14 w-full items-center justify-center gap-2 rounded-full px-6 text-[1.0625rem] font-bold transition-all duration-150 ${className}`;
  if (soldOut) return <span aria-disabled="true" className={`${base} cursor-not-allowed bg-line text-ink-muted`}>{t("soldOut")}</span>;
  return (
    <Link href={`/checkout/${slug}`} className={`${base} bg-action text-on-action shadow-[0_10px_30px_-10px_rgba(255,90,0,0.7)] hover:-translate-y-px hover:shadow-[0_14px_34px_-10px_rgba(255,90,0,0.85)] active:translate-y-0`}>
      {t("cta")} · {price}
    </Link>
  );
}

/**
 * The product's sales page: the shopper's first impression. Mobile-first: gallery, title, price, the reasons to trust
 * the purchase and one big button; the description and "how it works" follow. On a phone the button is pinned to the
 * bottom of the screen. Everything shown is real (product data, stock, offer); nothing is invented.
 */
export function StorefrontView({ product: p, whatsapp }: { product: StorefrontProduct; whatsapp: string | null }) {
  const t = useTranslations("Storefront");
  const price = useMoney()(p.price);
  const soldOut = p.stock.state === "out";
  const scarce = p.stock.state === "low" ? p.stock.remaining ?? 0 : null;
  const trust = [
    { key: "secure", icon: <ShieldIcon /> },
    { key: "pay", icon: <BanknoteIcon /> },
    { key: "delivery", icon: <TruckIcon /> },
  ] as const;

  return (
    <div className="min-h-screen bg-page pb-36 text-ink lg:pb-20">
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

      <main className="mx-auto max-w-6xl lg:grid lg:grid-cols-[1.1fr_1fr] lg:gap-x-14 lg:px-6 lg:pt-8">
        <Gallery images={p.images} title={p.title} />

        <div className="space-y-6 px-4 pt-6 sm:px-6 lg:px-0 lg:pt-0">
          <div className="space-y-4">
            {(scarce !== null || soldOut) && (
              <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold ${soldOut ? "bg-line text-ink-2" : "bg-brand text-on-brand"}`}>
                <span aria-hidden className={`size-2 rounded-full ${soldOut ? "bg-ink-muted" : "animate-pulse bg-action"}`} />
                {soldOut ? t("banner.out") : t("banner.low", { count: scarce ?? 0 })}
              </p>
            )}
            <h1 className="text-[clamp(1.6rem,6vw,2.4rem)] leading-[1.12] font-extrabold tracking-tight text-balance">{p.title}</h1>
            <PriceBlock p={p} />
            {p.offerEndsAt && <OfferTimer endsAt={p.offerEndsAt} now={p.now} />}
          </div>

          <div className="hidden lg:block">
            <CtaLink slug={p.slug} soldOut={soldOut} price={price} />
            <p className="mt-2.5 text-center text-[12px] text-ink-muted">{soldOut ? t("buy.soldOutNote") : t("landing.ctaNote")}</p>
          </div>

          <ul className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-1">
            {trust.map(({ key, icon }) => (
              <li key={key} className="flex items-start gap-3">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-on-brand">{icon}</span>
                <span>
                  <span className="block text-sm font-semibold">{t(`landing.trust.${key}.title`)}</span>
                  <span className="block text-[13px] leading-snug text-ink-2">{t(`landing.trust.${key}.body`)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </main>

      <div className="mx-auto mt-10 grid max-w-6xl gap-10 px-4 sm:px-6 lg:mt-14 lg:grid-cols-[1.1fr_1fr] lg:gap-x-14">
        <div className="space-y-10">
          {p.description && (
            <section aria-labelledby="description-title">
              <h2 id="description-title" className="text-xl font-extrabold tracking-tight">{t("description.title")}</h2>
              <div className="mt-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
                <RichText text={p.description} />
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-10">
          <section aria-labelledby="how-title">
            <h2 id="how-title" className="text-xl font-extrabold tracking-tight">{t("landing.how.title")}</h2>
            <ol className="mt-4 space-y-3">
              {(["s1", "s2", "s3", "s4"] as const).map((s, i) => (
                <li key={s} className="flex gap-3.5 rounded-2xl border border-line bg-surface p-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-action text-sm font-extrabold text-on-action">{i + 1}</span>
                  <span>
                    <span className="block text-sm font-semibold">{t(`landing.how.${s}.title`)}</span>
                    <span className="block text-[13px] leading-snug text-ink-2">{t(`landing.how.${s}.body`)}</span>
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
        </aside>
      </div>

      <footer className="mx-auto mt-14 max-w-6xl px-4 text-[13px] text-ink-muted sm:px-6">
        <p>{t("footer.soldBy", { store: p.storeName })} · {t("footer.payments")}</p>
      </footer>

      {/* Phones: the buy button is always in reach, and says what it will charge. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
        <div className="mx-auto max-w-md">
          <CtaLink slug={p.slug} soldOut={soldOut} price={price} />
        </div>
      </div>
    </div>
  );
}
