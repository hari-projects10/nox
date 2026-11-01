"use client";

import { useEffect } from "react";
import { useLenis } from "lenis/react";

/**
 * Lands every page load at the top. Renders nothing.
 *
 * It used to also feed scroll velocity into a per-frame loop for the page's
 * squash under scroll; that cost a style write on every frame and is gone.
 */
export function ScrollRig() {
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

  return null;
}
