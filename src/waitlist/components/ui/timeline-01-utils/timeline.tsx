"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import {
  motion,
  MotionConfig,
  useMotionValue,
  useSpring,
  type MotionValue,
} from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/waitlist/lib/utils";

export type TimelineItem = {
  title: string;
  description: string;
  /** Marcador apresentado à direita do título (numa timeline seria a "data"). */
  date?: string;
  image?: string;
  imageAlt?: string;
};

export type TimelineEnd = {
  title: string;
  label?: string;
  href?: string;
};

type TimelineProps = {
  items: TimelineItem[];
  /** Bloco de conclusão do percurso (fica antes do nó final). */
  end?: TimelineEnd;
  className?: string;
};

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Momentos do percurso (mesma semântica do `offset` do framer-motion):
 * - o topo da espinha começa quando entra a 70% da altura do ecrã;
 * - termina quando o fundo chega a 80% da altura do ecrã.
 */
const START_INSET = 0.7;
const END_INSET = 0.8;

/**
 * Mede o progresso da espinha com geometria sempre actual.
 *
 * `useScroll({ target })` só volta a medir em scroll/resize: se o layout mudar
 * depois do último scroll (swap de webfontes, imagens a carregar, conteúdo acima
 * a crescer), o valor fica velho e a espinha deixa de chegar ao nó terminal.
 * Aqui voltamos a medir também quando o tamanho do percurso ou do documento muda
 * (`ResizeObserver`) e quando as fontes ficam prontas — tudo event-driven, sem
 * leituras forçadas de layout a cada frame.
 */
function useTrackProgress(
  ref: RefObject<HTMLDivElement | null>,
  value: MotionValue<number>,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let stopped = false;
    let raf = 0;

    const measure = () => {
      if (stopped) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (stopped) return;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const range = rect.height - (END_INSET - START_INSET) * vh;
        const progress =
          range > 0 ? (START_INSET * vh - rect.top) / range : 0;
        value.set(Math.min(1, Math.max(0, progress)));
      });
    };

    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    observer?.observe(el);
    observer?.observe(document.body);
    document.fonts?.ready.then(measure).catch(() => {});

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, [ref, value]);
}

/** Espinha (nó) + conteúdo; alinhamento: nó 40px + gap 20px = 60px. */
const CONTENT_OFFSET = "pl-[60px]";

/**
 * Linha do tempo com scroll:
 * - espinha laranja que "desenha-se" à medida que se faz scroll;
 * - nós numerados que acendem quando são alcançados;
 * - palco de imagens fixo (sticky) que faz crossfade no passo activo;
 * - nó terminal de conclusão com CTA.
 */
export function Timeline({ items, end, className }: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const rawProgress = useMotionValue(0);
  const progress = useSpring(rawProgress, {
    stiffness: 200,
    damping: 24,
    mass: 0.3,
  });
  useTrackProgress(trackRef, rawProgress);

  const current = items[active] ?? items[0];

  return (
    <MotionConfig reducedMotion="user">
      <div className={cn("grid gap-12 lg:grid-cols-12 lg:gap-12", className)}>
        {/* ---------------------------------------------------------- */}
        {/* Palco de imagens fixo (desktop)                             */}
        {/* ---------------------------------------------------------- */}
        <div className="hidden lg:col-span-5 lg:block">
          <div className="lg:sticky lg:top-12">
            <div className="relative aspect-[4/5] max-h-[70vh] w-full overflow-clip rounded-3xl bg-brand-black/5 shadow-[0_35px_90px_-50px_rgba(255,90,0,0.75)] ring-1 ring-black/10">
              {items.map((item, i) =>
                item.image ? (
                  <Image
                    key={item.image}
                    src={item.image}
                    alt={item.imageAlt ?? ""}
                    fill
                    sizes="(max-width: 1023px) 1px, 34vw"
                    aria-hidden={i !== active}
                    className={cn(
                      "object-cover transition-all duration-700 ease-out motion-reduce:transition-none",
                      i === active
                        ? "scale-100 opacity-100"
                        : "scale-105 opacity-0",
                    )}
                  />
                ) : null,
              )}

              {/* Barras de progresso estilo "stories" */}
              <div className="absolute inset-x-4 top-4 z-10 flex gap-1.5">
                {items.map((item, i) => (
                  <span
                    key={item.title}
                    aria-hidden
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors duration-500 motion-reduce:transition-none",
                      i <= active ? "bg-brand-orange" : "bg-white/35",
                    )}
                  />
                ))}
              </div>

              {/* Legenda do passo activo */}
              <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-5 pb-5 pt-20">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: EASE }}
                >
                  {current?.date ? (
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-orange-light">
                      {current.date}
                    </p>
                  ) : null}
                  <p className="mt-1 text-lg font-bold text-brand-white">
                    {current?.title}
                  </p>
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* Espinha + passos                                            */}
        {/* ---------------------------------------------------------- */}
        <div ref={trackRef} className="relative lg:col-span-7">
          {/* Base da espinha */}
          <span
            aria-hidden
            className="absolute left-[19px] top-5 bottom-5 w-0.5 rounded-full bg-black/10"
          />
          {/* Progresso da espinha */}
          <motion.span
            aria-hidden
            style={{ scaleY: progress }}
            className="absolute left-[19px] top-5 bottom-5 w-0.5 origin-top rounded-full bg-gradient-to-b from-brand-orange via-brand-orange to-brand-orange-light shadow-[0_0_14px_rgba(255,90,0,0.55)]"
          />

          <ol className="space-y-10 lg:space-y-0">
            {items.map((item, i) => (
              <motion.li
                key={item.title}
                onViewportEnter={() => setActive(i)}
                viewport={{ margin: "-40% 0px -40% 0px" }}
                className="lg:min-h-[34vh]"
              >
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.6, ease: EASE }}
                  className="flex items-start gap-5"
                >
                  {/* Nó numerado — FR-05: número em círculo laranja */}
                  <span
                    className={cn(
                      "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-black transition-all duration-500 motion-reduce:transition-none",
                      i <= active
                        ? "bg-brand-orange text-brand-black shadow-[0_0_0_6px_rgba(255,90,0,0.15)]"
                        : "bg-brand-white text-brand-black/35 ring-1 ring-black/10",
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                      <h3 className="text-xl font-bold tracking-tight text-brand-black sm:text-2xl">
                        {item.title}
                      </h3>
                      {item.date ? (
                        <span className="shrink-0 rounded-full bg-brand-orange/10 px-2.5 py-1 text-[11px] font-bold tracking-wide text-brand-orange">
                          {item.date}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-2 max-w-prose text-sm leading-relaxed text-brand-black/65 sm:text-base">
                      {item.description}
                    </p>

                    {item.image ? (
                      <div className="relative mt-5 aspect-[16/10] w-full overflow-clip rounded-2xl ring-1 ring-black/10 lg:hidden">
                        <Image
                          src={item.image}
                          alt={item.imageAlt ?? ""}
                          fill
                          sizes="(max-width: 1023px) 100vw, 1px"
                          className="object-cover"
                        />
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              </motion.li>
            ))}
          </ol>

          {/* Conclusão do percurso */}
          {end ? (
            <div className={cn("mt-12 lg:mt-16", CONTENT_OFFSET)}>
              <p className="max-w-md text-sm font-semibold leading-relaxed text-brand-black/75 sm:text-base">
                {end.title}
              </p>
              {end.href && end.label ? (
                <a
                  href={end.href}
                  className="group mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-brand-orange transition-colors hover:text-brand-orange/80"
                >
                  {end.label}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
              ) : null}
            </div>
          ) : null}

          {/* Nó terminal — tem de ser o último elemento para a espinha terminar nele */}
          <div className="relative mt-6 h-10">
            <span className="absolute left-0 top-0 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange text-brand-black shadow-[0_0_0_6px_rgba(255,90,0,0.15)]">
              <Check className="h-5 w-5 stroke-[3]" aria-hidden />
            </span>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
