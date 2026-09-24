import { useLocale, useTranslations } from "next-intl";

/**
 * "Buy now" is a plain HTML form posting to the server: it works before any JavaScript has
 * loaded, which is what slow phones and patchy connections need. The server creates the checkout
 * at the price of that very second and redirects to the payment page.
 */
export function BuyForm({
  slug,
  soldOut,
  price,
}: {
  slug: string;
  soldOut: boolean;
  /** Already formatted: the button says what it will charge. */
  price: string;
}) {
  const t = useTranslations("Storefront.buy");
  const locale = useLocale();

  return (
    <form method="post" action={`/api/store/${slug}/checkout`}>
      <input type="hidden" name="locale" value={locale} />
      <button
        type="submit"
        disabled={soldOut}
        className="flex h-14 w-full items-center justify-center rounded-md bg-action px-6 text-[1.0625rem] font-semibold text-on-action transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-muted disabled:opacity-100"
      >
        {soldOut ? t("soldOut") : `${t("cta")} · ${price}`}
      </button>
      <p className="mt-2 text-center text-[12px] leading-snug text-ink-muted">
        {soldOut ? t("soldOutNote") : t("methods")}
      </p>
    </form>
  );
}
