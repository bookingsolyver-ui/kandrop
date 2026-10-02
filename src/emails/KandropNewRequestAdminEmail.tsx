import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Tailwind, Text } from "@react-email/components";
import { DarkModeStyles, EMAIL_TAILWIND, EmailLogo } from "./parts";

export interface KandropNewRequestAdminEmailProps {
  shopName: string;
  /** The merchant's e-mail. */
  merchantEmail: string;
  /** "Starter" or "Pro". */
  planName: string;
  /** Already formatted, e.g. "5 de outubro de 2026, 14:32" (Luanda time). */
  requestedAt: string;
  /** The approvals tab of the operator console. */
  approvalsUrl?: string;
}

/** Sent to the administrators the moment a merchant submits a request for a plan. */
export function KandropNewRequestAdminEmail({ shopName, merchantEmail, planName, requestedAt, approvalsUrl = "https://kandrop.com/admin/subscricoes" }: KandropNewRequestAdminEmailProps) {
  const rows: Array<[string, string]> = [
    ["Loja", shopName],
    ["E-mail do lojista", merchantEmail],
    ["Plano solicitado", planName],
    ["Pedido em", requestedAt],
  ];
  return (
    <Html lang="pt">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <DarkModeStyles />
      </Head>
      <Preview>Novo pedido de adesão: {shopName} pediu o plano {planName}</Preview>
      <Tailwind config={EMAIL_TAILWIND}>
        <Body className="dm-page m-0 bg-[#f6f6f6] py-6 font-sans">
          <Container className="dm-card mx-auto max-w-[560px] overflow-hidden rounded-2xl bg-white">
            <Section className="px-8 pt-8 pb-2 text-center">
              <EmailLogo />
            </Section>

            <Section className="px-8 pt-4 pb-8">
              <Heading as="h1" className="dm-title m-0 mb-3 text-[22px] leading-tight font-bold text-brand-black">
                Novo pedido de adesão
              </Heading>
              <Text className="dm-text m-0 mb-5 text-[15px] leading-relaxed text-[#333333]">
                Um lojista acabou de submeter um pedido e aguarda a confirmação do pagamento e a aprovação da conta.
              </Text>

              <Section className="dm-box mb-6 rounded-xl bg-[#fff0e6] px-6 py-5">
                {rows.map(([label, value]) => (
                  <Text key={label} className="dm-title m-0 mb-3 text-[14px] leading-snug text-brand-black">
                    <span className="text-[11px] font-bold tracking-[0.14em] text-brand-orange uppercase">{label}</span>
                    <br />
                    <span className="font-semibold">{value}</span>
                  </Text>
                ))}
              </Section>

              <Section className="text-center">
                <Button href={approvalsUrl} className="rounded-xl bg-brand-orange px-8 py-4 text-[15px] font-bold text-brand-black no-underline">
                  Ver aprovações pendentes
                </Button>
              </Section>
            </Section>

            <Hr className="dm-hr m-0 border-[#e6e6e6]" />
            <Section className="px-8 py-5 text-center">
              <Text className="m-0 text-[12px] leading-relaxed text-[#8a8a8a]">Kandrop © 2026. Alerta automático para administradores.</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

/** Sample data for the `react-email` preview (`npx email dev`); never used when sending. */
KandropNewRequestAdminEmail.PreviewProps = {
  shopName: "Loja Exemplo",
  merchantEmail: "lojista@exemplo.com",
  planName: "Pro",
  requestedAt: "5 de outubro de 2026, 14:32",
} satisfies KandropNewRequestAdminEmailProps;

export default KandropNewRequestAdminEmail;
