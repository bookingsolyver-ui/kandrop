"use client";

import { useEffect, useRef } from "react";

/**
 * Partículas do hero — PRD 3.6.
 * Canvas 2D simples, sem WebGL nem bibliotecas. Orçamento:
 *  - 30 fps no máximo (acumulador de tempo, não 60 fps)
 *  - ~60 partículas em desktop, ~25 em mobile
 *  - devicePixelRatio limitado a 1.5 (evita pintar 3x pixels em retina)
 *  - pausa com visibilitychange + IntersectionObserver
 *  - prefers-reduced-motion: desenha uma vez, estático
 *  - monta em useEffect (depois da hidratação) → zero impacto no LCP
 *
 * Nota: as funções internas são arrow functions (const) e não function
 * declarations, para o TypeScript preservar o narrowing de canvas/ctx.
 */

const TARGET_FPS = 30;
const FRAME_INTERVAL = 1000 / TARGET_FPS;
const DESKTOP_COUNT = 60;
const MOBILE_COUNT = 25;
const MOBILE_MAX_WIDTH = 768;
const MAX_DPR = 1.5;

type Particle = {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  phase: number;
  speed: number;
};

export default function Particles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let particles: Particle[] = [];
    let rafId = 0;
    let lastTime = 0;
    let running = false;
    let width = 0;
    let height = 0;

    const targetCount = () =>
      window.innerWidth < MOBILE_MAX_WIDTH ? MOBILE_COUNT : DESKTOP_COUNT;

    const buildParticles = () => {
      const count = targetCount();
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.6 + Math.random() * 1.6,
        baseAlpha: 0.15 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.15 + Math.random() * 0.45,
      }));
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#FFFFFF";
      for (const p of particles) {
        const twinkle = media.matches
          ? 1
          : 0.5 + 0.5 * Math.sin(p.phase + time * 0.001 * p.speed);
        ctx.globalAlpha = p.baseAlpha * twinkle;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const loop = (time: number) => {
      if (!running) return;
      rafId = requestAnimationFrame(loop);
      if (time - lastTime < FRAME_INTERVAL) return;
      lastTime = time;
      draw(time);
    };

    const start = () => {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(loop);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(rafId);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildParticles();
      if (media.matches) draw(0);
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    const onMotionChange = () => {
      if (media.matches) {
        stop();
        draw(0);
      } else {
        start();
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) start();
          else stop();
        }
      },
      { threshold: 0 },
    );
    observer.observe(canvas);

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    media.addEventListener("change", onMotionChange);

    if (media.matches) draw(0);
    else start();

    return () => {
      stop();
      observer.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      media.removeEventListener("change", onMotionChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
