/**
 * Single tile of fractal noise, inlined so it costs no request. Sized at
 * 180px so the pattern never reads as a repeat at normal viewing distance.
 *
 * Black with the noise in its alpha, laid over the page normally. That is
 * the same darkening the grain used to get from mix-blend-mode: multiply
 * (multiply by c at opacity a = black at a·(1 − c)), without making the
 * compositor blend the whole page through an extra surface every frame.
 * The alpha ramp matches the old tile's mean and contrast.
 */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -0.42 0 0 0 0.34'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23g)'/%3E%3C/svg%3E\")";

/**
 * Global film grain. Sits above the page content so flat UI fills and
 * gradients share one texture instead of banding against each other.
 */
export function FilmGrain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40 opacity-[0.035]"
      style={{ backgroundImage: GRAIN, backgroundRepeat: "repeat" }}
    />
  );
}
