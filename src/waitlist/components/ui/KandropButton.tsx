"use client";

/**
 * KandropButton — Botão CTA laranja sólido (mobile-first).
 * Botão com cantos totalmente arredondados (rounded-full), texto preto de alto contraste,
 * feedback visual de toque e foco, sem elementos flutuantes ou setas deslizantes.
 */

import type React from "react";

interface KandropButtonProps {
  label?: string;
  mobileLabel?: string;
  href?: string;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
  /** Ex.: "_blank" com rel="noopener noreferrer" para a partilha WhatsApp (FR-25) */
  target?: string;
  rel?: string;
}

export function KandropButton({
  label = "Entrar na lista de espera",
  mobileLabel,
  href,
  onClick,
  size = "md",
  disabled = false,
  fullWidth = false,
  className = "",
  type = "button",
  target,
  rel,
}: KandropButtonProps) {
  const sizeConfig = {
    sm: {
      height: "h-10",
      text: "text-xs sm:text-sm font-bold",
      padding: "px-5 sm:px-6",
    },
    md: {
      height: "h-12",
      text: "text-sm sm:text-base font-bold",
      padding: "px-6 sm:px-8",
    },
    lg: {
      height: "h-13 sm:h-14",
      text: "text-base sm:text-lg font-extrabold",
      padding: "px-8 sm:px-10",
    },
  }[size];

  const baseClasses = [
    "inline-flex items-center justify-center rounded-full cursor-pointer text-center",
    "bg-brand-orange text-brand-black",
    "shadow-[0_4px_20px_rgba(255,90,0,0.3)] hover:shadow-[0_6px_26px_rgba(255,90,0,0.45)]",
    "hover:bg-[#FF6B1A] active:bg-[#E05200]",
    "hover:scale-[1.02] active:scale-[0.98]",
    "transition-all duration-200 ease-out",
    "touch-manipulation select-none [-webkit-tap-highlight-color:transparent]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-brand-black",
    sizeConfig.height,
    sizeConfig.text,
    fullWidth ? "w-full px-6" : `w-fit ${sizeConfig.padding}`,
    disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "",
    className,
  ].filter(Boolean).join(" ");

  const content = (
    <span className="whitespace-nowrap">
      {mobileLabel ? (
        <>
          <span className="inline sm:hidden">{mobileLabel}</span>
          <span className="hidden sm:inline">{label}</span>
        </>
      ) : (
        label
      )}
    </span>
  );

  if (href && !disabled) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        className={baseClasses}
        aria-label={label}
        onClick={onClick}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      className={baseClasses}
      aria-label={label}
      onClick={onClick}
    >
      {content}
    </button>
  );
}
