/** Small seeded PRNG so the same pairing code always draws the same picture. */
function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const N = 25;

/**
 * A SIMULATED pairing code: it has the look of a QR code (three finder squares, timing lines,
 * data modules) but encodes nothing and cannot be scanned. The caller labels it as simulated.
 * White on purpose: a scanner needs dark-on-light, whatever the theme.
 */
export function SimulatedQr({
  code,
  label,
  size = 176,
}: {
  code: string;
  label: string;
  size?: number;
}) {
  const rand = rng(code);
  const finder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);
  const cells: Array<[number, number]> = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (finder(x, y)) continue;
      const timing = (y === 6 && x % 2 === 0) || (x === 6 && y % 2 === 0);
      if (timing || rand() > 0.52) cells.push([x, y]);
    }
  }
  const eye = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" fill="#0a0b0c" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#f1f3f2" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="#0a0b0c" />
    </g>
  );

  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`-2 -2 ${N + 4} ${N + 4}`}
      shapeRendering="crispEdges"
      className="rounded-lg"
    >
      <rect x="-2" y="-2" width={N + 4} height={N + 4} fill="#f1f3f2" />
      {eye(0, 0)}
      {eye(N - 7, 0)}
      {eye(0, N - 7)}
      {cells.map(([x, y]) => (
        <rect key={`${x}.${y}`} x={x} y={y} width="1" height="1" fill="#0a0b0c" />
      ))}
    </svg>
  );
}
