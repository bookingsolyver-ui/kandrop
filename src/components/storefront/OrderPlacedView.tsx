import { useFormatter, useLocale, useTranslations } from "next-intl";
import { PixelEvent } from "@/components/analytics/PixelEvent";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import type { ShopperOrder } from "@/server/modules/fulfilment/service";
import type { OrderPaymentInfo } from "@/server/modules/payments/transfer";

/** Order confirmation: what was bought, how to pay Kandrop, and the WhatsApp button that carries the slip. */
export function OrderPlacedView({ order, pay, orderId, trackPurchase }: { order: ShopperOrder; pay: OrderPaymentInfo; orderId: string; trackPurchase: boolean }) {
  const t = useTranslations("OrderPlaced");
  const f = useFormatter();
  const locale = useLocale();
  const total = `${f.number(Math.round(order.total / 100))} kwz`;
  const text = t("whatsappText", { number: order.number, reference: order.reference, total });
  const link = pay.whatsapp ? `https://wa.me/244${pay.whatsapp}?text=${encodeURIComponent(text)}` : null;
  // Each detail is shown only when it exists; with no IBAN the block is replaced by a plain note.
  const rows: Array<[string, string, boolean]> = [];
  if (pay.bank) rows.push([t("bank.bank"), pay.bank, false]);
  if (pay.holder) rows.push([t("bank.holder"), pay.holder, false]);
  if (pay.iban) rows.push(["IBAN", pay.iban.replace(/(.{4})/g, "$1 ").trim(), true]);
  if (pay.bic) rows.push(["BIC/SWIFT", pay.bic, true]);
  const verified = order.paymentStatus === "paid_verified";
  const cod = order.cashOnDelivery;
  const day = order.deliveryDate ? new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(Date.parse(`${order.deliveryDate}T00:00:00Z`)) : null;

  return (
    <div className="min-h-screen bg-page text-ink">
      {/* The order was just saved: one Purchase for it, once per order in this browser (the id also de-duplicates at Meta). */}
      {trackPurchase && order.productKey && (
        <PixelEvent name="Purchase" options={{ value: order.total / 100, currency: "AOA", content_ids: [order.productKey], content_type: "product" }} eventID={orderId} onceKey={`kandrop:px:purchase:${orderId}`} />
      )}
      <header className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p className="truncate text-sm font-medium text-ink-2">{order.storeName}</p>
        <LocaleSwitcher />
      </header>
      <main className="mx-auto max-w-2xl space-y-6 px-4 pb-16 sm:px-6">
        <div>
          <p className="text-sm font-semibold text-up">{t("placed")}</p>
          <h1 className="mt-1 font-serif text-[clamp(1.6rem,5vw,2.2rem)] leading-tight font-medium">{t("title", { number: order.number })}</h1>
          <p className="mt-2 text-sm text-ink-2">{t(cod ? "cod.greeting" : "greeting", { name: order.customerName.split(" ")[0] ?? "" })}</p>
        </div>

        <section className="rounded-lg border border-line bg-surface p-4">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-ink-muted">{t("product")}</dt><dd className="text-right font-medium">{order.productTitle} × {order.quantity}</dd></div>
            {order.discount > 0 && <div className="flex justify-between gap-4"><dt className="text-ink-muted">{t("coupon", { code: order.couponCode ?? "" })}</dt><dd className="tabular-nums text-up">-{`${f.number(Math.round(order.discount / 100))} kwz`}</dd></div>}
            <div className="flex justify-between gap-4 text-base font-semibold"><dt>{t("total")}</dt><dd className="tabular-nums">{total}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ink-muted">{t("reference")}</dt><dd className="font-mono font-semibold tabular-nums">{order.reference}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ink-muted">{t("status.label")}</dt><dd className="text-right font-medium">{cod && !verified ? t("cod.status") : t(`status.${order.paymentStatus}`)}</dd></div>
          </dl>
        </section>

        {cod && (
          <section className="space-y-2 rounded-lg border border-line bg-surface p-4">
            <h2 className="text-sm font-semibold">{t("cod.title")}</h2>
            <p className="text-sm text-ink-2">{t("cod.body", { total })}</p>
            {day && <p className="text-sm font-medium first-letter:uppercase">{t("cod.date", { date: day })}</p>}
            <p className="text-[13px] text-ink-muted">{t("cod.note")}</p>
            {(order.support.whatsapp || order.support.email) && (
              <p className="text-[13px] text-ink-2">
                {t("cod.help")}{" "}
                {order.support.whatsapp && <a href={`https://wa.me/244${order.support.whatsapp}`} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4">WhatsApp {order.support.whatsapp.replace(/(\d{3})(?=\d)/g, "$1 ")}</a>}
                {order.support.whatsapp && order.support.email && " / "}
                {order.support.email && <a href={`mailto:${order.support.email}`} className="font-semibold underline underline-offset-4">{order.support.email}</a>}
              </p>
            )}
          </section>
        )}

        {!cod && !verified && (
          <section className="space-y-3 rounded-lg border border-line bg-surface p-4">
            <h2 className="text-sm font-semibold">{t("how.title")}</h2>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink-2">
              <li>{t("how.step1", { total })}</li>
              <li>{t("how.step2", { reference: order.reference })}</li>
              <li>{t("how.step3")}</li>
            </ol>
            {pay.iban ? (
              <dl className="space-y-1 rounded-md bg-page p-3 text-sm">
                {rows.map(([label, value, mono]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="shrink-0 text-ink-muted">{label}</dt>
                    <dd className={`min-w-0 text-right break-all ${mono ? "font-mono tabular-nums" : ""}`}>{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="rounded-md bg-page p-3 text-sm text-ink-2">{t("bank.pending")}</p>
            )}
            {link ? (
              <a href={link} target="_blank" rel="noopener noreferrer" className="flex h-12 w-full items-center justify-center rounded-md bg-action px-6 text-[0.9375rem] font-semibold text-on-action transition-opacity hover:opacity-90">
                {t("whatsapp")}
              </a>
            ) : (
              <p className="text-sm text-ink-2">{t("noWhatsapp")}</p>
            )}
          </section>
        )}
        {!cod && <p className="text-center text-[12px] text-ink-muted">{t("note")}</p>}
      </main>
    </div>
  );
}
