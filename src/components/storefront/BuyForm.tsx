import { useLocale, useTranslations } from "next-intl";
import { PROVINCES } from "@/shared/supplier/schemas";

const FIELD =
  "mt-1 h-12 w-full rounded-md border border-line bg-surface px-3 text-[0.9375rem] outline-none focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-ink/15";
const LABEL = "block text-[13px] font-medium text-ink-2";

/**
 * "Buy now" is a plain HTML form posting to the server: it works before any JavaScript has
 * loaded, which is what slow phones and patchy connections need. It asks who receives the parcel and
 * where (the browser checks the basics; the server checks them again), then creates the checkout at
 * the price of that very second and redirects to the payment page.
 *
 * The form has an id so the button pinned at the bottom of a phone (`<BuyButton>`) can submit it.
 */
export function BuyForm({
  slug,
  soldOut,
  price,
  invalid = false,
}: {
  slug: string;
  soldOut: boolean;
  /** Already formatted: the button says what it will charge. */
  price: string;
  /** The server rejected the details: say so. */
  invalid?: boolean;
}) {
  const t = useTranslations("Storefront.buy");
  const locale = useLocale();

  return (
    <form id="buy-form" method="post" action={`/api/store/${slug}/checkout`} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      {!soldOut && (
        <fieldset className="space-y-3 rounded-lg border border-line bg-surface p-4">
          <legend className="px-1 text-sm font-semibold">{t("fields.title")}</legend>
          {invalid && (
            <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-[13px] text-red-800">
              {t("fields.invalid")}
            </p>
          )}
          <label className={LABEL}>
            {t("fields.name")}
            <input name="name" required minLength={3} maxLength={80} autoComplete="name" className={FIELD} />
          </label>
          <label className={LABEL}>
            {t("fields.phone")}
            <input name="phone" required inputMode="tel" autoComplete="tel-national" pattern="[0-9 ]{9,11}" placeholder="923 000 000" className={FIELD} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={LABEL}>
              {t("fields.province")}
              <select name="province" required defaultValue="" className={FIELD}>
                <option value="" disabled>{t("fields.choose")}</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className={LABEL}>
              {t("fields.city")}
              <input name="city" required minLength={2} maxLength={80} autoComplete="address-level2" className={FIELD} />
            </label>
          </div>
          <label className={LABEL}>
            {t("fields.street")}
            <input name="street" required minLength={3} maxLength={160} autoComplete="street-address" className={FIELD} />
          </label>
          <label className={LABEL}>
            {t("fields.reference")}
            <input name="reference" maxLength={160} className={FIELD} />
          </label>
        </fieldset>
      )}
      <div className="hidden lg:block">
        <BuyButton soldOut={soldOut} price={price} />
        <p className="mt-2 text-center text-[12px] leading-snug text-ink-muted">{soldOut ? t("soldOutNote") : t("methods")}</p>
      </div>
    </form>
  );
}

/** The buy button. Pinned at the bottom of a phone it submits the form above through its `form` attribute. */
export function BuyButton({ soldOut, price }: { soldOut: boolean; price: string }) {
  const t = useTranslations("Storefront.buy");
  return (
    <button
      type="submit"
      form="buy-form"
      disabled={soldOut}
      className="flex h-14 w-full items-center justify-center rounded-md bg-action px-6 text-[1.0625rem] font-semibold text-on-action transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-muted disabled:opacity-100"
    >
      {soldOut ? t("soldOut") : `${t("cta")} · ${price}`}
    </button>
  );
}
