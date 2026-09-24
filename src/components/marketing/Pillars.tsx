import { getTranslations } from "next-intl/server";
import { CatalogIcon, WalletIcon, WhatsAppIcon } from "@/components/shell/icons";

const PILLARS = [
  { key: "catalog", icon: CatalogIcon, soon: true },
  { key: "payouts", icon: WalletIcon, soon: false },
  { key: "whatsapp", icon: WhatsAppIcon, soon: true },
] as const;

/** "Why Kandrop?": three pillars. What is not built yet carries a "Soon" tag. */
export async function Pillars() {
  const t = await getTranslations("Marketing.pillars");
  return (
    <section id="porque" aria-labelledby="pillars-title" className="border-t border-line">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="reveal max-w-2xl">
          <p className="text-[11px] font-medium tracking-[0.18em] text-accent uppercase">
            {t("eyebrow")}
          </p>
          <h2
            id="pillars-title"
            className="mt-4 font-serif text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[1.05] font-normal tracking-[-0.02em] text-balance"
          >
            {t("title")}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-2">{t("subtitle")}</p>
        </div>

        <ul className="mt-14 grid gap-5 md:grid-cols-3">
          {PILLARS.map(({ key, icon: Icon, soon }, i) => (
            <li
              key={key}
              className="reveal group relative flex flex-col rounded-2xl border border-line bg-surface p-7 transition-colors hover:border-accent/40 sm:p-8"
              style={{ "--i": i } as React.CSSProperties}
            >
              <span className="grid size-14 place-items-center rounded-xl border border-accent/25 bg-accent/10 text-accent">
                <Icon size={26} />
              </span>
              <h3 className="mt-7 font-serif text-[1.625rem] leading-tight font-normal tracking-tight">
                {t(`items.${key}.title`)}
              </h3>
              <p className="mt-3 leading-relaxed text-ink-2">{t(`items.${key}.body`)}</p>
              {soon && (
                <p className="mt-6 inline-flex w-fit rounded-full border border-line px-3 py-1 text-[11px] font-medium tracking-[0.14em] text-ink-muted uppercase">
                  {t("soon")}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
