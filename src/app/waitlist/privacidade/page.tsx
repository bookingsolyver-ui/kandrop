import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/waitlist/components/Logo";
import { copy, BRAND } from "@/waitlist/lib/copy";

export const metadata: Metadata = {
  title: `${copy.privacy.title} | ${BRAND}`,
  description: copy.privacy.intro,
};

/**
 * FR-26 — Página /privacidade
 * Linguagem simples, mobile-first, fundo escuro, texto branco, títulos em negrito,
 * largura de leitura máx. 720px, contraste AA.
 */
export default function PrivacidadePage() {
  const p = copy.privacy;
  const rawEmail = process.env.NEXT_PUBLIC_PRIVACY_EMAIL;
  const privacyEmail = rawEmail && rawEmail.trim() !== "" ? rawEmail.trim() : null;

  return (
    <div className="min-h-screen bg-brand-black text-brand-white">
      {/* Navegação / Cabeçalho */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-brand-black/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[720px] items-center justify-between px-6 py-4">
          <Link href="/" className="inline-flex items-center gap-2">
            <Logo variant="inverted" size="sm" />
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-brand-white/70 transition-colors hover:text-brand-orange"
          >
            {p.backLink}
          </Link>
        </div>
      </header>

      {/* Conteúdo com largura de leitura de máx. 720px */}
      <main className="mx-auto w-full max-w-[720px] px-6 py-12 sm:py-20">
        <header className="mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-brand-white sm:text-4xl">
            {p.title}
          </h1>
          <p className="mt-4 text-base leading-7 text-brand-white/80">
            {p.intro}
          </p>
          <p className="mt-2 text-xs font-medium text-brand-white/50">
            {p.lastUpdated}
          </p>
        </header>

        <article className="space-y-10 text-base leading-7 text-brand-white/80">
          {/* 1. Quem somos */}
          <section id="quem-somos">
            <h2 className="text-xl font-bold tracking-tight text-brand-white sm:text-2xl">
              1. Quem somos
            </h2>
            <p className="mt-3">
              A Kandrop é uma plataforma de dropshipping que liga vendedores angolanos a fornecedores chineses. Somos os responsáveis pelos dados que nos deixas.
            </p>
          </section>

          {/* 2. Que dados recolhemos */}
          <section id="que-dados-recolhemos">
            <h2 className="text-xl font-bold tracking-tight text-brand-white sm:text-2xl">
              2. Que dados recolhemos
            </h2>

            <div className="mt-4">
              <p className="font-semibold text-brand-white">O que tu preenches:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-brand-white/80">
                <li>O teu nome.</li>
                <li>O teu número de WhatsApp.</li>
                <li>O teu e-mail, se o deixares.</li>
                <li>O teu perfil (por exemplo, &quot;Quero começar a vender&quot;), se o escolheres.</li>
              </ul>
            </div>

            <div className="mt-6">
              <p className="font-semibold text-brand-white">O que geramos por ti:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-brand-white/80">
                <li>O teu código e link pessoal de convite.</li>
                <li>A tua posição na lista.</li>
                <li>A data e a hora em que aceitaste esta política.</li>
              </ul>
            </div>

            <div className="mt-6">
              <p className="font-semibold text-brand-white">Dados técnicos:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-brand-white/80">
                <li>O tipo de aparelho (telemóvel, computador ou tablet).</li>
                <li>O teu país, deduzido do indicativo do número.</li>
                <li>De onde vieste (por exemplo, Instagram ou o link de um amigo).</li>
              </ul>
            </div>

            <p className="mt-4 text-sm font-medium text-brand-white/70">
              Não pedimos palavras-passe, dados bancários nem documentos.
            </p>
          </section>

          {/* 3. Para que usamos os teus dados */}
          <section id="para-que-usamos">
            <h2 className="text-xl font-bold tracking-tight text-brand-white sm:text-2xl">
              3. Para que usamos os teus dados
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-brand-white/80">
              <li>Para te avisar do lançamento oficial da plataforma.</li>
              <li>Para gerir a lista de espera e o teu acesso antecipado.</li>
              <li>Para contar os convites que fizeres e te dar as recompensas.</li>
              <li>Para perceber de onde vêm as inscrições e melhorar a página.</li>
            </ul>
            <p className="mt-4 text-sm font-medium text-brand-white/70">
              Não usamos os teus dados para mais nada sem te perguntar antes.
            </p>
          </section>

          {/* 4. Quem tem acesso */}
          <section id="quem-tem-acesso">
            <h2 className="text-xl font-bold tracking-tight text-brand-white sm:text-2xl">
              4. Quem tem acesso
            </h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-brand-white/80">
              <li>A equipa da Kandrop, com acesso limitado a quem precisa.</li>
              <li>
                Os serviços que usamos para fazer isto funcionar: Vercel (a página), n8n (a automação) e Google Sheets (a lista). Estes serviços podem guardar dados em servidores fora de Angola.
              </li>
              <li>Quem te convidou nunca vê os teus dados. Só fica a saber que o convite contou.</li>
            </ul>
            <p className="mt-4 text-sm font-medium text-brand-white/70">
              Não vendemos nem alugamos os teus dados a ninguém.
            </p>
          </section>

          {/* 5. Quanto tempo guardamos */}
          <section id="quanto-tempo-guardamos">
            <h2 className="text-xl font-bold tracking-tight text-brand-white sm:text-2xl">
              5. Quanto tempo guardamos
            </h2>
            <p className="mt-3">
              Até 6 meses depois do lançamento, ou até pedires a eliminação, o que acontecer primeiro.
            </p>
          </section>

          {/* 6. Os teus direitos */}
          <section id="os-teus-direitos">
            <h2 className="text-xl font-bold tracking-tight text-brand-white sm:text-2xl">
              6. Os teus direitos
            </h2>
            <p className="mt-3">Podes pedir-nos a qualquer momento para:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-brand-white/80">
              <li>ver os dados que temos sobre ti;</li>
              <li>corrigir o que estiver errado;</li>
              <li>eliminar os teus dados;</li>
              <li>opor-te a que os usemos.</li>
            </ul>

            <p className="mt-4">
              Como pedir: envia um e-mail para{" "}
              {privacyEmail ? (
                <a
                  href={`mailto:${privacyEmail}`}
                  className="font-semibold text-brand-orange underline underline-offset-4 hover:text-brand-orange/80"
                >
                  {privacyEmail}
                </a>
              ) : (
                <span className="font-medium text-brand-white/70">
                  {p.contactFallback}
                </span>
              )}{" "}
              com o teu nome e o número de WhatsApp com que te inscreveste. Se deixaste e-mail na inscrição, envia a partir desse mesmo e-mail. Podemos pedir-te informação adicional para confirmar que és tu antes de agirmos, para proteger os teus dados. Respondemos em até 7 dias úteis.
            </p>
          </section>

          {/* 7. Como protegemos os teus dados */}
          <section id="como-protegemos">
            <h2 className="text-xl font-bold tracking-tight text-brand-white sm:text-2xl">
              7. Como protegemos os teus dados
            </h2>
            <p className="mt-3">
              A lista só é vista pela equipa, com acessos pessoais e verificação em dois passos. A ligação à página é cifrada (HTTPS).
            </p>
          </section>

          {/* 8. O que guardamos no teu aparelho */}
          <section id="o-que-guardamos">
            <h2 className="text-xl font-bold tracking-tight text-brand-white sm:text-2xl">
              8. O que guardamos no teu aparelho
            </h2>
            <p className="mt-3">
              Guardamos no teu browser o teu código de convite, para te mostrar a tua posição quando voltares. Medimos as visitas de forma agregada, sem te identificar.
            </p>
          </section>

          {/* 9. Lei aplicável */}
          <section id="lei-aplicavel">
            <h2 className="text-xl font-bold tracking-tight text-brand-white sm:text-2xl">
              9. Lei aplicável
            </h2>
            <p className="mt-3">
              Seguimos a Lei n.º 22/11 (Lei da Protecção de Dados Pessoais de Angola), supervisionada pela Agência de Protecção de Dados (APD). Se estás fora de Angola, podem aplicar-se também as leis do teu país, e podes contactar a autoridade de protecção de dados de lá.
            </p>
          </section>

          {/* 10. Mudanças */}
          <section id="mudancas">
            <h2 className="text-xl font-bold tracking-tight text-brand-white sm:text-2xl">
              10. Mudanças
            </h2>
            <p className="mt-3">
              Se mudarmos alguma coisa importante, actualizamos esta página e a data no topo.
            </p>
          </section>
        </article>
      </main>

      {/* Rodapé da página de privacidade */}
      <footer className="border-t border-white/10 bg-black/40 py-8 text-center text-xs text-brand-white/50">
        <div className="mx-auto flex max-w-[720px] flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <p>© {new Date().getFullYear()} {BRAND}</p>
          <div>
            {privacyEmail ? (
              <a
                href={`mailto:${privacyEmail}`}
                className="underline underline-offset-4 transition-colors hover:text-brand-white"
              >
                {privacyEmail}
              </a>
            ) : (
              <span>{p.contactFallback}</span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
