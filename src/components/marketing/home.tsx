import { getLocale, getTranslations } from "next-intl/server";
import Image from "next/image";
import { formatKwz } from "@/lib/money";
import { Link } from "@/i18n/navigation";
import { PLAN_PRICES } from "@/server/modules/plan/limits";
import { ArrowIcon, CheckIcon } from "./icons";

/**
 * The home page's sections, in the order and the visual rhythm of the official reference (black hero and problem, grey
 * solution/steps, black earnings, white comparison, grey plans/FAQ, black closing call): same tokens (brand-black,
 * brand-gray, brand-white, brand-orange), rounded-full pills, glass card, lift-on-hover cards and staggered entrances.
 * The WORDS are the live platform's own: nothing here promises what the product does not do today.
 */

const pill = "inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-center text-sm font-bold transition-all duration-200";
const PRIMARY = `${pill} bg-brand-orange text-brand-black shadow-[0_4px_20px_rgba(255,90,0,0.35)] hover:scale-[1.02] hover:shadow-[0_6px_26px_rgba(255,90,0,0.5)]`;
const GHOST_DARK = `${pill} border-2 border-white/25 text-brand-white hover:border-brand-orange hover:text-brand-orange`;
const eyebrow = "text-[11px] font-semibold tracking-[0.18em] uppercase";
const icon = { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

const SOLUTION_ICONS = {
  s1: <svg {...icon}><path d="m12 3 8 4.2v9.6L12 21l-8-4.2V7.2Z" /><path d="m4 7.2 8 4.3 8-4.3M12 11.5V21" /></svg>,
  s2: <svg {...icon}><path d="M3 6.5h10.5V16H3Z" /><path d="M13.5 9.5h4l3 3.2V16h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></svg>,
  s3: <svg {...icon}><rect x="3.5" y="9" width="17" height="10.5" rx="2" /><path d="M8 9V6.5a4 4 0 0 1 8 0V9" /></svg>,
  s4: <svg {...icon}><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" /><path d="M18 3v4h-4M6 21v-4h4" /></svg>,
  s5: <svg {...icon}><rect x="2.5" y="6" width="19" height="12" rx="2.5" /><circle cx="12" cy="12" r="2.6" /></svg>,
  s6: <svg {...icon}><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" /><rect x="3.5" y="8" width="17" height="11.5" rx="2.5" /><path d="M16 13.8h2.2" /></svg>,
} as const;

/**
 * Photos of the three "how it works" steps (as in the reference, 4:3, they zoom on hover). No photograph exists in the
 * project or in KANDROP_VISUAL yet, so none is shown and nothing is invented: put the real files in `public/images/steps/`
 * and list their paths here, e.g. "/images/steps/step1-conta.jpg".
 */
const STEP_PHOTOS: Array<string | null> = [null, null, null];

/** Black hero: eyebrow, the headline with the orange word, the promise, two calls to action and a glass card of what you get. */
export async function HomeHero() {
  const t = await getTranslations("Marketing.home.hero");
  return (
    <section id="inicio" aria-labelledby="hero-title" className="relative -mt-16 overflow-hidden bg-brand-black pt-16 text-brand-white">
      <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 h-[34rem] w-[64rem] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(255,90,0,0.28),transparent)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_top,rgba(255,90,0,0.08),transparent)]" />
      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-24 sm:pb-28">
        <p className={`enter inline-flex items-center gap-2 rounded-full border border-brand-orange/40 bg-brand-orange/10 px-4 py-1.5 text-brand-orange ${eyebrow}`} style={{ "--i": 0 } as React.CSSProperties}>
          <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-brand-orange" />
          {t("eyebrow")}
        </p>
        <h1 id="hero-title" className="enter mt-7 text-3xl leading-[1.12] font-extrabold tracking-tight text-balance sm:text-5xl md:text-6xl" style={{ "--i": 1 } as React.CSSProperties}>
          {t("title1")} {t("title2")} <span className="text-brand-orange">{t("accent")}</span>{t("title3")}
        </h1>
        <p className="enter mt-6 max-w-2xl text-base leading-relaxed text-brand-white/75 sm:text-lg" style={{ "--i": 2 } as React.CSSProperties}>{t("subtitle")}</p>
        <div className="enter mt-9 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row" style={{ "--i": 3 } as React.CSSProperties}>
          <Link href="/register" className={PRIMARY}>{t("primary")}<ArrowIcon /></Link>
          <Link href="/#planos" className={GHOST_DARK}>{t("secondary")}</Link>
        </div>
        <p className="enter mt-5 text-xs font-medium text-brand-white/60" style={{ "--i": 4 } as React.CSSProperties}>{t("trust")}</p>
        <div className="enter glass mt-12 w-full max-w-2xl rounded-2xl p-6 text-left sm:p-8" style={{ "--i": 5 } as React.CSSProperties}>
          <p className={`${eyebrow} text-brand-orange`}>{t("card.eyebrow")}</p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-3">
            {(["a", "b", "c"] as const).map((k) => (
              <li key={k}>
                <p className="text-sm font-bold">{t(`card.${k}.title`)}</p>
                <p className="mt-1 text-[13px] leading-snug text-brand-white/65">{t(`card.${k}.body`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** Black: the problem in one line and one paragraph. */
export async function HomeProblem() {
  const t = await getTranslations("Marketing.home.problem");
  return (
    <section id="problema" className="bg-brand-black py-16 text-brand-white sm:py-24">
      <div className="reveal mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-3xl leading-tight font-extrabold tracking-tight text-balance sm:text-4xl">{t("title")}</h2>
        <p className="mt-5 text-base leading-relaxed text-brand-white/70 sm:text-lg">{t("body")}</p>
      </div>
    </section>
  );
}

/** Grey: six reasons, white cards that lift and light up on hover. */
export async function HomeSolution() {
  const t = await getTranslations("Marketing.home.solution");
  return (
    <section id="solucao" aria-labelledby="solution-title" className="bg-brand-gray py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <h2 id="solution-title" className="reveal text-center text-3xl font-extrabold tracking-tight text-brand-black sm:text-4xl">{t("title")}</h2>
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(["s1", "s2", "s3", "s4", "s5", "s6"] as const).map((k, i) => (
            <li key={k} className="reveal group rounded-2xl border border-black/10 bg-brand-white p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-orange hover:shadow-xl" style={{ "--i": i } as React.CSSProperties}>
              <span className="grid size-12 place-items-center rounded-xl bg-brand-orange/10 text-brand-orange transition-transform duration-300 group-hover:scale-110">{SOLUTION_ICONS[k]}</span>
              <h3 className="mt-5 text-lg font-bold text-brand-black">{t(`${k}.title`)}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-black/65">{t(`${k}.body`)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Grey: three numbered steps. The first one carries the real entry price of the Starter plan. */
export async function HomeSteps() {
  const t = await getTranslations("Marketing.home.steps");
  const locale = await getLocale();
  const price = formatKwz(PLAN_PRICES.starter * 100, locale);
  return (
    <section id="como-funciona" aria-labelledby="steps-title" className="bg-brand-gray pb-20 sm:pb-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="reveal text-center">
          <p className={`${eyebrow} text-brand-orange`}>{t("eyebrow")}</p>
          <h2 id="steps-title" className="mt-2 text-3xl font-extrabold tracking-tight text-brand-black sm:text-4xl">{t("title")}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-black/65 sm:text-lg">{t("subtitle")}</p>
        </div>
        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {(["s1", "s2", "s3"] as const).map((k, i) => (
            <li key={k} className="reveal group overflow-hidden rounded-2xl border border-black/10 bg-brand-white transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-orange hover:shadow-xl" style={{ "--i": i } as React.CSSProperties}>
              {STEP_PHOTOS[i] && (
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image src={STEP_PHOTOS[i]!} alt={t(`${k}.title`)} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
              )}
              <div className="p-8">
              <span className="grid size-12 place-items-center rounded-full bg-brand-orange text-lg font-extrabold text-brand-black transition-transform duration-300 group-hover:scale-110">{i + 1}</span>
              <p className={`mt-5 ${eyebrow} text-black/50`}>{t(`${k}.tag`)}</p>
              <h3 className="mt-1 text-xl font-bold tracking-tight text-brand-black transition-colors group-hover:text-brand-orange">{t(`${k}.title`)}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-black/65">{t(`${k}.body`, { price })}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Black: how the money is split, with an ILLUSTRATIVE example (labelled as such, no invented results). */
export async function HomeEarnings() {
  const t = await getTranslations("Marketing.home.earnings");
  return (
    <section id="margem" aria-labelledby="earn-title" className="relative overflow-hidden bg-brand-black py-20 text-brand-white sm:py-28">
      <div aria-hidden className="pointer-events-none absolute -right-32 top-0 h-96 w-96 rounded-full bg-[radial-gradient(closest-side,rgba(255,90,0,0.22),transparent)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="reveal">
          <p className={`${eyebrow} text-brand-orange`}>{t("eyebrow")}</p>
          <h2 id="earn-title" className="mt-4 text-3xl leading-tight font-extrabold tracking-tight text-balance sm:text-4xl md:text-5xl">
            {t("title1")} <span className="text-brand-orange">{t("accent")}</span>
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-brand-white/70 sm:text-lg">{t("body")}</p>
          <Link href="/register" className={`${PRIMARY} mt-8`}>{t("cta")}<ArrowIcon /></Link>
        </div>
        <div className="reveal glass rounded-2xl p-6 sm:p-8" style={{ "--i": 1 } as React.CSSProperties}>
          <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-brand-white/70 uppercase">{t("example")}</p>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-brand-white/70">{t("sale")}</dt><dd className="font-bold tabular-nums">15.000 kwz</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-brand-white/70">{t("cost")}</dt><dd className="font-bold text-brand-white/90 tabular-nums">- 10.000 kwz</dd></div>
            <div className="flex justify-between gap-4 border-t border-white/10 pt-3"><dt className="text-brand-white/70">{t("margin")}</dt><dd className="font-bold tabular-nums">5.000 kwz</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-brand-white/70">{t("fee")}</dt><dd className="font-bold text-brand-white/90">{t("feeValue")}</dd></div>
            <div className="flex justify-between gap-4 rounded-xl bg-brand-orange/15 px-4 py-3 text-base"><dt className="font-bold text-brand-orange">{t("profit")}</dt><dd className="font-extrabold text-brand-orange">{t("profitValue")}</dd></div>
          </dl>
          <p className="mt-5 text-xs leading-relaxed text-brand-white/50">{t("note")}</p>
        </div>
      </div>
    </section>
  );
}

/** White: Kandrop against the traditional way, row by row. */
export async function HomeCompare() {
  const t = await getTranslations("Marketing.home.compare");
  return (
    <section id="comparacao" aria-labelledby="compare-title" className="bg-brand-white py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="reveal text-center">
          <p className={`${eyebrow} text-brand-orange`}>{t("eyebrow")}</p>
          <h2 id="compare-title" className="mt-2 text-3xl font-extrabold tracking-tight text-brand-black sm:text-4xl">{t("title")}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-black/65 sm:text-lg">{t("subtitle")}</p>
        </div>
        <div className="reveal mt-10 overflow-hidden rounded-2xl border border-black/10">
          <table className="w-full border-collapse text-left text-sm sm:text-base">
            <caption className="sr-only">{t("title")}</caption>
            <thead>
              <tr className="bg-brand-gray">
                <th scope="col" className="px-4 py-4 font-bold text-black/60 sm:px-6">{t("factor")}</th>
                <th scope="col" className="px-4 py-4 font-bold text-black/60 sm:px-6">{t("traditional")}</th>
                <th scope="col" className="bg-brand-orange px-4 py-4 font-extrabold text-brand-black sm:px-6">Kandrop</th>
              </tr>
            </thead>
            <tbody>
              {(["r1", "r2", "r3", "r4"] as const).map((k) => (
                <tr key={k} className="border-t border-black/10 transition-colors hover:bg-black/[0.02]">
                  <th scope="row" className="px-4 py-4 font-semibold text-brand-black sm:px-6">{t(`${k}.factor`)}</th>
                  <td className="px-4 py-4 text-black/60 sm:px-6">{t(`${k}.old`)}</td>
                  <td className="px-4 py-4 font-bold text-brand-black sm:px-6"><span className="inline-flex items-center gap-2"><span className="text-brand-orange"><CheckIcon size={16} /></span>{t(`${k}.new`)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/** Grey: who it is for, then the questions people ask (native accordions: they work without JavaScript). */
export async function HomeFaq() {
  const t = await getTranslations("Marketing.home.faq");
  const locale = await getLocale();
  const prices = { starter: formatKwz(PLAN_PRICES.starter * 100, locale), pro: formatKwz(PLAN_PRICES.pro * 100, locale) };
  const who = await getTranslations("Marketing.home.who");
  return (
    <>
      <section id="para-quem" className="bg-brand-gray py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-brand-black sm:text-4xl">{who("title")}</h2>
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {(["a", "b", "c"] as const).map((k, i) => (
              <li key={k} className="reveal flex items-start gap-3 rounded-2xl border border-black/10 bg-brand-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-orange hover:shadow-md" style={{ "--i": i } as React.CSSProperties}>
                <span className="mt-0.5 text-brand-orange"><CheckIcon size={20} /></span>
                <span className="font-semibold text-brand-black">{who(k)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section id="faq" aria-labelledby="faq-title" className="bg-brand-gray pb-20 sm:pb-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 id="faq-title" className="reveal text-center text-3xl font-extrabold tracking-tight text-brand-black sm:text-4xl">{t("title")}</h2>
          <div className="mt-10 space-y-3">
            {(["q1", "q2", "q3", "q4", "q5", "q6", "q7"] as const).map((k) => (
              <details key={k} className="reveal group rounded-2xl border border-black/10 bg-brand-white transition-colors hover:border-black/30">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-bold text-brand-black [&::-webkit-details-marker]:hidden">
                  {t(`${k}.q`)}
                  <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-brand-orange transition-transform duration-300 group-open:rotate-180"><path d="m6 9 6 6 6-6" /></svg>
                </summary>
                <p className="px-5 pb-5 text-[15px] leading-relaxed text-black/65">{t(`${k}.a`, prices)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

/** Black closing call to action. */
export async function HomeClosing() {
  const t = await getTranslations("Marketing.home.closing");
  return (
    <section aria-labelledby="closing-title" className="relative overflow-hidden bg-brand-black py-20 text-brand-white sm:py-28">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-24 mx-auto h-72 w-[48rem] max-w-full bg-[radial-gradient(closest-side,rgba(255,90,0,0.3),transparent)]" />
      <div className="reveal relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 id="closing-title" className="text-3xl leading-tight font-extrabold tracking-tight text-balance sm:text-4xl md:text-5xl">{t("title")}</h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-brand-white/70 sm:text-lg">{t("body")}</p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/register" className={PRIMARY}>{t("cta")}<ArrowIcon /></Link>
          <Link href="/login" className={GHOST_DARK}>{t("login")}</Link>
        </div>
      </div>
    </section>
  );
}
