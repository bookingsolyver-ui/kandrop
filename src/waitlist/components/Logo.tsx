"use client";

import { useState } from "react";
import { BRAND } from "@/waitlist/lib/copy";

/**
 * Logótipo Kandrop — PRD 3.4.
 *
 * Símbolo quadrado (557×557) + wordmark "KandaDrop" lado a lado.
 *   · variant="positive"  → /logo.svg         (fundo laranja, K branco)   — sobre fundos claros
 *   · variant="inverted"  → /logo-inverted.svg (fundo transparente, K laranja) — sobre fundos escuros
 *
 * size="sm"  → ícone 28px, texto sm
 * size="md"  → ícone 36px, texto base   (defeito)
 * size="lg"  → ícone 48px, texto xl
 *
 * Troca pelo definitivo: substituir os ficheiros em public/. Sem mexer aqui.
 */
export default function Logo({
  variant = "positive",
  size = "md",
  className = "",
}: {
  variant?: "positive" | "inverted";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [iconFailed, setIconFailed] = useState(false);

  const src = variant === "inverted" ? "/waitlist/logo-inverted.svg" : "/waitlist/logo.svg";

  const sizeMap = {
    sm: { icon: 28, text: "text-sm",  gap: "gap-2" },
    md: { icon: 36, text: "text-base", gap: "gap-2.5" },
    lg: { icon: 48, text: "text-xl",  gap: "gap-3" },
  };

  const { icon, text, gap } = sizeMap[size];

  const wordmarkColor =
    variant === "inverted" ? "text-brand-white" : "text-brand-black";

  return (
    <span className={`inline-flex items-center ${gap} ${className}`}>
      {/* Símbolo quadrado */}
      {iconFailed ? (
        /* Fallback: quadrado laranja com "K" */
        <span
          className="inline-flex shrink-0 items-center justify-center rounded-md bg-brand-orange font-extrabold text-brand-white"
          style={{ width: icon, height: icon, fontSize: icon * 0.55 }}
          aria-hidden="true"
        >
          K
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          aria-hidden="true"
          width={icon}
          height={icon}
          className="shrink-0 rounded-md"
          style={{ width: icon, height: icon }}
          onError={() => setIconFailed(true)}
        />
      )}

      {/* Wordmark */}
      <span
        className={`font-extrabold tracking-tight ${text} ${wordmarkColor}`}
      >
        {BRAND}
      </span>
    </span>
  );
}

