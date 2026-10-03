"use client";

import { useEffect, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";

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
 *
 * Reduced motion flattens the give after mount rather than rendering a
 * different element, so the server's HTML and the first client render agree.
 */
export function KineticViewport({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReducedMotion();
  const velocity = useSpring(scrollVelocity, VELOCITY_SPRING);

  const depth = useMotionValue(1);
  useEffect(() => depth.set(prefersReducedMotion ? 0 : 1), [depth, prefersReducedMotion]);

  const scaleY = useTransform(() =>
    clamp(1 - Math.abs(velocity.get()) * SQUASH_PER_UNIT * depth.get(), MIN_SCALE, 1),
  );

  return (
    <motion.div
      style={{ scaleY, transformOrigin: "center top" }}
      className="relative z-10 will-change-transform"
    >
      {children}
    </motion.div>
  );
}
