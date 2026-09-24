import { useTranslations } from "next-intl";

const SAMPLES = [
  { key: "r1", stars: 5 },
  { key: "r2", stars: 5 },
  { key: "r3", stars: 4 },
] as const;

/**
 * Social proof, **only in the test environment and labelled as examples**. There is no reviews
 * system yet, and a shop must never show invented customers as if they were real: the parent
 * renders this component only in sandbox mode.
 */
export function Reviews() {
  const t = useTranslations("Storefront.reviews");

  return (
    <section aria-labelledby="reviews-title">
      <div className="flex flex-wrap items-center gap-3">
        <h2
          id="reviews-title"
          className="font-serif text-[1.375rem] leading-tight font-medium tracking-tight"
        >
          {t("title")}
        </h2>
        <span className="rounded-full border border-field px-2.5 py-0.5 text-[12px] font-medium text-ink-2">
          {t("badge")}
        </span>
      </div>
      <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface">
        {SAMPLES.map(({ key, stars }) => (
          <li key={key} className="p-4">
            <p className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">{t(`${key}.name`)}</span>
              <span className="text-[12px] text-ink-muted">{t(`${key}.when`)}</span>
            </p>
            <p
              role="img"
              aria-label={t("stars", { n: stars })}
              className="mt-1 text-[15px] tracking-[0.12em] text-ink"
            >
              {"★".repeat(stars)}
              <span className="text-field">{"★".repeat(5 - stars)}</span>
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{t(`${key}.text`)}</p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">{t("note")}</p>
    </section>
  );
}
