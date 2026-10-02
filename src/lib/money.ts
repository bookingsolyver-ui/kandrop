/**
 * Kandrop writes money as the amount first and the unit after it: `22.500 Kz`. One place, used by
 * the dashboard, the storefront, the checkout, the landing pages and the showcase.
 *
 * The digits are grouped the way the reader's language does it (pt `22.500`, en `22,500`, fr `22 500`);
 * only the unit and its position are ours. Amounts arrive as integer minor units (cêntimos) and are
 * shown in whole Kwanzas.
 */
export const KWZ = "Kz";

/** Tags picked for their grouping only: dots for pt, commas for en, a narrow space for fr. */
const NUMBER_LOCALES: Record<string, string> = { pt: "pt-BR", en: "en-US", fr: "fr-FR" };
const formatters = new Map<string, Intl.NumberFormat>();

function numberFormat(locale: string) {
  const tag = NUMBER_LOCALES[locale.slice(0, 2)] ?? "pt-BR";
  let f = formatters.get(tag);
  if (!f) {
    f = new Intl.NumberFormat(tag, { maximumFractionDigits: 0, useGrouping: true });
    formatters.set(tag, f);
  }
  return f;
}

/** The number part only: `22.500`. */
export const formatAmount = (minor: number, locale: string) =>
  numberFormat(locale).format(Math.round(minor / 100));

/** `22.500 Kz`. The space is a non-breaking one, so the unit never wraps onto its own line. */
export const formatKwz = (minor: number, locale: string) =>
  `${formatAmount(minor, locale)} ${KWZ}`;

/** A round figure in Kwanzas (not minor units), e.g. a goal: `10 M Kz`. */
export const formatKwzMillions = (millions: number) => `${millions} M ${KWZ}`;
