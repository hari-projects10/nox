"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useLenis } from "lenis/react";

/** Scroll, in px, that counts as the visitor's first gesture. */
const TRIGGER = 6;

/**
 * Past this the visitor is no longer leaving the landing — something else
 * moved the page, and the snap would yank them backwards.
 */
const WINDOW_FRACTION = 0.5;

const DURATION = 1.15;

/** Expo-out, matching --ease-out-expo, as a function for Lenis. */
const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Carries the very first scroll off the landing in one move.
 *
 * A hero that fills the viewport leaves the next section half-revealed
 * after a single wheel tick. The first gesture hands that section over
 * whole instead.
 *
 * Strictly once per load: it does not re-arm when the visitor scrolls back
 * up, because a snap that fires every time you revisit the top stops being
 * an introduction and becomes a scroll trap.
 */
export function IntroSnap({ target }: { target: string }) {
  const spent = useRef(false);
  const prefersReducedMotion = useReducedMotion();

  useLenis((lenis) => {
    if (spent.current) return;

    /* Arriving on a deep link is not a first scroll. */
    if (window.location.hash) {
      spent.current = true;
      return;
    }

    if (lenis.scroll < TRIGGER) return;

    /* Only honour a gesture that genuinely starts on the landing. */
    if (lenis.scroll > window.innerHeight * WINDOW_FRACTION) {
      spent.current = true;
      return;
    }

    const destination = document.querySelector(target);
    if (!destination) return;

    spent.current = true;
    lenis.scrollTo(destination as HTMLElement, {
      duration: prefersReducedMotion ? 0 : DURATION,
      easing: easeOutExpo,
      /* Hold the gesture for the length of the move, so a heavy trackpad
         flick cannot fight the snap halfway through. */
      lock: true,
    });
  });

  return null;
}
