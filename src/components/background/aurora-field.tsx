import { cn } from "@/lib/utils";

/** One 20s loop, shared by every orb, with staggered keyframe timing. */
const LOOP_SECONDS = 20;

type Orb = {
  id: string;
  /** Tailwind box: size + resting position. */
  box: string;
  /**
   * Soft all the way out, so no blur filter is needed: a filter on a layer
   * that never stops moving is recomputed by the GPU every frame, which
   * doubled the page's frame cost while scrolling.
   */
  gradient: string;
  /**
   * Its drift, a CSS keyframe loop in globals.css. Each orb has its own
   * keyframe offsets, so the three never move in lockstep.
   */
  drift: string;
};

const ORBS: Orb[] = [
  {
    id: "slate",
    box: "-top-[28vmax] -left-[18vmax] h-[78vmax] w-[78vmax]",
    gradient:
      "radial-gradient(circle closest-side at 50% 50%, rgba(226,232,240,0.95) 0%, rgba(226,232,240,0.9) 40%, rgba(226,232,240,0.7) 62%, rgba(226,232,240,0.4) 80%, rgba(226,232,240,0.14) 92%, rgba(226,232,240,0) 100%)",
    drift: "drift-slate",
  },
  {
    id: "indigo",
    box: "top-[8vmax] -right-[24vmax] h-[82vmax] w-[82vmax]",
    gradient:
      "radial-gradient(circle closest-side at 50% 50%, rgba(224,231,255,0.95) 0%, rgba(224,231,255,0.9) 40%, rgba(224,231,255,0.7) 62%, rgba(224,231,255,0.4) 80%, rgba(224,231,255,0.14) 92%, rgba(224,231,255,0) 100%)",
    drift: "drift-indigo",
  },
  {
    id: "violet",
    box: "-bottom-[34vmax] left-[14vmax] h-[86vmax] w-[86vmax]",
    gradient:
      "radial-gradient(circle closest-side at 50% 50%, rgba(243,232,255,0.95) 0%, rgba(243,232,255,0.9) 40%, rgba(243,232,255,0.7) 62%, rgba(243,232,255,0.4) 80%, rgba(243,232,255,0.14) 92%, rgba(243,232,255,0) 100%)",
    drift: "drift-violet",
  },
];

/**
 * Fixed atmospheric layer behind all content: three massive, heavily
 * blurred radial gradients drifting on a 20 second loop.
 *
 * The drift is a compositor animation, so it never costs the main thread a
 * frame and keeps gliding even while the page is busy. Reduced motion stops
 * it (see .ambient).
 */
export function AuroraField() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {ORBS.map((orb) => (
        <div
          key={orb.id}
          className={cn("ambient absolute rounded-full will-change-transform", orb.box)}
          style={{
            backgroundImage: orb.gradient,
            animationName: orb.drift,
            animationDuration: `${LOOP_SECONDS}s`,
          }}
        />
      ))}
    </div>
  );
}
