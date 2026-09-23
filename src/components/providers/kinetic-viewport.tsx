"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "framer-motion";

import { scrollVelocity } from "@/lib/scroll-store";

/** Spring the raw velocity so the give builds and releases, never snaps. */
const VELOCITY_SPRING = { stiffness: 280, damping: 35, mass: 0.8 } as const;

/*
 * No shear: skewing the page under scroll velocity leans every edge and
 * baseline, which reads as the whole layout going italic. A slight vertical
 * give keeps the page feeling physical without distorting its geometry.
 */
const SQUASH_PER_UNIT = 0.00015;
const MIN_SCALE = 0.99;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Gives the page a little vertical compression under scroll velocity, then
 * settles flat.
 *
 * The transform lives on this wrapper only — the 3D canvas, grain and cursor
 * sit outside it, so they stay geometrically true while the content flexes.
 */
export function KineticViewport({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReducedMotion();
  const velocity = useSpring(scrollVelocity, VELOCITY_SPRING);

  const scaleY = useTransform(velocity, (v) =>
    clamp(1 - Math.abs(v) * SQUASH_PER_UNIT, MIN_SCALE, 1),
  );

  if (prefersReducedMotion) {
    return <div className="relative z-10">{children}</div>;
  }

  return (
    <motion.div
      style={{ scaleY, transformOrigin: "center top" }}
      className="relative z-10 will-change-transform"
    >
      {children}
    </motion.div>
  );
}
