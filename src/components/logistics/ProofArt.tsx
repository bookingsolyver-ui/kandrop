/** Small seeded PRNG: the same delivery always draws the same picture. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * SIMULATED photo: a parcel on a doorstep, drawn from shapes. It stands in for the picture the
 * courier's app would take, and says so on the picture. Nothing about it is real evidence.
 */
export function PhotoArt({
  seed,
  stamp,
  label,
  note,
}: {
  seed: number;
  /** e.g. "24 set. 2026 · 14:32 · Talatona" — the metadata a real photo would be stamped with. */
  stamp: string;
  label: string;
  note: string;
}) {
  const r = rng(seed);
  const hue = 190 + Math.floor(r() * 50);
  const w = 120 + Math.floor(r() * 50);
  const h = 84 + Math.floor(r() * 36);
  const x = 150 + Math.floor(r() * 90);
  const tilt = (r() - 0.5) * 6;
  const wall = `hsl(${hue} 14% 20%)`;
  const floor = `hsl(${hue} 12% 12%)`;
  const box = `hsl(${28 + Math.floor(r() * 12)} 34% 46%)`;
  const boxTop = `hsl(${28 + Math.floor(r() * 12)} 32% 56%)`;
  const y = 250 - h;

  return (
    <svg role="img" aria-label={label} viewBox="0 0 480 360" className="w-full rounded-lg">
      <rect width="480" height="360" fill={wall} />
      <rect x="0" y="250" width="480" height="110" fill={floor} />
      {/* door */}
      <rect x="60" y="30" width="150" height="220" fill={`hsl(${hue} 10% 27%)`} />
      <rect x="72" y="42" width="126" height="196" fill={`hsl(${hue} 11% 23%)`} />
      <circle cx="184" cy="150" r="5" fill="#9aa4a0" />
      {/* parcel */}
      <ellipse cx={x + w / 2 + 6} cy="252" rx={w * 0.62} ry="9" fill="#000" opacity="0.35" />
      <g transform={`rotate(${tilt} ${x + w / 2} ${y + h})`}>
        <rect x={x} y={y} width={w} height={h} fill={box} />
        <path d={`M${x} ${y} l14 -14 h${w} l-14 14 z`} fill={boxTop} />
        <path d={`M${x + w} ${y} l14 -14 v${h} l-14 14 z`} fill={`hsl(30 30% 38%)`} />
        <rect x={x + w / 2 - 9} y={y} width="18" height={h} fill="#d9d2c0" opacity="0.85" />
        <rect x={x + 12} y={y + h - 30} width="42" height="18" fill="#f1f3f2" opacity="0.9" />
      </g>
      {/* the stamp a real proof photo carries */}
      <rect x="0" y="322" width="480" height="38" fill="#000" opacity="0.6" />
      <text x="16" y="346" fill="#f1f3f2" fontSize="14" fontFamily="ui-monospace, monospace">
        {stamp}
      </text>
      <rect
        x="12"
        y="12"
        width={note.length * 8 + 20}
        height="26"
        rx="4"
        fill="#000"
        opacity="0.65"
      />
      <text
        x="22"
        y="30"
        fill="#f1f3f2"
        fontSize="12"
        fontFamily="ui-monospace, monospace"
        letterSpacing="1"
      >
        {note}
      </text>
    </svg>
  );
}

/**
 * SIMULATED signature: a smooth stroke through seeded points, on paper. It is a drawing, not
 * anyone's signature.
 */
export function SignatureArt({ seed, label, note }: { seed: number; label: string; note: string }) {
  const r = rng(seed);
  const n = 9;
  const pts = Array.from({ length: n }, (_, i) => [
    50 + (i / (n - 1)) * 330 + (r() - 0.5) * 14,
    (i % 2 ? 100 : 160) + (r() - 0.5) * 70,
  ]);
  // Catmull-Rom → cubic Bézier: a hand-drawn looking curve through the points.
  let d = `M${pts[0]![0]!.toFixed(1)} ${pts[0]![1]!.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    const c1 = [p1[0]! + (p2[0]! - p0[0]!) / 6, p1[1]! + (p2[1]! - p0[1]!) / 6];
    const c2 = [p2[0]! - (p3[0]! - p1[0]!) / 6, p2[1]! - (p3[1]! - p1[1]!) / 6];
    d += ` C${c1[0]!.toFixed(1)} ${c1[1]!.toFixed(1)} ${c2[0]!.toFixed(1)} ${c2[1]!.toFixed(1)} ${p2[0]!.toFixed(1)} ${p2[1]!.toFixed(1)}`;
  }
  const under = 190 + r() * 16;

  return (
    <svg role="img" aria-label={label} viewBox="0 0 480 300" className="w-full rounded-lg">
      <rect width="480" height="300" fill="#f1f3f2" />
      <path d="M40 232H440" stroke="#8f9893" strokeWidth="1" />
      <text x="40" y="256" fill="#5d6a63" fontSize="12" fontFamily="ui-sans-serif, sans-serif">
        ✕
      </text>
      <path
        d={d}
        fill="none"
        stroke="#0a0b0c"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={`M${90 + r() * 40} ${under} q90 ${(r() - 0.5) * 24} ${180 + r() * 60} ${(r() - 0.5) * 10}`}
        fill="none"
        stroke="#0a0b0c"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      <rect
        x="12"
        y="12"
        width={note.length * 7.5 + 20}
        height="24"
        rx="4"
        fill="#0a0b0c"
        opacity="0.85"
      />
      <text
        x="22"
        y="28"
        fill="#f1f3f2"
        fontSize="11"
        fontFamily="ui-monospace, monospace"
        letterSpacing="1"
      >
        {note}
      </text>
    </svg>
  );
}
