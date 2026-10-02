"use client";

/**
 * FR-12 — Campo WhatsApp com selector de país (+244 por defeito).
 * Seis indicativos: +244, +351, +55, +44, +33, +1 (PRD FR-12 — outros pendentes).
 * Bandeiras em SVG simples (sem emoji, sem biblioteca — NFR-02).
 * Teclado numérico em mobile (`inputMode="tel"`, `autoComplete="tel-national"`).
 */

import { useEffect, useId, useRef, useState } from "react";
import { IconChevronDown } from "@/waitlist/components/sections/icons";
import {
  DIALS,
  formatNational,
  type CountryIso,
} from "@/waitlist/lib/phone";

interface Country {
  iso: CountryIso;
  label: string;
}

const COUNTRIES: Country[] = [
  { iso: "AO", label: "Angola" },
  { iso: "MZ", label: "Moçambique" },
  { iso: "BR", label: "Brasil" },
  { iso: "PT", label: "Portugal" },
  { iso: "US", label: "Estados Unidos" },
];

/** Bandeiras reduzidas a formas geométricas — paleta aproximada real. */
function Flag({ iso }: { iso: CountryIso }) {
  const common = { viewBox: "0 0 20 14", className: "h-3.5 w-5 rounded-[2px]" };
  switch (iso) {
    case "AO": // Angola: vermelho / preto com emblema amarelo
      return (
        <svg {...common} aria-hidden="true">
          <rect width="20" height="7" fill="#CE1126" />
          <rect y="7" width="20" height="7" fill="#111" />
          <circle cx="10" cy="7" r="3" fill="none" stroke="#F9D616" strokeWidth="1.2" />
        </svg>
      );
    case "MZ": // Moçambique: verde, preto (orlas brancas), amarelo + triângulo vermelho com estrela
      return (
        <svg {...common} aria-hidden="true">
          <rect width="20" height="4.2" fill="#006600" />
          <rect y="4.2" width="20" height="0.7" fill="#fff" />
          <rect y="4.9" width="20" height="4.2" fill="#111" />
          <rect y="9.1" width="20" height="0.7" fill="#fff" />
          <rect y="9.8" width="20" height="4.2" fill="#FFD100" />
          <polygon points="0,0 8,7 0,14" fill="#D21034" />
          <polygon
            points="3,5.2 3.5,6.4 4.7,6.4 3.7,7.2 4.1,8.4 3,7.6 1.9,8.4 2.3,7.2 1.3,6.4 2.5,6.4"
            fill="#FFD100"
          />
        </svg>
      );
    case "BR": // Brasil: verde com losango amarelo e círculo azul
      return (
        <svg {...common} aria-hidden="true">
          <rect width="20" height="14" fill="#009B3A" />
          <path d="M10 1.5 18 7l-8 5.5L2 7z" fill="#FEDF00" />
          <circle cx="10" cy="7" r="2.4" fill="#002776" />
        </svg>
      );
    case "PT": // Portugal: verde / vermelho com esfera amarela
      return (
        <svg {...common} aria-hidden="true">
          <rect width="8" height="14" fill="#006600" />
          <rect x="8" width="12" height="14" fill="#FF0000" />
          <circle cx="8" cy="7" r="3" fill="#FFE800" stroke="#fff" strokeWidth="0.8" />
        </svg>
      );
    case "US": // Estados Unidos: estrelas e barras simplificado
      return (
        <svg {...common} aria-hidden="true">
          <rect width="20" height="14" fill="#fff" />
          {[0, 2, 4, 6, 8, 10, 12].map((y) => (
            <rect key={y} y={y} width="20" height="1" fill="#B22234" />
          ))}
          <rect width="9" height="7" fill="#3C3B6E" />
          {[1.5, 4, 6.5].map((x) =>
            [1.5, 4, 5.5].map((y) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="0.6" fill="#fff" />
            )),
          )}
        </svg>
      );
  }
}

interface PhoneInputProps {
  /** id do `<input>` (ligação com o `<label>` via htmlFor). */
  id?: string;
  /** Valor bruto (com o que o utilizador digitou/colou). */
  value: string;
  iso: CountryIso;
  onValueChange: (value: string) => void;
  onCountryChange: (iso: CountryIso) => void;
  onBlur?: () => void;
  invalid?: boolean;
  errorId?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function PhoneInput({
  id,
  value,
  iso,
  onValueChange,
  onCountryChange,
  onBlur,
  invalid = false,
  errorId,
  placeholder,
  disabled = false,
}: PhoneInputProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fecha ao clicar fora (e ao carregar em Escape)
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = COUNTRIES.find((c) => c.iso === iso) ?? COUNTRIES[0]!; // the list is never empty

  /** Limpa, detecta prefixo (+244/00244) e formata em grupos de 3 (FR-12). */
  function handleInput(v: string) {
    if (/^\+/.test(v) || /^00\d/.test(v)) {
      let digits = v.replace(/\D/g, "");
      if (digits.startsWith("00")) digits = digits.slice(2);
      const match = (Object.keys(DIALS) as CountryIso[])
        .filter((c) => digits.startsWith(DIALS[c]))
        .sort((a, b) => DIALS[b].length - DIALS[a].length)
        .find((c) => {
          const rest = digits.slice(DIALS[c].length);
          return rest.length >= 8 && rest.length <= 12;
        });
      if (match) {
        onCountryChange(match);
        onValueChange(formatNational(digits.slice(DIALS[match].length)));
        return;
      }
    }
    const digits = v.replace(/\D/g, "").slice(0, 12);
    onValueChange(v === "" || /^[\d\s()-]+$/.test(v) ? formatNational(digits) : v);
  }

  return (
    <div ref={rootRef} className="relative flex w-full items-stretch">
      {/* Selector de país */}
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`Indicativo: ${current.label} +${DIALS[current.iso]}`}
        onClick={() => setOpen((o) => !o)}
        className="flex shrink-0 items-center gap-1.5 rounded-l-xl border border-r-0 border-white/10 bg-white/[0.03] px-3 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange disabled:opacity-60"
      >
        <Flag iso={current.iso} />
        <span className="text-sm font-medium text-brand-white/80">
          +{DIALS[current.iso]}
        </span>
        <IconChevronDown
          className={`h-3.5 w-3.5 text-brand-white/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Escolher indicativo"
          className="absolute left-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#0d0d0d] py-1 shadow-2xl"
        >
          {COUNTRIES.map((c) => (
            <li key={c.iso}>
              <button
                type="button"
                role="option"
                aria-selected={c.iso === iso}
                onClick={() => {
                  onCountryChange(c.iso);
                  setOpen(false);
                  inputRef.current?.focus();
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline-none ${
                  c.iso === iso ? "text-brand-orange" : "text-brand-white/85"
                }`}
              >
                <Flag iso={c.iso} />
                <span className="flex-1">{c.label}</span>
                <span className="text-brand-white/45">+{DIALS[c.iso]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Número */}
      <input
        ref={inputRef}
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={errorId}
        onChange={(e) => handleInput(e.target.value)}
        onBlur={onBlur}
        className="w-full min-w-0 rounded-r-xl border border-white/10 bg-white/[0.03] px-3.5 py-3.5 text-base text-brand-white placeholder:text-brand-white/35 focus:border-brand-orange focus:outline-none disabled:opacity-60"
      />
    </div>
  );
}
