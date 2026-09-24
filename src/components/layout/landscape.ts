/**
 * Shared geometry of the footer landscape, in the 1600×900 scene every
 * layer is drawn in. The painted SVG and the live WebGL grass both read it,
 * so the two can never drift apart.
 */
export const SCENE_WIDTH = 1600;
export const SCENE_HEIGHT = 900;

type Point = readonly [x: number, y: number];

/** A skyline as two cubic Béziers: start, then (control, control, end) twice. */
export type Ridge = readonly [Point, Point, Point, Point, Point, Point, Point];

/** The sunlit hill. */
export const BACK_RIDGE: Ridge = [
  [-20, 700],
  [220, 690],
  [470, 628],
  [760, 606],
  [1010, 590],
  [1250, 620],
  [1620, 668],
];

/** The shadowed swell in front of it. */
export const FRONT_RIDGE: Ridge = [
  [-20, 690],
  [180, 694],
  [380, 716],
  [600, 772],
  [860, 838],
  [1180, 858],
  [1620, 842],
];

const pair = ([x, y]: Point) => `${x} ${y}`;

/** Closed SVG path: along the skyline, then down and round the scene's base. */
export function ridgePath([p0, p1, p2, p3, p4, p5, p6]: Ridge) {
  return (
    `M${pair(p0)} C${pair(p1)} ${pair(p2)} ${pair(p3)} ` +
    `C${pair(p4)} ${pair(p5)} ${pair(p6)} L1620 920 L-20 920 Z`
  );
}

/**
 * The skyline's height at any x, from a table sampled once. Both segments
 * run left to right, so the curve is a function of x.
 */
export function skyline(ridge: Ridge): (x: number) => number {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let segment = 0; segment < 2; segment++) {
    const [a, b, c, d] = ridge.slice(segment * 3, segment * 3 + 4);
    for (let i = segment ? 1 : 0; i <= 256; i++) {
      const t = i / 256;
      const u = 1 - t;
      const k0 = u * u * u;
      const k1 = 3 * u * u * t;
      const k2 = 3 * u * t * t;
      const k3 = t * t * t;
      xs.push(k0 * a[0] + k1 * b[0] + k2 * c[0] + k3 * d[0]);
      ys.push(k0 * a[1] + k1 * b[1] + k2 * c[1] + k3 * d[1]);
    }
  }

  const start = Math.floor(xs[0]);
  const table = new Float32Array(Math.ceil(xs[xs.length - 1]) - start + 1);
  for (let x = start, j = 0; x - start < table.length; x++) {
    while (j < xs.length - 2 && xs[j + 1] < x) j++;
    const t = Math.min(1, Math.max(0, (x - xs[j]) / (xs[j + 1] - xs[j])));
    table[x - start] = ys[j] + (ys[j + 1] - ys[j]) * t;
  }

  return (x) => {
    const f = Math.min(table.length - 1, Math.max(0, x - start));
    const i = Math.floor(f);
    const next = table[Math.min(i + 1, table.length - 1)];
    return table[i] + (next - table[i]) * (f - i);
  };
}
