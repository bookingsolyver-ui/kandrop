"use client";

/**
 * LiquidMetalButton — PRD 3.2 / botões CTA.
 * Adaptação do padrão LiquidMetal com paleta Kandrop:
 *   · Shader metálico com dominante laranja (#FF5A00) — shiftRed alto, shiftBlue baixo
 *   · Interior escuro com toque laranja (#0D0500 → #000000)
 *   · Texto branco bold (legível sobre fundo escuro)
 *   · Glow laranja nos ripples e sombras hover
 *   · Foco visível com anel laranja (PRD 3.2)
 *
 * Uso:
 *   <LiquidMetalButton label="Entrar na lista de espera" href="#formulario" />
 *   <LiquidMetalButton label="Entrar na lista de espera" onClick={fn} size="lg" />
 */

import { liquidMetalFragmentShader, ShaderMount } from "@paper-design/shaders";
import type React from "react";
import { useEffect, useRef, useState } from "react";

type ShaderMountInstance = InstanceType<typeof ShaderMount>;

interface LiquidMetalButtonProps {
  label?: string;
  /** Se href estiver definido, o botão renderiza como <a> */
  href?: string;
  onClick?: () => void;
  /** sm = 36px altura | md = 44px (defeito) | lg = 52px */
  size?: "sm" | "md" | "lg";
  /** Se true, o botão fica desactivado e com cursor not-allowed */
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}

/* ─── dimensões por tamanho ─────────────────────────────────── */
const SIZES = {
  sm: { height: 36, paddingX: 20, fontSize: 13, fontWeight: 600 },
  md: { height: 44, paddingX: 26, fontSize: 14, fontWeight: 700 },
  lg: { height: 52, paddingX: 32, fontSize: 16, fontWeight: 700 },
} as const;

/* ─── uniforms do shader — paleta laranja quente ────────────── */
const SHADER_UNIFORMS = {
  u_repetition: 4,
  u_softness:   0.45,
  u_shiftRed:   0.72,   // dominante vermelho/laranja  ↑
  u_shiftBlue:  0.04,   // azul quase zero             ↓
  u_distortion: 0.08,
  u_contour:    0.1,
  u_angle:      38,
  u_scale:      9,
  u_shape:      1,
  u_offsetX:    0.08,
  u_offsetY:   -0.08,
};

export function LiquidMetalButton({
  label = "Entrar na lista de espera",
  href,
  onClick,
  size = "md",
  disabled = false,
  className = "",
  type = "button",
}: LiquidMetalButtonProps) {
  const [isHovered, setIsHovered]   = useState(false);
  const [isPressed, setIsPressed]   = useState(false);
  const [ripples, setRipples]       = useState<{ x: number; y: number; id: number }[]>([]);
  const shaderRef   = useRef<HTMLDivElement>(null);
  // biome-ignore lint/suspicious/noExplicitAny: external library
  const shaderMount = useRef<ShaderMountInstance | null>(null);
  const triggerRef  = useRef<HTMLElement>(null);
  const rippleId    = useRef(0);

  const { height, paddingX, fontSize, fontWeight } = SIZES[size];
  const innerH = height - 4; // margem de 2px em cima e em baixo

  /* ── injetar keyframes de ripple uma só vez ── */
  useEffect(() => {
    const id = "kd-ripple-keyframes";
    if (document.getElementById(id)) return;
    const s = document.createElement("style");
    s.id = id;
    s.textContent = `
      @keyframes kd-ripple {
        0%   { transform: translate(-50%,-50%) scale(0); opacity: 0.7; }
        100% { transform: translate(-50%,-50%) scale(5); opacity: 0; }
      }
      .kd-shader-wrap canvas {
        width: 100% !important; height: 100% !important;
        display: block !important; position: absolute !important;
        top: 0 !important; left: 0 !important;
        border-radius: 100px !important;
      }
    `;
    document.head.appendChild(s);
  }, []);

  /* ── montar shader ── */
  useEffect(() => {
    if (!shaderRef.current || disabled) return;
    shaderMount.current?.dispose?.();
    shaderMount.current = new ShaderMount(
      shaderRef.current,
      liquidMetalFragmentShader,
      SHADER_UNIFORMS,
      undefined,
      0.5,
    );
    return () => { shaderMount.current?.dispose?.(); shaderMount.current = null; };
  }, [disabled]);

  /* ── handlers ── */
  const onEnter = () => {
    if (disabled) return;
    setIsHovered(true);
    shaderMount.current?.setSpeed?.(1.1);
  };
  const onLeave = () => {
    setIsHovered(false);
    setIsPressed(false);
    shaderMount.current?.setSpeed?.(0.5);
  };
  const onDown = () => { if (!disabled) setIsPressed(true); };
  const onUp   = () => setIsPressed(false);

  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (disabled) return;
    shaderMount.current?.setSpeed?.(2.6);
    setTimeout(() => shaderMount.current?.setSpeed?.(isHovered ? 1.1 : 0.5), 350);

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const rip  = { x: e.clientX - rect.left, y: e.clientY - rect.top, id: rippleId.current++ };
    setRipples(p => [...p, rip]);
    setTimeout(() => setRipples(p => p.filter(r => r.id !== rip.id)), 650);

    onClick?.();
  };

  /* ── estilos calculados ── */
  const pressScale  = isPressed ? "translateY(1px) scale(0.98)" : "translateY(0) scale(1)";
  const outerShadow = disabled
    ? "none"
    : isPressed
      ? "0 0 0 1px rgba(255,90,0,0.3), 0 1px 2px rgba(0,0,0,0.4)"
      : isHovered
        ? "0 0 0 1px rgba(255,90,0,0.5), 0 8px 24px rgba(255,90,0,0.30), 0 4px 8px rgba(0,0,0,0.25)"
        : "0 0 0 1px rgba(255,90,0,0.25), 0 16px 32px rgba(0,0,0,0.18), 0 4px 12px rgba(255,90,0,0.15)";

  /* ── camadas internas (reutilizadas para <a> e <button>) ── */
  const innerLayers = (
    <>
      {/* Texto — z:30 */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 8, zIndex: 30, pointerEvents: "none",
        transform: "translateZ(20px)",
      }}>
        <span style={{
          fontSize, fontWeight, color: "#FFFFFF",
          letterSpacing: "0.01em",
          textShadow: "0 1px 3px rgba(0,0,0,0.6)",
          whiteSpace: "nowrap",
          opacity: disabled ? 0.5 : 1,
          transition: "opacity 0.2s",
        }}>
          {label}
        </span>
        {/* Seta → */}
        <svg width={fontSize} height={fontSize} viewBox="0 0 16 16" fill="none"
          style={{ opacity: disabled ? 0.4 : 1, flexShrink: 0 }}>
          <path d="M3 8h10M9 4l4 4-4 4" stroke="#FFFFFF" strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Interior escuro — z:20 */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 20,
        transform: `translateZ(10px) ${pressScale}`,
        transition: "transform 0.15s cubic-bezier(0.4,0,0.2,1)",
      }}>
        <div style={{
          width: `calc(100% - 4px)`, height: innerH,
          margin: "2px",
          borderRadius: 100,
          background: "linear-gradient(180deg, #1a0800 0%, #000000 100%)",
          boxShadow: isPressed
            ? "inset 0 2px 6px rgba(0,0,0,0.6)"
            : "none",
          transition: "box-shadow 0.15s ease",
        }} />
      </div>

      {/* Shader metálico laranja — z:10 */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 10,
        transform: `translateZ(0px) ${pressScale}`,
        transition: "transform 0.15s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: outerShadow,
        borderRadius: 100,
      }}>
        <div
          ref={shaderRef}
          className="kd-shader-wrap"
          style={{
            width: "100%", height: "100%",
            borderRadius: 100, overflow: "hidden", position: "relative",
          }}
        />
      </div>

      {/* Ripples */}
      {ripples.map(r => (
        <span key={r.id} style={{
          position: "absolute", left: r.x, top: r.y,
          width: 18, height: 18, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,160,60,0.55) 0%, rgba(255,90,0,0) 70%)",
          pointerEvents: "none", zIndex: 50,
          animation: "kd-ripple 0.65s ease-out forwards",
        }} />
      ))}
    </>
  );

  /* ── estilos do contentor externo ── */
  const wrapStyle: React.CSSProperties = {
    position: "relative",
    display: "inline-block",
    width: "fit-content",
    perspective: "1000px",
    perspectiveOrigin: "50% 50%",
  };

  const boxStyle: React.CSSProperties = {
    position: "relative",
    height,
    paddingLeft: paddingX,
    paddingRight: paddingX,
    transformStyle: "preserve-3d",
    borderRadius: 100,
    cursor: disabled ? "not-allowed" : "pointer",
    outline: "none",
    overflow: "hidden",
    background: "transparent",
    border: "none",
    WebkitTapHighlightColor: "transparent",
  };

  const commonProps = {
    onMouseEnter: onEnter,
    onMouseLeave: onLeave,
    onMouseDown:  onDown,
    onMouseUp:    onUp,
    onClick:      handleClick,
    "aria-label": label,
    "aria-disabled": disabled || undefined,
    className: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${className}`,
    style: boxStyle,
  };

  return (
    <div style={wrapStyle}>
      {href && !disabled ? (
        <a href={href} ref={triggerRef as React.Ref<HTMLAnchorElement>} {...commonProps}>
          {innerLayers}
        </a>
      ) : (
        <button
          ref={triggerRef as React.Ref<HTMLButtonElement>}
          type={type}
          disabled={disabled}
          {...commonProps}
        >
          {innerLayers}
        </button>
      )}
    </div>
  );
}
