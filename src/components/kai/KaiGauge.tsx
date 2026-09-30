const R = 70;
const C = 2 * Math.PI * R;
const ARC = 0.75 * C; // a 270° gauge, opening at the bottom

/** Donut gauge of the order statuses; `segments` are drawn in order along the arc. */
export function KaiGauge({
  segments,
}: {
  segments: Array<{ key: string; value: number; color: string }>;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let used = 0;
  return (
    <svg
      aria-hidden
      width="180"
      height="180"
      viewBox="0 0 180 180"
      style={{ transform: "rotate(135deg)" }}
      className="absolute top-0 left-0 max-w-none"
    >
      <circle
        cx="90"
        cy="90"
        r={R}
        fill="none"
        stroke="#e6e6e6"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${ARC} ${C}`}
      />
      {total > 0 &&
        segments.map((s) => {
          if (s.value === 0) return null;
          const len = (s.value / total) * ARC;
          const offset = -used;
          used += len;
          return (
            <circle
              key={s.key}
              cx="90"
              cy="90"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="14"
              strokeDasharray={`${Math.max(0, len - 2)} ${C}`}
              strokeDashoffset={offset}
            />
          );
        })}
    </svg>
  );
}
