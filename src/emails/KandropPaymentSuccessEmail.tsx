import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Tailwind, Text } from "@react-email/components";
import { DarkModeStyles, EMAIL_TAILWIND, EmailLogo } from "./parts";

export interface KandropPaymentSuccessEmailProps {
  shopName: string;
  planName: string;
  /** Already formatted for the reader, e.g. "4 de novembro de 2026". */
  newExpirationDate: string;
  /** Where the button goes: the dashboard (through the login). */
  ctaUrl?: string;
}

/** Sent the moment an administrator confirms a payment and activates (or renews) an account. */
export function KandropPaymentSuccessEmail({ shopName, planName, newExpirationDate, ctaUrl = "https://kandrop.com/login" }: KandropPaymentSuccessEmailProps) {
  return (
    <Html lang="pt">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <DarkModeStyles />
      </Head>
      <Preview>Pagamento confirmado: a loja {shopName} está ativa até {newExpirationDate}</Preview>
      <Tailwind config={EMAIL_TAILWIND}>
        <Body className="dm-page m-0 bg-[#f6f6f6] py-6 font-sans">
          <Container className="dm-card mx-auto max-w-[560px] overflow-hidden rounded-2xl bg-white">
            <Section className="px-8 pt-8 pb-2 text-center">
              <EmailLogo />
            </Section>

            <Section className="px-8 pt-4 pb-8">
              <Heading as="h1" className="dm-title m-0 mb-3 text-[22px] leading-tight font-bold text-brand-black">
                Pagamento confirmado
              </Heading>
              <Text className="dm-text m-0 mb-5 text-[15px] leading-relaxed text-[#333333]">Olá, equipa de {shopName}.</Text>

              <Section className="mb-5 dm-box rounded-xl bg-[#fff0e6] px-6 py-5 text-center">
                <Text className="m-0 text-[11px] font-bold tracking-[0.18em] text-brand-orange uppercase">Pagamento confirmado com sucesso</Text>
                <Text className="dm-title m-0 mt-1 text-[22px] leading-tight font-extrabold text-brand-black">Plano {planName}</Text>
                <Text className="m-0 mt-3 text-[11px] font-bold tracking-[0.18em] text-brand-orange uppercase">Ativo até</Text>
                <Text className="dm-title m-0 mt-1 text-[20px] font-extrabold text-brand-black">{newExpirationDate}</Text>
              </Section>

              <Text className="dm-text m-0 mb-6 text-[15px] leading-relaxed text-[#333333]">
                A sua loja {shopName} está ativa, com acesso total ao painel e pronta para faturar. Obrigado por continuar com a Kandrop.
              </Text>

              <Section className="text-center">
                <Button href={ctaUrl} className="rounded-xl bg-brand-orange px-8 py-4 text-[15px] font-bold text-brand-black no-underline">
                  Aceder ao Painel
                </Button>
              </Section>
            </Section>

            <Hr className="dm-hr m-0 border-[#e6e6e6]" />
            <Section className="px-8 py-5 text-center">
              <Text className="m-0 text-[12px] leading-relaxed text-[#8a8a8a]">Kandrop © 2026. Recebeu este e-mail porque o seu pagamento foi registado com sucesso.</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

/** Sample data for the `react-email` preview (`npx email dev`); never used when sending. */
KandropPaymentSuccessEmail.PreviewProps = {
  shopName: "Loja Exemplo",
  planName: "Starter",
  newExpirationDate: "4 de novembro de 2026",
} satisfies KandropPaymentSuccessEmailProps;

export default KandropPaymentSuccessEmail;
