"use client";

import { useEffect, useRef } from "react";
import { useAnimationFrame } from "framer-motion";
import { useLenis } from "lenis/react";

import { scrollProgress, scrollVelocity } from "@/lib/scroll-store";

/** Below this, treat the viewport as stationary. */
const REST_THRESHOLD = 0.01;

/** Per-frame decay once Lenis stops reporting. */
const DECAY = 0.82;

/** Grace period before we assume scrolling has stopped. */
const IDLE_MS = 70;

/**
 * Feeds Lenis' scroll state into the shared motion values. Renders nothing.
 */
export function ScrollRig() {
  const lastReport = useRef(0);
  const lenis = useLenis();

  /* Land at the top, every time.
     The browser restores the previous offset on reload, which used to be
     hidden behind the preloader and is now plainly visible: you re-enter
     the site already parked in the middle of it, with the hero intro over
     before it started. An explicit hash still wins. */
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    if (window.location.hash) return;

    window.scrollTo(0, 0);
    lenis?.scrollTo(0, { immediate: true });
  }, [lenis]);

  useLenis((lenis) => {
    scrollProgress.set(Number.isFinite(lenis.progress) ? lenis.progress : 0);
    scrollVelocity.set(lenis.velocity ?? 0);
    lastReport.current = performance.now();
  });

  /**
   * Lenis stops emitting the moment it settles, which would freeze the last
   * velocity reading — leaving the page permanently skewed. Decay it back to
   * exactly zero so everything downstream returns to rest.
   */
  useAnimationFrame(() => {
    if (performance.now() - lastReport.current < IDLE_MS) return;

    const current = scrollVelocity.get();
    if (current === 0) return;

    if (Math.abs(current) < REST_THRESHOLD) {
      scrollVelocity.set(0);
      return;
    }
    scrollVelocity.set(current * DECAY);
  });

  return null;
}
