import { useFormatter, useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import type { ShopperOrder } from "@/server/modules/fulfilment/service";

interface Bank { bank: string; holder: string; account: string; iban: string; whatsapp: string }

/** Order confirmation: what was bought, how to pay Kandrop, and the WhatsApp button that carries the slip. */
export function OrderPlacedView({ order, bank }: { order: ShopperOrder; bank: Bank | null }) {
  const t = useTranslations("OrderPlaced");
  const f = useFormatter();
  const total = `${f.number(Math.round(order.total / 100))} kwz`;
  const text = t("whatsappText", { number: order.number, reference: order.reference, total });
  const link = bank ? `https://wa.me/244${bank.whatsapp}?text=${encodeURIComponent(text)}` : null;
  const verified = order.paymentStatus === "paid_verified";

  return (
    <div className="min-h-screen bg-page text-ink">
      <header className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p className="truncate text-sm font-medium text-ink-2">{order.storeName}</p>
        <LocaleSwitcher />
      </header>
      <main className="mx-auto max-w-2xl space-y-6 px-4 pb-16 sm:px-6">
        <div>
          <p className="text-sm font-semibold text-up">{t("placed")}</p>
          <h1 className="mt-1 font-serif text-[clamp(1.6rem,5vw,2.2rem)] leading-tight font-medium">{t("title", { number: order.number })}</h1>
          <p className="mt-2 text-sm text-ink-2">{t("greeting", { name: order.customerName.split(" ")[0] ?? "" })}</p>
        </div>

        <section className="rounded-lg border border-line bg-surface p-4">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-ink-muted">{t("product")}</dt><dd className="text-right font-medium">{order.productTitle} × {order.quantity}</dd></div>
            <div className="flex justify-between gap-4 text-base font-semibold"><dt>{t("total")}</dt><dd className="tabular-nums">{total}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ink-muted">{t("reference")}</dt><dd className="font-mono font-semibold tabular-nums">{order.reference}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ink-muted">{t("status.label")}</dt><dd className="text-right font-medium">{t(`status.${order.paymentStatus}`)}</dd></div>
          </dl>
        </section>

        {!verified && (
          <section className="space-y-3 rounded-lg border border-line bg-surface p-4">
            <h2 className="text-sm font-semibold">{t("how.title")}</h2>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink-2">
              <li>{t("how.step1", { total })}</li>
              <li>{t("how.step2", { reference: order.reference })}</li>
              <li>{t("how.step3")}</li>
            </ol>
            {bank ? (
              <dl className="space-y-1 rounded-md bg-page p-3 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-ink-muted">{t("bank.bank")}</dt><dd>{bank.bank}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-ink-muted">{t("bank.holder")}</dt><dd>{bank.holder}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-ink-muted">IBAN</dt><dd className="font-mono tabular-nums">{bank.iban}</dd></div>
              </dl>
            ) : (
              <p className="rounded-md bg-page p-3 text-sm text-ink-2">{t("bank.pending")}</p>
            )}
            {link && (
              <a href={link} target="_blank" rel="noopener noreferrer" className="flex h-12 w-full items-center justify-center rounded-md bg-action px-6 text-[0.9375rem] font-semibold text-on-action transition-opacity hover:opacity-90">
                {t("whatsapp")}
              </a>
            )}
          </section>
        )}
        <p className="text-center text-[12px] text-ink-muted">{t("note")}</p>
      </main>
    </div>
  );
}
