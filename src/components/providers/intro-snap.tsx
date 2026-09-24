"use client";

import { type RefObject, useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import type Lenis from "lenis";
import { useLenis } from "lenis/react";

/** Scroll, in px, past a resting point that counts as a new gesture. */
const TRIGGER = 6;

/**
 * Past this the visitor is no longer on the step they were resting on —
 * something else moved the page, and a snap would yank them backwards.
 */
const WINDOW_FRACTION = 0.5;

const DURATION = 1.15;

/**
 * After a snap lands, wheel input is held until it has been quiet this
 * long, so the tail of a trackpad flick is not read as the next gesture.
 */
const QUIET_MS = 180;
/** Upper bound on that hold, so a restless wheel never feels stuck. */
const MAX_HOLD_MS = 1000;

/** Expo-out, matching --ease-out-expo, as a function for Lenis. */
const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Keeps the page still until the wheel goes quiet, then hands it back.
 */
function settle(lenis: Lenis, lastWheel: RefObject<number>, onReleased: () => void) {
  lenis.stop();
  const heldFrom = performance.now();
  const release = () => {
    const now = performance.now();
    if (now - lastWheel.current < QUIET_MS && now - heldFrom < MAX_HOLD_MS) {
      window.setTimeout(release, 40);
      return;
    }
    lenis.start();
    onReleased();
  };
  release();
}

/**
 * Carries the opening scrolls in whole-screen moves, one target per
 * gesture, then hands the page back to free scroll.
 *
 * A hero that fills the viewport leaves the next section half-revealed
 * after a single wheel tick. Each downward gesture from a resting point
 * hands the next section over whole instead, aligned to the top of the
 * screen.
 *
 * The sequence ends for good the moment the visitor does anything else —
 * scrolls back up, drags far past a step, or follows an in-page link —
 * and it does not re-arm, because a snap that fires every time you
 * revisit the top stops being an introduction and becomes a scroll trap.
 */
export function IntroSnap({ targets }: { targets: string[] }) {
  /** Index of the next target to snap to; `targets.length` means done. */
  const step = useRef(0);
  /** Scroll position the visitor is resting on between snaps. */
  const anchor = useRef(0);
  /** True from the start of a snap until its gesture has fully died out. */
  const busy = useRef(false);
  const lastWheel = useRef(0);
  const prefersReducedMotion = useReducedMotion();

  const finish = () => {
    step.current = targets.length;
  };

  useEffect(() => {
    const onWheel = () => {
      lastWheel.current = performance.now();
    };
    /* A nav or in-page link is a deliberate destination — never hijack it. */
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.('a[href*="#"]');
      if (link) step.current = targets.length;
    };
    window.addEventListener("wheel", onWheel, { passive: true, capture: true });
    document.addEventListener("click", onClick, { capture: true });
    return () => {
      window.removeEventListener("wheel", onWheel, { capture: true });
      document.removeEventListener("click", onClick, { capture: true });
    };
  }, [targets.length]);

  useLenis((lenis) => {
    if (busy.current || step.current >= targets.length) return;

    /* Arriving on a deep link is not a first scroll. */
    if (step.current === 0 && window.location.hash) {
      finish();
      return;
    }

    const delta = lenis.scroll - anchor.current;

    /* Scrolling back up means the visitor is steering — let them. */
    if (delta < -TRIGGER) {
      finish();
      return;
    }
    if (delta < TRIGGER) return;

    /* Only honour a gesture that genuinely starts on the resting point. */
    if (delta > window.innerHeight * WINDOW_FRACTION) {
      finish();
      return;
    }

    const destination = document.querySelector<HTMLElement>(targets[step.current]);
    if (!destination) {
      finish();
      return;
    }

    step.current += 1;
    busy.current = true;
    lenis.scrollTo(destination, {
      duration: prefersReducedMotion ? 0 : DURATION,
      easing: easeOutExpo,
      /* Hold the gesture for the length of the move, so a heavy trackpad
         flick cannot fight the snap halfway through. */
      lock: true,
      onComplete: (instance) =>
        settle(instance, lastWheel, () => {
          anchor.current = instance.scroll;
          busy.current = false;
        }),
    });
  });

  return null;
}
