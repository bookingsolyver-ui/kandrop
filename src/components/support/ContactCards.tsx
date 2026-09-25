import { useTranslations } from "next-intl";
import { WhatsAppIcon } from "@/components/shell/icons";
import type { SupportContacts } from "@/server/modules/support/contacts";
import { ClockIcon, MailIcon } from "./icons";

/** `973966207` → `+244 973 966 207`. */
const displayNumber = (national: string) => `+244 ${national.replace(/(\d{3})(?=\d)/g, "$1 ")}`;

const CARD = "flex flex-col rounded-lg border border-line bg-surface p-6";
const LINK =
  "mt-auto inline-flex min-h-11 items-center self-start rounded-md border px-4 text-sm font-medium transition-colors motion-reduce:transition-none";

/**
 * The three ways to reach the team, side by side from `md`: WhatsApp (green), e-mail (blue) and the
 * opening hours. Both contact links are ordinary links (a `wa.me` chat and a `mailto:`), so they work
 * on any device without JavaScript.
 */
export function ContactCards({ contacts }: { contacts: SupportContacts }) {
  const t = useTranslations("Support.channels");
  const number = displayNumber(contacts.whatsapp);
  const chat = `https://wa.me/244${contacts.whatsapp}?text=${encodeURIComponent(t("whatsapp.message"))}`;
  const mail = `mailto:${contacts.email}?subject=${encodeURIComponent(t("email.subject"))}`;

  return (
    <section aria-label={t("label")} className="grid gap-4 md:grid-cols-3">
      <article className={CARD}>
        <span className="grid size-11 place-items-center rounded-full border border-accent/40 bg-accent/10 text-accent">
          <WhatsAppIcon size={22} />
        </span>
        <h2 className="mt-4 text-[15px] font-semibold">{t("whatsapp.name")}</h2>
        <p className="mt-1 text-sm text-ink-2">{t("whatsapp.speed")}</p>
        <p className="mt-4 mb-5 text-[1.25rem] font-semibold tracking-tight tabular-nums">
          {number}
        </p>
        <a
          href={chat}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("whatsapp.ctaLabel", { number })}
          className={`${LINK} border-accent/70 text-accent hover:bg-accent/10`}
        >
          {t("whatsapp.cta")}
        </a>
      </article>

      <article className={CARD}>
        <span className="grid size-11 place-items-center rounded-full border border-series-1/40 bg-series-1/10 text-series-1">
          <MailIcon size={22} />
        </span>
        <h2 className="mt-4 text-[15px] font-semibold">{t("email.name")}</h2>
        <p className="mt-1 text-sm text-ink-2">{t("email.speed")}</p>
        <p className="mt-4 mb-5 text-[1.0625rem] font-semibold tracking-tight break-all">
          {contacts.email}
        </p>
        <a
          href={mail}
          aria-label={t("email.ctaLabel", { email: contacts.email })}
          className={`${LINK} border-series-1/70 text-series-1 hover:bg-series-1/10`}
        >
          {t("email.cta")}
        </a>
      </article>

      <article className={CARD}>
        <span className="grid size-11 place-items-center rounded-full border border-field bg-page text-ink-2">
          <ClockIcon size={22} />
        </span>
        <h2 className="mt-4 text-[15px] font-semibold">{t("hours.name")}</h2>
        <p className="mt-1 text-sm text-ink-2">{t("hours.days")}</p>
        <p className="mt-4 text-[1.25rem] font-semibold tracking-tight tabular-nums">
          {t("hours.time")}
        </p>
        <p className="mt-1 text-[13px] text-ink-muted">{t("hours.zone")}</p>
        <p className="mt-4 border-t border-line pt-4 text-sm leading-snug text-ink-2">
          {t("hours.holidays")}
        </p>
      </article>
    </section>
  );
}
