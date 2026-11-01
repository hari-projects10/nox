"use client";

import type { ReactNode } from "react";
import type { LenisOptions } from "lenis";
import { ReactLenis } from "lenis/react";

/**
 * The wheel glides, easing out after each notch so scrolling flows rather
 * than steps; lerp 0.1 keeps that glide close behind the hand instead of
 * dragging after it.
 *
 * Touch is left native. The phone's own momentum scrolling runs off the
 * main thread and is as smooth as the device can be; emulating it in
 * script (syncTouch) made it stick whenever the page was busy.
 */
const LENIS_OPTIONS: LenisOptions = {
  lerp: 0.1,
  wheelMultiplier: 1,
  smoothWheel: true,
  syncTouch: false,
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
