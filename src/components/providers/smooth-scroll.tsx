"use client";

import type { ReactNode } from "react";
import type { LenisOptions } from "lenis";
import { ReactLenis } from "lenis/react";

/**
 * Tuned for a heavy, inertial feel: a low lerp means the viewport keeps
 * gliding after the wheel stops, which is what gives the site its weight.
 */
const LENIS_OPTIONS: LenisOptions = {
  lerp: 0.08,
  wheelMultiplier: 0.9,
  touchMultiplier: 1.6,
  smoothWheel: true,
  // smoothTouch was renamed syncTouch in Lenis 1.x.
  syncTouch: true,
  orientation: "vertical",
  gestureOrientation: "vertical",
  anchors: true,
  autoRaf: true,
  respectReducedMotion: true,
};

/**
 * Site-wide smooth scroll. `root` binds Lenis to the window, so every
 * section, anchor link and scroll-linked animation shares one timeline.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  return (
    <ReactLenis root options={LENIS_OPTIONS}>
      {children}
    </ReactLenis>
  );
}
