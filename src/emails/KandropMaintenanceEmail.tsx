import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Tailwind, Text } from "@react-email/components";
import { DarkModeStyles, EMAIL_TAILWIND, EmailLogo } from "./parts";

export interface KandropMaintenanceEmailProps {
  shopName: string;
  /** What is being done, in a sentence: "Melhorias de performance e atualizações no catálogo". */
  reason: string;
  /** Already formatted for the reader, e.g. "5 de outubro de 2026, 22:00" (Luanda time). `null` when not announced. */
  startsAt: string | null;
  endsAt: string | null;
  /** A free-text estimate ("cerca de 2 horas"), used when there is no end time (or besides it). */
  duration: string | null;
  /** Where the button goes: the support WhatsApp (`https://wa.me/...`), or `mailto:`. */
  ctaUrl: string;
}

/** Sent to every merchant before a planned maintenance of the platform. */
export function KandropMaintenanceEmail({ shopName, reason, startsAt, endsAt, duration, ctaUrl }: KandropMaintenanceEmailProps) {
  const rows: Array<[string, string]> = [];
  if (startsAt) rows.push(["Início previsto", startsAt]);
  if (endsAt) rows.push(["Término previsto", endsAt]);
  if (duration) rows.push(["Duração estimada", duration]);

  return (
    <Html lang="pt">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <DarkModeStyles />
      </Head>
      <Preview>Manutenção programada da Kandrop: {reason}</Preview>
      <Tailwind config={EMAIL_TAILWIND}>
        <Body className="dm-page m-0 bg-[#f6f6f6] py-6 font-sans">
          <Container className="dm-card mx-auto max-w-[560px] overflow-hidden rounded-2xl bg-white">
            <Section className="px-8 pt-8 pb-2 text-center">
              <EmailLogo />
            </Section>

            <Section className="px-8 pt-4 pb-8">
              <Heading as="h1" className="dm-title m-0 mb-3 text-[22px] leading-tight font-bold text-brand-black">
                Manutenção programada
              </Heading>
              <Text className="dm-text m-0 mb-5 text-[15px] leading-relaxed text-[#333333]">Olá, equipa da {shopName}.</Text>

              <Section className="dm-box mb-5 rounded-xl bg-[#fff0e6] px-6 py-5">
                <Text className="m-0 text-[11px] font-bold tracking-[0.18em] text-brand-orange uppercase">Atualização do sistema</Text>
                <Text className="dm-title m-0 mt-1 text-[17px] leading-snug font-bold text-brand-black">{reason}</Text>
                {rows.map(([label, value]) => (
                  <Text key={label} className="dm-title m-0 mt-3 text-[14px] leading-snug text-brand-black">
                    <span className="text-[11px] font-bold tracking-[0.14em] text-brand-orange uppercase">{label}</span>
                    <br />
                    <span className="font-semibold">{value}</span>
                  </Text>
                ))}
              </Section>

              <Text className="dm-text m-0 mb-6 text-[15px] leading-relaxed text-[#333333]">
                Durante este período o painel e as lojas podem ficar temporariamente indisponíveis. Os dados das suas lojas e dos seus pedidos estão seguros e não são afetados. A plataforma regressa assim que a manutenção terminar. Se tiver alguma dúvida, estamos à disposição.
              </Text>

              <Section className="text-center">
                <Button href={ctaUrl} className="rounded-xl bg-brand-orange px-8 py-4 text-[15px] font-bold text-brand-black no-underline">
                  Canal de Suporte
                </Button>
              </Section>
            </Section>

            <Hr className="dm-hr m-0 border-[#e6e6e6]" />
            <Section className="px-8 py-5 text-center">
              <Text className="m-0 text-[12px] leading-relaxed text-[#8a8a8a]">Kandrop © 2026. Este é um aviso automático de manutenção.</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

/** Sample data for the `react-email` preview (`npx email dev`); never used when sending. */
KandropMaintenanceEmail.PreviewProps = {
  shopName: "Loja Exemplo",
  reason: "Melhorias de performance e atualizações no catálogo",
  startsAt: "5 de outubro de 2026, 22:00",
  endsAt: "6 de outubro de 2026, 00:00",
  duration: "cerca de 2 horas",
  ctaUrl: "https://wa.me/244900000000",
} satisfies KandropMaintenanceEmailProps;

export default KandropMaintenanceEmail;
