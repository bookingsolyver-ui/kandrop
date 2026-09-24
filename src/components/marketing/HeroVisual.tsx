import { getFormatter, getTranslations } from "next-intl/server";
import { LiveProof } from "./LiveProof";

/** Static sparkline of the (illustrative) mockup: 14 days of revenue, rising. */
const POINTS = [18, 22, 20, 27, 25, 31, 29, 36, 34, 41, 39, 47, 52, 58];
const W = 320;
const H = 96;
const x = (i: number) => (i / (POINTS.length - 1)) * W;
const y = (v: number) => H - 6 - (v / 64) * (H - 12);
const LINE = POINTS.map(
  (v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`
).join(" ");
const AREA = `${LINE} L${W} ${H} L0 ${H} Z`;

/**
 * The hero's picture: a small dashboard built in HTML (nothing to download, so it cannot slow
 * the page), with the floating cards around it. Every figure here is an example.
 */
export async function HeroVisual() {
  const t = await getTranslations("Marketing.hero");
  const format = await getFormatter();
  const kz = (n: number) =>
    format.number(n, {
      style: "currency",
      currency: "AOA",
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
    });

  return (
    <div className="mx-auto w-full max-w-[34rem]">
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-10 -z-10 bg-[radial-gradient(closest-side,var(--glow),transparent)]"
        />
        <div className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-medium tracking-[0.16em] text-ink-muted uppercase">
                {t("mockup.balance")}
              </p>
              <p className="mt-2 font-serif text-[2.5rem] leading-none tracking-[-0.02em] tabular-nums sm:text-[3rem]">
                {kz(1_284_500)}
              </p>
            </div>
          </div>

          <svg
            aria-hidden
            viewBox={`0 0 ${W} ${H}`}
            className="mt-6 h-28 w-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="hero-area" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--accent)" stopOpacity="0.28" />
                <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={AREA} fill="url(#hero-area)" />
            <path
              d={LINE}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <p className="mt-2 text-[13px] text-ink-muted">{t("mockup.period")}</p>

          <ul className="mt-5 divide-y divide-line border-t border-line text-sm">
            {[
              ["Smartwatch Série X", 32_000, "shipped"],
              ["Auriculares sem fios Pro", 37_000, "processing"],
              ["Sérum facial vitamina C", 11_800, "delivered"],
            ].map(([name, amount, status]) => (
              <li key={String(name)} className="flex items-center justify-between gap-4 py-3">
                <span className="min-w-0 truncate">{name}</span>
                <span className="flex shrink-0 items-center gap-4 tabular-nums">
                  <span className="hidden text-[13px] text-ink-muted sm:inline">
                    {t(`mockup.status.${status as "shipped" | "processing" | "delivered"}`)}
                  </span>
                  <span className="font-medium">{kz(amount as number)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <LiveProof />
      </div>
      {/* Outside the box the cards float over, so no card can ever cover this caption. */}
      <p className="mt-10 text-center text-[13px] text-ink-muted lg:mt-12">{t("example")}</p>
    </div>
  );
}
