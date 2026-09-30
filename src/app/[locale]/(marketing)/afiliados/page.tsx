import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { BrandLink } from "@/components/ui/BrandButton";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "AffiliatesPage" });
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    alternates: {
      canonical: `/${locale}/afiliados`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}/afiliados`])),
    },
  };
}

const Svg = ({ children }: { children: ReactNode }) => (
  <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const UserPlusIcon = () => (
  <Svg>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M19 8v6" />
    <path d="M22 11h-6" />
  </Svg>
);
const LinkIcon = () => (
  <Svg>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </Svg>
);
const WalletIcon = () => (
  <Svg>
    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
  </Svg>
);
const RepeatIcon = () => (
  <Svg>
    <path d="m17 2 4 4-4 4" />
    <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
    <path d="m7 22-4-4 4-4" />
    <path d="M21 13v1a4 4 0 0 1-4 4H3" />
  </Svg>
);
const ZapIcon = () => (
  <Svg>
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
  </Svg>
);
const ChartIcon = () => (
  <Svg>
    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <path d="M18 17V9" />
    <path d="M13 17V5" />
    <path d="M8 17v-3" />
  </Svg>
);
const ArrowIcon = () => (
  <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

const STEPS = [
  { key: "signup", Icon: UserPlusIcon },
  { key: "share", Icon: LinkIcon },
  { key: "earn", Icon: WalletIcon },
] as const;
const BENEFITS = [
  { key: "recurring", Icon: RepeatIcon },
  { key: "payouts", Icon: ZapIcon },
  { key: "dashboard", Icon: ChartIcon },
] as const;

const card = "rounded-2xl border border-[var(--ink-200)] bg-white p-6 shadow-[var(--sh-xs)]";
const iconBubble =
  "grid size-11 place-items-center rounded-xl bg-[var(--kai-orange-50)] text-[var(--kai-orange-600)]";

/** The public affiliates page: what the programme is, how it works, why join, and one call to action. */
export default async function AffiliatesPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("AffiliatesPage");

  return (
    <main>
      {/* 1 — Hero */}
      <section aria-labelledby="aff-title" className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[34rem] w-[64rem] -translate-x-1/2 bg-[radial-gradient(closest-side,var(--glow),transparent)]" />
        <div className="mx-auto grid max-w-7xl gap-14 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-12 lg:px-8 lg:pt-24 lg:pb-28">
          <div>
            <p className="enter inline-flex items-center gap-2.5 rounded-full border border-[var(--ink-200)] bg-white px-4 py-1.5 text-[13px] font-medium text-[var(--ink-600)]" style={{ "--i": 0 } as React.CSSProperties}>
              <span aria-hidden className="size-1.5 rounded-full bg-[var(--kai-orange)]" />
              {t("hero.eyebrow")}
            </p>
            <h1 id="aff-title" className="enter mt-7 text-[clamp(2.5rem,5.6vw,4.5rem)] leading-[1.02] font-extrabold tracking-[-0.03em] text-balance text-[var(--ink-900)]" style={{ "--i": 1 } as React.CSSProperties}>
              {t("hero.titleA")} <span className="text-[var(--kai-orange)]">{t("hero.titleB")}</span>
            </h1>
            <p className="enter mt-7 max-w-xl text-lg leading-relaxed text-[var(--ink-600)] sm:text-xl" style={{ "--i": 2 } as React.CSSProperties}>
              {t("hero.subtitle")}
            </p>
            <div className="enter mt-10 flex flex-col gap-3 sm:flex-row" style={{ "--i": 3 } as React.CSSProperties}>
              <BrandLink href="/register" size="lg">
                {t("hero.cta")}
                <ArrowIcon />
              </BrandLink>
              <a href="#como-funciona" className="inline-flex h-14 items-center justify-center rounded-xl border border-[var(--ink-200)] bg-white px-8 text-base font-semibold text-[var(--ink-900)] transition-colors hover:border-[var(--ink-300)]">
                {t("hero.secondary")}
              </a>
            </div>
            <p className="enter mt-5 text-[13px] text-[var(--ink-500)]" style={{ "--i": 4 } as React.CSSProperties}>
              {t("hero.note")}
            </p>
          </div>

          {/* An illustration of the affiliate panel: clearly labelled as an example. */}
          <div className="enter mx-auto w-full max-w-md" style={{ "--i": 4 } as React.CSSProperties}>
            <div className="rounded-2xl border border-[var(--ink-200)] bg-white p-6 shadow-[var(--sh-md)]">
              <p className="text-[10.5px] font-bold tracking-[0.08em] text-[var(--ink-500)] uppercase">{t("hero.panel.title")}</p>
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--ink-200)] bg-[var(--ink-50)] px-3 py-2.5">
                <span className="text-[var(--kai-orange-600)]"><LinkIcon /></span>
                <span className="mono-num min-w-0 truncate text-[13px] text-[var(--ink-700)]">kandrop.com/join?ref=o-seu-nome</span>
              </div>
              <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
                {(["clicks", "signups", "paying"] as const).map((k) => (
                  <div key={k} className="rounded-xl bg-[var(--ink-50)] px-2 py-3">
                    <dt className="text-[11px] text-[var(--ink-500)]">{t(`hero.panel.${k}`)}</dt>
                    <dd className="mono-num mt-1 text-lg font-extrabold text-[var(--ink-900)]">{t(`hero.panel.${k}Value`)}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <p className="mt-4 text-center text-[13px] text-[var(--ink-500)]">{t("hero.panel.example")}</p>
          </div>
        </div>
      </section>

      {/* 2 — How it works */}
      <section id="como-funciona" aria-labelledby="how-title" className="scroll-mt-20 border-t border-[var(--ink-200)]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="reveal max-w-2xl">
            <p className="text-[11px] font-bold tracking-[0.16em] text-[var(--kai-orange-600)] uppercase">{t("how.eyebrow")}</p>
            <h2 id="how-title" className="mt-3 text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-[var(--ink-900)]">
              {t("how.title")}
            </h2>
          </div>
          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map(({ key, Icon }, i) => (
              <li key={key} className={`reveal ${card}`} style={{ "--i": i } as React.CSSProperties}>
                <div className="flex items-center justify-between">
                  <span className={iconBubble}><Icon /></span>
                  <span className="mono-num text-sm font-bold text-[var(--ink-300)]">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-[19px] font-bold tracking-[-0.01em] text-[var(--ink-900)]">{t(`how.steps.${key}.title`)}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--ink-600)]">{t(`how.steps.${key}.body`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 3 — Benefits */}
      <section aria-labelledby="perks-title" className="border-t border-[var(--ink-200)]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="reveal max-w-2xl">
            <p className="text-[11px] font-bold tracking-[0.16em] text-[var(--kai-orange-600)] uppercase">{t("perks.eyebrow")}</p>
            <h2 id="perks-title" className="mt-3 text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-[var(--ink-900)]">
              {t("perks.title")}
            </h2>
          </div>
          <ul className="mt-12 grid gap-5 md:grid-cols-3">
            {BENEFITS.map(({ key, Icon }, i) => (
              <li key={key} className={`reveal ${card}`} style={{ "--i": i } as React.CSSProperties}>
                <span className={iconBubble}><Icon /></span>
                <h3 className="mt-5 text-[19px] font-bold tracking-[-0.01em] text-[var(--ink-900)]">{t(`perks.items.${key}.title`)}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--ink-600)]">{t(`perks.items.${key}.body`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4 — Final call to action */}
      <section aria-labelledby="aff-final-title" className="border-t border-[var(--ink-200)]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div
            className="reveal relative overflow-hidden rounded-2xl px-6 py-16 text-center sm:px-12 sm:py-24"
            style={{ background: "linear-gradient(135deg, #000000 0%, #141414 45%, #2e2e2e 100%)" }}
          >
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.10]" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.55) 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
            <div aria-hidden className="pointer-events-none absolute -top-32 -right-32 h-[420px] w-[420px] rounded-full" style={{ background: "radial-gradient(circle, rgba(255, 90, 0, 0.55) 0%, rgba(255, 90, 0, 0.18) 45%, transparent 75%)", filter: "blur(70px)" }} />
            <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-32 h-[380px] w-[380px] rounded-full" style={{ background: "radial-gradient(circle, rgba(255, 90, 0, 0.45) 0%, rgba(255, 90, 0, 0.12) 50%, transparent 75%)", filter: "blur(80px)" }} />
            <h2 id="aff-final-title" className="relative mx-auto max-w-3xl text-[clamp(2rem,4.6vw,3.5rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-balance text-white">
              {t("final.titleA")} <span className="text-[var(--kai-orange)]">{t("final.titleB")}</span>
            </h2>
            <p className="relative mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/70">{t("final.body")}</p>
            <BrandLink href="/register" size="lg" className="mt-10 px-9">
              {t("final.cta")}
              <ArrowIcon />
            </BrandLink>
          </div>
        </div>
      </section>
    </main>
  );
}
