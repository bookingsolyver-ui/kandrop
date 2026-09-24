import { useFormatter, useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import type { StorefrontProduct } from "@/server/modules/storefront/schema";
import { BuyForm } from "./BuyForm";
import { Gallery } from "./Gallery";
import { OfferTimer } from "./OfferTimer";
import { Reviews } from "./Reviews";
import { useMoney } from "./useMoney";
import { ViewBeacon } from "./ViewBeacon";

/** The price block: what is charged, and — only while an offer stands — what it replaces. */
function PriceBlock({ p }: { p: StorefrontProduct }) {
  const t = useTranslations("Storefront.price");
  const money = useMoney();
  const format = useFormatter();
  const off = p.discountRate === null ? null : format.number(p.discountRate, { style: "percent" });

  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <p className="text-[2rem] leading-none font-semibold tracking-tight tabular-nums">
        <span className="sr-only">{p.regularPrice === null ? "" : `${t("now")}: `}</span>
        {money(p.price)}
      </p>
      {p.regularPrice !== null && (
        <>
          <p className="text-lg text-ink-muted tabular-nums">
            <span className="sr-only">{t("regular")}: </span>
            <s>{money(p.regularPrice)}</s>
          </p>
          {off && (
            <p className="rounded-full bg-brand px-2.5 py-0.5 text-[13px] font-semibold text-on-brand tabular-nums">
              {t("off", { percent: off })}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export function StorefrontView({ product: p }: { product: StorefrontProduct }) {
  const t = useTranslations("Storefront");
  const price = useMoney()(p.price);
  const soldOut = p.stock.state === "out";
  const banner =
    p.stock.state === "low"
      ? t("banner.low", { count: p.stock.remaining ?? 0 })
      : soldOut
        ? t("banner.out")
        : null;

  return (
    <div className="min-h-screen bg-page pb-32 text-ink lg:pb-16">
      <ViewBeacon slug={p.slug} />

      {banner && (
        <div className="bg-brand px-4 py-2.5 text-center text-sm font-semibold text-on-brand">
          {banner}
        </div>
      )}

      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p className="min-w-0 truncate text-sm font-medium text-ink-2">
          {t("header.store", { store: p.storeName })}
        </p>
        <LocaleSwitcher />
      </header>

      <main className="mx-auto max-w-5xl lg:grid lg:grid-cols-2 lg:gap-x-12 lg:px-6">
        <Gallery images={p.images} title={p.title} />

        <div className="space-y-6 px-4 pt-5 sm:px-6 lg:px-0 lg:pt-0">
          <div className="space-y-4">
            <h1 className="font-serif text-[clamp(1.75rem,6vw,2.5rem)] leading-[1.1] font-medium tracking-tight text-balance">
              {p.title}
            </h1>
            <PriceBlock p={p} />
            {p.offerEndsAt && <OfferTimer endsAt={p.offerEndsAt} now={p.now} />}
          </div>

          {/* From lg up the buy button sits here; on phones it is the bar pinned below. */}
          <div className="hidden lg:block">
            <BuyForm slug={p.slug} soldOut={soldOut} price={price} />
          </div>

          <section
            aria-labelledby="pay-title"
            className="rounded-lg border border-line bg-surface p-4"
          >
            <h2 id="pay-title" className="text-sm font-semibold">
              {t("pay.title")}
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2 text-[13px]">
              {(["multicaixa", "unitel", "card"] as const).map((m) => (
                <li key={m} className="rounded-full border border-field px-3 py-1.5 text-ink-2">
                  {t(`pay.${m}`)}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">{t("pay.note")}</p>
          </section>

          {p.description && (
            <section aria-labelledby="description-title">
              <h2
                id="description-title"
                className="font-serif text-[1.375rem] leading-tight font-medium tracking-tight"
              >
                {t("description.title")}
              </h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-ink-2">{p.description}</p>
            </section>
          )}

          {p.sandbox && <Reviews />}
        </div>
      </main>

      <footer className="mx-auto mt-12 max-w-5xl px-4 text-[13px] text-ink-muted sm:px-6">
        <p>
          {t("footer.soldBy", { store: p.storeName })} · {t("footer.payments")}
        </p>
      </footer>

      {/* Phones: the buy button is always in reach, and says what it will charge. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden">
        <div className="mx-auto max-w-md">
          <BuyForm slug={p.slug} soldOut={soldOut} price={price} />
        </div>
      </div>
    </div>
  );
}
