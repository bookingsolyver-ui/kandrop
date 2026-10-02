import Logo from "@/waitlist/components/Logo";
import { KandropButton } from "@/waitlist/components/ui/KandropButton";
import { copy } from "@/waitlist/lib/copy";

/**
 * FR-01 — Cabeçalho.
 * Logo à esquerda e CTA à direita.
 * No mobile usa mobileLabel="Lista de espera" para não esmagar a barra de navegação.
 */
export default function Header() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 sm:px-6 py-4 sm:py-5">
        <a href="#hero" aria-label="KandaDrop — voltar ao topo">
          <Logo variant="inverted" size="md" />
        </a>
        <KandropButton
          label={copy.nav.cta}
          mobileLabel={copy.nav.ctaMobile}
          href="#formulario"
          size="sm"
        />
      </div>
    </header>
  );
}
