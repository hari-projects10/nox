"use client";

import { motion, useReducedMotion } from "framer-motion";
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
  drift: { x: number[]; y: number[]; scale: number[] };
  /** Keyframe offsets, so the three orbs never move in lockstep. */
  times: number[];
};

const ORBS: Orb[] = [
  {
    id: "slate",
    box: "-top-[28vmax] -left-[18vmax] h-[78vmax] w-[78vmax]",
    gradient:
      "radial-gradient(circle closest-side at 50% 50%, rgba(226,232,240,0.95) 0%, rgba(226,232,240,0.9) 40%, rgba(226,232,240,0.7) 62%, rgba(226,232,240,0.4) 80%, rgba(226,232,240,0.14) 92%, rgba(226,232,240,0) 100%)",
    drift: {
      x: [0, 90, -50, 0],
      y: [0, -70, 45, 0],
      scale: [1, 1.14, 0.95, 1],
    },
    times: [0, 0.34, 0.68, 1],
  },
  {
    id: "indigo",
    box: "top-[8vmax] -right-[24vmax] h-[82vmax] w-[82vmax]",
    gradient:
      "radial-gradient(circle closest-side at 50% 50%, rgba(224,231,255,0.95) 0%, rgba(224,231,255,0.9) 40%, rgba(224,231,255,0.7) 62%, rgba(224,231,255,0.4) 80%, rgba(224,231,255,0.14) 92%, rgba(224,231,255,0) 100%)",
    drift: {
      x: [0, -110, 60, 0],
      y: [0, 80, -40, 0],
      scale: [1, 0.93, 1.12, 1],
    },
    times: [0, 0.42, 0.74, 1],
  },
  {
    id: "violet",
    box: "-bottom-[34vmax] left-[14vmax] h-[86vmax] w-[86vmax]",
    gradient:
      "radial-gradient(circle closest-side at 50% 50%, rgba(243,232,255,0.95) 0%, rgba(243,232,255,0.9) 40%, rgba(243,232,255,0.7) 62%, rgba(243,232,255,0.4) 80%, rgba(243,232,255,0.14) 92%, rgba(243,232,255,0) 100%)",
    drift: {
      x: [0, 70, -95, 0],
      y: [0, -55, 35, 0],
      scale: [1, 1.1, 0.92, 1],
    },
    times: [0, 0.28, 0.62, 1],
  },
];

/**
 * Fixed atmospheric layer behind all content: three massive, heavily
 * blurred radial gradients drifting on a 20 second loop.
 */
export function AuroraField() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {ORBS.map((orb) => (
        <motion.div
          key={orb.id}
          className={cn("absolute rounded-full will-change-transform", orb.box)}
          style={{ backgroundImage: orb.gradient }}
          animate={prefersReducedMotion ? undefined : orb.drift}
          transition={
            prefersReducedMotion
              ? undefined
              : {
                  duration: LOOP_SECONDS,
                  times: orb.times,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatType: "loop",
                }
          }
        />
      ))}
    </div>
  );
}
