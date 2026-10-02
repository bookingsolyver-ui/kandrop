import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Tailwind, Text } from "@react-email/components";
import { DarkModeStyles, EMAIL_TAILWIND, EmailLogo } from "./parts";

export type SubscriptionEmailKind = "reminder" | "deactivated";

export interface KandropSubscriptionEmailProps {
  /** `reminder`: the 3-day notice. `deactivated`: the account was switched off because the period ended. */
  kind: SubscriptionEmailKind;
  shopName: string;
  /** Whole days left (reminder). Ignored for `deactivated`. */
  daysLeft: number;
  /** Already formatted for the reader, e.g. "5 de outubro de 2026". */
  expirationDate: string;
  planName: string;
  /** Already formatted, e.g. "8 799 Kz". */
  renewalAmount: string;
  /** Where the button goes: the support WhatsApp (`https://wa.me/...`) or `mailto:`. */
  ctaUrl: string;
  /** `Falar com o Suporte` (default) or `Regularizar Conta`. */
  ctaLabel?: string;
}

const COPY = {
  reminder: {
    preview: (p: KandropSubscriptionEmailProps) => `A subscrição de ${p.shopName} termina a ${p.expirationDate}`,
    title: "A sua subscrição está quase a terminar",
    boxLabel: "Termina em",
    message: (p: KandropSubscriptionEmailProps) =>
      `Para manter a loja ${p.shopName} online e o acesso ao painel, regularize o pagamento da renovação (${p.renewalAmount}) até ${p.expirationDate}. Se o pagamento não for regularizado a tempo, a conta será suspensa e a loja ficará offline. Não há débito automático: a renovação é feita por si.`,
  },
  deactivated: {
    preview: (p: KandropSubscriptionEmailProps) => `A conta de ${p.shopName} foi suspensa`,
    title: "A sua conta foi suspensa",
    boxLabel: "Terminou em",
    message: (p: KandropSubscriptionEmailProps) =>
      `A subscrição ${p.planName} de ${p.shopName} terminou sem renovação: o acesso ao painel está suspenso e a loja está offline. Para reativar, regularize o pagamento (${p.renewalAmount}) e fale com a nossa equipa: a conta volta a ficar ativa assim que um administrador a ativar.`,
  },
} as const;

/** One layout for both automatic notices of the subscriptions job (3-day reminder and deactivation). */
export function KandropSubscriptionEmail(props: KandropSubscriptionEmailProps) {
  const { kind, shopName, daysLeft, expirationDate, ctaUrl } = props;
  const copy = COPY[kind];
  const ctaLabel = props.ctaLabel ?? (kind === "reminder" ? "Regularizar Conta" : "Falar com o Suporte");
  const countdown = kind === "reminder" ? (daysLeft <= 0 ? "Hoje" : daysLeft === 1 ? "1 dia" : `${daysLeft} dias`) : null;

  return (
    <Html lang="pt">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <DarkModeStyles />
      </Head>
      <Preview>{copy.preview(props)}</Preview>
      <Tailwind config={EMAIL_TAILWIND}>
        <Body className="dm-page m-0 bg-[#f6f6f6] py-6 font-sans">
          <Container className="dm-card mx-auto max-w-[560px] overflow-hidden rounded-2xl bg-white">
            <Section className="px-8 pt-8 pb-2 text-center">
              <EmailLogo />
            </Section>

            <Section className="px-8 pt-4 pb-8">
              <Heading as="h1" className="dm-title m-0 mb-3 text-[22px] leading-tight font-bold text-brand-black">
                {copy.title}
              </Heading>
              <Text className="dm-text m-0 mb-5 text-[15px] leading-relaxed text-[#333333]">Olá, equipa de {shopName}.</Text>

              <Section className="mb-5 dm-box rounded-xl bg-[#fff0e6] px-6 py-5 text-center">
                <Text className="m-0 text-[11px] font-bold tracking-[0.18em] text-brand-orange uppercase">{copy.boxLabel}</Text>
                {countdown && <Text className="dm-title m-0 mt-1 text-[34px] leading-tight font-extrabold text-brand-black">{countdown}</Text>}
                <Text className={`dm-title m-0 ${countdown ? "mt-1 text-[15px] font-semibold" : "mt-1 text-[26px] font-extrabold"} text-brand-black`}>{expirationDate}</Text>
              </Section>

              <Text className="dm-text m-0 mb-6 text-[15px] leading-relaxed text-[#333333]">{copy.message(props)}</Text>

              <Section className="text-center">
                <Button href={ctaUrl} className="rounded-xl bg-brand-orange px-8 py-4 text-[15px] font-bold text-brand-black no-underline">
                  {ctaLabel}
                </Button>
              </Section>
            </Section>

            <Hr className="dm-hr m-0 border-[#e6e6e6]" />
            <Section className="px-8 py-5 text-center">
              <Text className="m-0 text-[12px] leading-relaxed text-[#8a8a8a]">Kandrop © 2026. Recebeu este e-mail porque tem uma loja na Kandrop.</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

/** Sample data for the `react-email` preview (`npx email dev`); never used when sending. */
KandropSubscriptionEmail.PreviewProps = {
  kind: "reminder",
  shopName: "Loja Exemplo",
  daysLeft: 3,
  expirationDate: "5 de outubro de 2026",
  planName: "Starter",
  renewalAmount: "8 799 Kz",
  ctaUrl: "https://wa.me/244900000000",
} satisfies KandropSubscriptionEmailProps;

export default KandropSubscriptionEmail;
