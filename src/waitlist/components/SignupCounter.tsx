"use client";

/**
 * FR-19 — contador público de inscritos.
 * · Real, nunca inflacionado; aparece SÓ a partir de 50 inscritos
 *   (a regra showCounter já vem calculada de GET /api/stats).
 * · O endpoint envia Cache-Control (~2 min); aqui faz-se um único fetch por
 *   montagem, sem repetir a cada segundo.
 * · Sem avatares nem "+[X]" fabricados (PRD secção 3.6).
 */

import { useEffect, useState } from "react";
import { copy } from "@/waitlist/lib/copy";

export default function SignupCounter() {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((b: { total?: number; showCounter?: boolean } | null) => {
        if (alive && b && b.showCounter === true && typeof b.total === "number") {
          setTotal(b.total);
        }
      })
      .catch(() => {
        /* contador é opcional — falha em silêncio */
      });
    return () => {
      alive = false;
    };
  }, []);

  if (total === null) return null;
  const s = copy.stats;

  return (
    <p
      aria-label={s.ariaLabel.replace("{total}", String(total))}
      className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-sm text-brand-white/70"
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 rounded-full bg-brand-orange motion-safe:animate-pulse"
      />
      <span>
        <strong className="font-extrabold text-brand-white">{total}</strong> {s.label}
      </span>
    </p>
  );
}
