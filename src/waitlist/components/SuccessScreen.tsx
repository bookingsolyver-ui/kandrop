"use client";

/**
 * FR-15 a FR-17, FR-22 e FR-25 — ecrã de sucesso em modal (PRD secção 3.6):
 * modal sobre o fundo desfocado, selo circular laranja com visto, etiqueta
 * "#posição", link pessoal com botão Copiar ("Copiado!"), partilha no WhatsApp
 * e barra de progresso de convites com os níveis da secção 6.
 *
 * Renderizado em portal (document.body) — o hero tem transform/backdrop-filter
 * e quebraria o `position: fixed` dos descendentes.
 * Foco movido para o título (FR-17); Esc e clique no fundo fecham.
 */

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { KandropButton } from "@/waitlist/components/ui/KandropButton";
import { BRAND, copy } from "@/waitlist/lib/copy";

// Snapshot "sem share nativo" para o servidor (evita divergência de hidratação)
const subscribeNoop = () => () => {};

interface SuccessScreenProps {
  position: number;
  validInvites: number;
  shareUrl: string;
  onClose: () => void;
}

export default function SuccessScreen({
  position,
  validInvites,
  shareUrl,
  onClose,
}: SuccessScreenProps) {
  const s = copy.success;
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const onCloseRef = useRef(onClose);
  const [copied, setCopied] = useState(false);

  // Handler mais recente disponível para os listeners (e fechar com Esc)
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Terceira opção de partilha: nativa, só onde existir (FR-25)
  const canNative = useSyncExternalStore(
    subscribeNoop,
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );

  // Foco no título (FR-17), Esc fecha, scroll do corpo bloqueado no modal
  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const waText = `${s.whatsappText.replace("{brand}", BRAND)} ${shareUrl}`;
  const waHref = `https://wa.me/?text=${encodeURIComponent(waText)}`;

  // Progresso até ao nível seguinte (secção 6: 3 e 10 convites)
  const nextLevel = s.levels.find((l) => validInvites < l.at) ?? s.levels[s.levels.length - 1];
  const target = nextLevel?.at ?? 1;
  const pct = Math.min(100, Math.round((validInvites / target) * 100));
  const progressOf = s.progressOf
    .replace("{done}", String(validInvites))
    .replace("{total}", String(target));

  async function copyLink() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Fallback para contextos sem Clipboard API
        const ta = document.createElement("textarea");
        ta.value = shareUrl;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* silencioso — o link continua visível e seleccionável */
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: copy.meta.title, text: waText });
    } catch {
      /* utilizador cancelou */
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Fundo desfocado (o único blur da página — secção 3.6) */}
      <button
        type="button"
        aria-label={s.close}
        tabIndex={-1}
        onClick={() => onCloseRef.current()}
        className="absolute inset-0 h-full w-full cursor-default bg-brand-black/75 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-brand-black/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:p-8"
      >
        {/* Brilho no topo do cartão de vidro */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
        />

        <button
          type="button"
          onClick={() => onCloseRef.current()}
          aria-label={s.close}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-brand-white/65 transition hover:border-brand-orange/50 hover:text-brand-white focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M1 1l12 12M13 1L1 13" />
          </svg>
        </button>

        {/* Selo circular com visto (laranja com visto branco — nunca verde) */}
        <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-brand-orange/25 motion-safe:animate-ping"
          />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#FF8A3D] to-brand-orange text-brand-white shadow-[0_0_32px_rgba(255,90,0,0.45)]">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>
          <span className="absolute -bottom-1.5 rounded-full border border-brand-orange/50 bg-brand-black px-2.5 py-0.5 text-xs font-extrabold text-brand-orange shadow-lg">
            #{position}
          </span>
        </div>

        <div className="text-center">
          <h2
            id={titleId}
            ref={titleRef}
            tabIndex={-1}
            className="text-2xl font-extrabold text-brand-white focus:outline-none"
          >
            {s.title}
          </h2>
          <p className="mt-1.5 text-lg text-brand-white/80">
            {s.positionPrefix}
            <span className="font-bold text-brand-orange">{position}</span>
          </p>
        </div>

        {/* Link pessoal + copiar (FR-22 / FR-25) */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
          <p className="text-xs font-semibold tracking-wider text-brand-white/65 uppercase">
            {s.shareLabel}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate text-sm text-brand-white" title={shareUrl}>
              {shareUrl}
            </code>
            <button
              type="button"
              onClick={copyLink}
              className="shrink-0 rounded-lg border border-brand-orange/50 px-3 py-1.5 text-xs font-bold text-brand-orange transition hover:bg-brand-orange hover:text-brand-black focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none"
            >
              {copied ? s.copied : s.copyLink}
            </button>
          </div>
          <span aria-live="polite" className="sr-only">
            {copied ? s.copied : ""}
          </span>
        </div>

        {/* Botão principal: WhatsApp (FR-25) */}
        <div className="mt-4">
          <KandropButton
            label={s.whatsapp}
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            size="md"
            fullWidth
          />
        </div>
        {canNative && (
          <div className="mt-2 text-center">
            <button
              type="button"
              onClick={nativeShare}
              className="text-sm text-brand-white/65 underline underline-offset-2 transition hover:text-brand-white focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:outline-none"
            >
              {s.nativeShare}
            </button>
          </div>
        )}

        {/* Barra de progresso de convites (FR-17 + secção 6) */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-brand-white">{s.progressTitle}</p>
            <p className="text-sm font-extrabold text-brand-orange">{progressOf}</p>
          </div>
          <div
            role="progressbar"
            aria-valuenow={validInvites}
            aria-valuemin={0}
            aria-valuemax={target}
            aria-valuetext={progressOf}
            className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-white/10"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-orange to-[#FFA366] transition-[width] duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>

          <ul className="mt-3.5 space-y-2">
            {s.levels.map((l) => {
              const done = validInvites >= l.at;
              return (
                <li key={l.at} className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
                      done
                        ? "bg-brand-orange text-brand-black"
                        : "border border-white/25 text-brand-white/65"
                    }`}
                    aria-hidden="true"
                  >
                    {done ? "✓" : l.at}
                  </span>
                  <span className={`text-xs leading-5 ${done ? "text-brand-white" : "text-brand-white/65"}`}>
                    <span className="font-bold">{l.name}</span> — {l.text}
                    {done && <span className="ml-1 font-bold text-brand-orange">· {s.achieved}</span>}
                  </span>
                </li>
              );
            })}
          </ul>

          <p className="mt-3 text-xs leading-5 text-brand-white/65">{s.invitesNote}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
