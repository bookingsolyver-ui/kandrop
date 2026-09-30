"use client";

import { useState } from "react";

const W = 600;
const H = 384;
const PAD = { top: 16, right: 16, bottom: 32, left: 52 };

const compact = (minor: number) => {
  const kz = minor / 100;
  if (kz >= 1_000_000) return `${+(kz / 1_000_000).toFixed(1)}M`;
  if (kz >= 1_000) return `${Math.round(kz / 1_000)}k`;
  return String(Math.round(kz));
};

/** Sales (gross) per day as an orange area chart, with a hover read-out. */
export function KaiSalesChart({
  points,
  label,
  formatMoney,
  formatDay,
}: {
  points: Array<{ date: string; gross: number }>;
  label: string;
  formatMoney: (minor: number) => string;
  formatDay: (iso: string) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.gross));
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const top = 4 * pow * ([1, 2, 2.5, 5, 10].find((m) => m * pow >= raw) ?? 10);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.gross).toFixed(1)}`).join(" ");
  const area = points.length
    ? `${line} L${x(points.length - 1).toFixed(1)},${PAD.top + innerH} L${x(0).toFixed(1)},${PAD.top + innerH} Z`
    : "";
  const ticks = [0, 1, 2, 3, 4].map((i) => (top / 4) * i);
  const shown = hover === null ? null : points[hover];

  return (
    <div className="relative h-96 w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={label}
        className="block h-full w-full"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - box.left) / box.width) * W;
          if (points.length === 0) return;
          const i = Math.round(((px - PAD.left) / innerW) * (points.length - 1));
          setHover(Math.max(0, Math.min(points.length - 1, i)));
        }}
      >
        <defs>
          <linearGradient id="kai-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#ff5a00" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ff5a00" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="#e6e6e6" strokeDasharray="3 4" />
            <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#767676">
              {compact(v)}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          points.length <= 8 || i % Math.ceil(points.length / 7) === 0 ? (
            <text key={p.date} x={x(i)} y={H - 10} textAnchor="middle" fontSize="11" fill="#767676">
              {formatDay(p.date)}
            </text>
          ) : null
        )}
        {area && <path d={area} fill="url(#kai-area)" />}
        {line && <path d={line} fill="none" stroke="#ff5a00" strokeWidth="2.5" strokeLinejoin="round" />}
        {shown && hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="#cfcfce" />
            <circle cx={x(hover)} cy={y(shown.gross)} r="5" fill="#fff" stroke="#ff5a00" strokeWidth="2.5" />
          </>
        )}
      </svg>
      {shown && hover !== null && (
        <div
          className="pointer-events-none absolute top-2 rounded-[var(--r-md)] border border-[var(--ink-200)] bg-[var(--ink-0)] px-3 py-2 text-[12px] shadow-[var(--sh-md)]"
          style={{ left: `${(x(hover) / W) * 100}%`, transform: "translateX(-50%)" }}
        >
          <div className="text-[var(--ink-500)]">{formatDay(shown.date)}</div>
          <div className="mono-num font-bold text-[var(--ink-900)]">{formatMoney(shown.gross)}</div>
        </div>
      )}
    </div>
  );
}
