"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { RevenuePoint } from "@/server/modules/dashboard/schema";
import { Panel } from "./Panel";
import { useFormatters } from "./useFormatters";

const MIN_HEIGHT = 280;
const MARGIN = { top: 16, right: 16, bottom: 28, left: 52 };

/** Round the axis maximum up to a clean number so ticks read 0 / 200K / 400K… */
function niceScale(max: number, ticks = 4) {
  const raw = Math.max(max, 1) / ticks;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * pow >= raw) ?? 10) * pow;
  return { step, max: step * ticks };
}

export function RevenueChart({ series }: { series: RevenuePoint[] }) {
  const t = useTranslations("Dashboard.chart");
  const f = useFormatters();
  const wrapRef = useRef<HTMLDivElement>(null);
  // Measured from the wrapper, which fills whatever height the panel's grid row gives it.
  const [size, setSize] = useState({ width: 0, height: MIN_HEIGHT });
  const { width, height } = size;
  const [hover, setHover] = useState<number | null>(null);
  const hasData = series.length > 0;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setSize({
        width: entry.contentRect.width,
        height: Math.max(entry.contentRect.height, MIN_HEIGHT),
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
    // The wrapper only exists once there is data to draw.
  }, [hasData]);

  const geometry = useMemo(() => {
    const plotW = Math.max(width - MARGIN.left - MARGIN.right, 0);
    const plotH = height - MARGIN.top - MARGIN.bottom;
    const scale = niceScale(Math.max(...series.map((p) => p.gross), 1));
    const x = (i: number) =>
      MARGIN.left + (series.length <= 1 ? plotW / 2 : (i / (series.length - 1)) * plotW);
    const y = (v: number) => MARGIN.top + plotH - (v / scale.max) * plotH;
    const line = (key: "gross" | "net") =>
      series
        .map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`)
        .join("");
    const baseY = MARGIN.top + plotH;
    const area = series.length
      ? `${line("gross")}L${x(series.length - 1).toFixed(1)},${baseY}L${x(0).toFixed(1)},${baseY}Z`
      : "";
    return {
      plotW,
      plotH,
      scale,
      x,
      y,
      gross: line("gross"),
      net: line("net"),
      area,
      baseY,
    };
  }, [series, width, height]);

  if (!hasData) {
    return (
      <Panel title={t("title")} subtitle={t("subtitle")}>
        <p className="py-16 text-center text-sm text-ink-muted">{t("empty")}</p>
      </Panel>
    );
  }

  const { scale, x, y, plotW, baseY } = geometry;
  const ticks = Array.from({ length: 5 }, (_, i) => i * scale.step);
  const labelEvery = Math.max(1, Math.ceil(series.length / Math.max(Math.floor(plotW / 64), 1)));
  const last = series.length - 1;
  const active = hover === null ? null : series[hover];

  const indexFromPointer = (e: PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
    const ratio = (e.clientX - rect.left - MARGIN.left) / Math.max(plotW, 1);
    return Math.min(last, Math.max(0, Math.round(ratio * last)));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? last) - 1));
    else if (e.key === "ArrowRight") setHover((h) => Math.min(last, (h ?? last) + 1));
    else if (e.key === "Escape") setHover(null);
    else return;
    e.preventDefault();
  };

  return (
    <Panel title={t("title")} subtitle={t("subtitle")}>
      {/* Legend: line keys mirror the marks. Text stays in ink; the key carries identity. */}
      <ul className="mb-3 flex gap-6 text-[13px] text-ink-2">
        <LegendItem color="var(--series-1)" label={t("gross")} />
        <LegendItem color="var(--series-2)" label={t("net")} />
      </ul>

      <div
        ref={wrapRef}
        className="relative min-h-[280px] flex-1"
        tabIndex={0}
        role="group"
        aria-label={`${t("title")} — ${t("subtitle")}`}
        onKeyDown={onKeyDown}
        onFocus={() => setHover((h) => h ?? last)}
        onBlur={() => setHover(null)}
      >
        {width > 0 && (
          <svg
            width={width}
            height={height}
            aria-hidden
            className="absolute top-0 left-0 select-none"
          >
            {ticks.map((v) => (
              <g key={v}>
                <line
                  x1={MARGIN.left}
                  x2={width - MARGIN.right}
                  y1={y(v)}
                  y2={y(v)}
                  stroke={v === 0 ? "var(--axis)" : "var(--line)"}
                  strokeWidth={1}
                />
                <text
                  x={MARGIN.left - 10}
                  y={y(v)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-ink-muted text-[11px] tabular-nums"
                >
                  {v === 0 ? "0" : f.compact(v)}
                </text>
              </g>
            ))}

            {series.map((p, i) =>
              (last - i) % labelEvery === 0 ? (
                <text
                  key={p.date}
                  x={x(i)}
                  y={baseY + 18}
                  textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"}
                  className="fill-ink-muted text-[11px]"
                >
                  {f.day(p.date)}
                </text>
              ) : null
            )}

            <path d={geometry.area} fill="var(--series-1)" fillOpacity={0.08} />
            <path
              d={geometry.gross}
              fill="none"
              stroke="var(--series-1)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path
              d={geometry.net}
              fill="none"
              stroke="var(--series-2)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* Crosshair + markers for the hovered/focused day. */}
            {active && hover !== null && (
              <g>
                <line
                  x1={x(hover)}
                  x2={x(hover)}
                  y1={MARGIN.top}
                  y2={baseY}
                  stroke="var(--axis)"
                  strokeWidth={1}
                />
                <Marker cx={x(hover)} cy={y(active.gross)} color="var(--series-1)" />
                <Marker cx={x(hover)} cy={y(active.net)} color="var(--series-2)" />
              </g>
            )}
            {/* Latest point: the value the live feed is currently moving. */}
            {hover === null && (
              <>
                <Marker cx={x(last)} cy={y(series[last]!.gross)} color="var(--series-1)" />
                <Marker cx={x(last)} cy={y(series[last]!.net)} color="var(--series-2)" />
              </>
            )}

            {/* Hit layer: bigger than any mark; the pointer only has to be near a day. */}
            <rect
              x={MARGIN.left}
              y={MARGIN.top}
              width={plotW}
              height={height - MARGIN.top - MARGIN.bottom}
              fill="transparent"
              onPointerMove={(e) => setHover(indexFromPointer(e))}
              onPointerLeave={() => setHover(null)}
            />
          </svg>
        )}

        {active && hover !== null && width > 0 && (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-40 rounded-md border border-line bg-surface px-3.5 py-2.5 text-sm shadow-md"
            style={{
              left: Math.min(Math.max(x(hover) + 12, 8), Math.max(width - 176, 8)),
            }}
          >
            <p className="mb-1 text-xs text-ink-muted">{f.day(active.date)}</p>
            <TooltipRow color="var(--series-1)" name={t("gross")} value={f.money(active.gross)} />
            <TooltipRow color="var(--series-2)" name={t("net")} value={f.money(active.net)} />
          </div>
        )}
      </div>

      {/* Table view: every plotted value is reachable without hover or vision. */}
      <table className="sr-only">
        <caption>{t("tableLabel")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("date")}</th>
            <th scope="col">{t("gross")}</th>
            <th scope="col">{t("net")}</th>
          </tr>
        </thead>
        <tbody>
          {series.map((p) => (
            <tr key={p.date}>
              <th scope="row">{f.day(p.date)}</th>
              <td>{f.money(p.gross)}</td>
              <td>{f.money(p.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden className="h-0.5 w-4 rounded-full" style={{ background: color }} />
      {label}
    </li>
  );
}

function TooltipRow({ color, name, value }: { color: string; name: string; value: string }) {
  return (
    <p className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-2 text-ink-2">
        <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ background: color }} />
        {name}
      </span>
      <span className="font-semibold tabular-nums">{value}</span>
    </p>
  );
}

/** 8px dot with a 2px surface ring so it stays legible over lines. */
function Marker({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="var(--surface)" strokeWidth={2} />;
}
