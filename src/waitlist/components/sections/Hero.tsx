"use client";

import Countdown from "@/waitlist/components/Countdown";
import AnimatedBackground from "@/waitlist/components/hero/AnimatedBackground";
import SignupCounter from "@/waitlist/components/SignupCounter";
import WaitlistForm from "@/waitlist/components/WaitlistForm";
import { KandropButton } from "@/waitlist/components/ui/KandropButton";
import { BRAND, copy } from "@/waitlist/lib/copy";
import { useLaunchMode } from "@/waitlist/components/LaunchModeProvider";

import { Bell, Zap, ShieldCheck } from "lucide-react";

/**
 * FR-02 — Hero. Fundo preto com atmosfera da referência (secção 3.6),
 * paleta só laranja/preto/branco. Countdown com 60 dias e convite para o Instagram oficial.
 */
export default function Hero() {
  const mode = useLaunchMode();
  const h = copy.hero;
  const isLaunched = mode === "launched";

  return (
    <section id="hero" className="relative overflow-hidden bg-brand-black">
      <AnimatedBackground />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-6 pb-12 pt-32 text-center sm:pb-16 sm:pt-40">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-brand-white/50">
          {h.eyebrow}
        </p>

        <h1 className="text-3xl font-extrabold leading-[1.12] tracking-tight text-brand-white sm:text-5xl md:text-6xl">
          {h.titlePre}
          <span className="text-gradient-orange">{h.titleHighlight}</span>
          {h.titlePost}
        </h1>

        <p className="mt-5 max-w-xl text-sm leading-6 text-brand-white/70 sm:text-lg sm:leading-7">
          {h.subtitle}
        </p>

        {!isLaunched && (
          <div className="mt-8 flex flex-col items-center text-center">
            <Countdown />
            <a
              href="https://www.instagram.com/kandrop.ecom/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 text-center text-xs font-medium text-brand-white/70 transition-colors hover:text-brand-white"
            >
              A data oficial será anunciada no Instagram{" "}
              <span className="font-semibold text-brand-white transition-colors hover:text-brand-orange">
                @kandrop.ecom
              </span>
            </a>
          </div>
        )}

        {/* FR-19 — contador real, só visível com ≥ 50 inscritos */}
        <SignupCounter />

        {isLaunched && (
          <p className="mt-8 text-2xl font-bold text-brand-orange">
            {copy.launched.badge.replace("{brand}", BRAND)}
          </p>
        )}

        {/* CTA principal — w-fit proporcional, perfeitamente centrado */}
        <div className="mt-8 flex justify-center w-full">
          {isLaunched ? (
            <KandropButton
              label={copy.launched.cta.replace("{brand}", BRAND)}
              href={process.env.NEXT_PUBLIC_MARKETPLACE_URL ?? "#"}
              size="lg"
            />
          ) : (
            <KandropButton
              label={h.cta}
              href="#formulario"
              size="lg"
            />
          )}
        </div>

        <p className="mt-5 text-sm text-brand-white/50">{h.microtext}</p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-brand-orange">
          {h.disclaimer}
        </p>

        {!isLaunched && (
          <>
            <div
              id="formulario"
              className="glass mt-12 w-full max-w-md rounded-2xl p-6 text-left sm:p-8"
            >
              <WaitlistForm />
            </div>

            {/* Card Explicativo — O que é a Lista de Espera */}
            <div className="mt-12 w-full max-w-2xl rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left backdrop-blur-md sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-orange">
                Acesso Antecipado
              </p>

              <h2 className="mt-2 text-xl font-bold tracking-tight text-brand-white sm:text-2xl">
                O que é a Lista de Espera da Kandrop?
              </h2>

              <p className="mt-3 text-sm leading-relaxed text-brand-white/70 sm:text-base">
                A Kandrop está na fase final de preparação para ligar o comércio angolano diretamente a preços de fábrica na China, com stock físico e entrega em 24h em Luanda. Como as vagas de fornecedores e produtos nos primeiros lotes serão limitadas, criámos esta lista para dar prioridade a quem quer começar a vender primeiro.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-3 sm:gap-4">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 text-brand-orange">
                    <Bell className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-white">
                      Aviso Direto
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-brand-white/60">
                    No minuto em que a plataforma abrir, recebes o convite no teu WhatsApp e E-mail antes do público geral.
                  </p>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 text-brand-orange">
                    <Zap className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-white">
                      Primeiros Lotes
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-brand-white/60">
                    Acesso preferencial ao catálogo validado com mais de 500 produtos e margens reais de 60% a 75%.
                  </p>
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 text-brand-orange">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-white">
                      100% Gratuito
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-brand-white/60">
                    Entrar na lista não custa nada nem exige compromisso. É a tua reserva de vaga como pioneiro em Angola.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}