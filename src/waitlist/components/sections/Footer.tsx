import Logo from "@/waitlist/components/Logo";
import { BRAND, copy } from "@/waitlist/lib/copy";
import Image from "next/image";
import Link from "next/link";

/**
 * FR-10 — Rodapé com logotipo, Instagram oficial, links rápidos, privacidade e copyright.
 */
export default function Footer() {
  const rawEmail = process.env.NEXT_PUBLIC_PRIVACY_EMAIL;
  const privacyEmail = rawEmail && rawEmail.trim() !== "" ? rawEmail.trim() : null;

  return (
    <footer className="border-t border-white/5 bg-brand-black">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-6 py-12 text-center">
        <Logo variant="inverted" size="sm" />

        {/* Link para o Instagram Oficial */}
        <a
          href="https://www.instagram.com/kandrop.ecom/"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2.5 text-xs sm:text-sm font-medium text-brand-white/80 transition-colors hover:text-brand-white"
        >
          <Image
            src="/waitlist/images/instagram-colored.svg"
            alt="Instagram oficial da Kandrop"
            width={20}
            height={20}
            className="h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110"
            unoptimized
          />
          <span>
            Clica aqui para seguir no Instagram:{" "}
            <span className="font-semibold text-brand-white transition-colors group-hover:text-brand-orange">
              @kandrop.ecom
            </span>
          </span>
        </a>

        {/* Menu de navegação e políticas */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-brand-white/50">
          <a
            href="#hero"
            className="underline-offset-4 transition-colors hover:text-brand-white hover:underline"
          >
            Início
          </a>
          <a
            href="#formulario"
            className="underline-offset-4 transition-colors hover:text-brand-white hover:underline"
          >
            Lista de espera
          </a>
          <Link
            href="/waitlist/privacidade"
            className="underline-offset-4 transition-colors hover:text-brand-white hover:underline"
          >
            {copy.footer.privacy}
          </Link>

          {privacyEmail ? (
            <a
              href={`mailto:${privacyEmail}`}
              className="underline-offset-4 transition-colors hover:text-brand-white hover:underline"
            >
              Contacto: {privacyEmail}
            </a>
          ) : (
            <span className="text-xs text-brand-white/40">
              {copy.privacy.contactFallback}
            </span>
          )}
        </div>

        <p className="text-xs text-brand-white/40">
          © {new Date().getFullYear()} {BRAND}. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
