"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { useLenis } from "lenis/react";

import { EASE_IN_OUT_QUINT, EASE_OUT_EXPO } from "@/lib/site";

/** Sweep in, then fetch; sweep out once the new route has committed. */
const COVER = 0.62;
const UNCOVER = 0.75;

/** Let the incoming route paint before uncovering it. */
const SETTLE_MS = 170;

/**
 * Route curtain.
 *
 * Next's App Router swaps server-rendered children without waiting for exit
 * animations, so rather than fight it this drives the sequence directly:
 * intercept the click, sweep the panel up over the viewport, navigate, then
 * sweep it off the top once the new pathname commits.
 *
 * Renders the panel as its own last child so it sits above the navbar and
 * page surface instead of being trapped inside their stacking contexts.
 */
export function RouteTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const lenis = useLenis();

  /* Driven as a plain number (percent of viewport) rather than a "100%"
     string: animating the string value left the panel parked at ~100% even
     though the animation reported complete. */
  const progress = useMotionValue(100);
  const y = useTransform(progress, (value) => `${value}%`);

  /* Block clicks through the panel only while it is actually covering. */
  const pointerEvents = useTransform(progress, (value) =>
    value < 99 ? "auto" : "none",
  );

  const isCovering = useRef(false);
  const pendingPath = useRef<string | null>(null);

  /* ---------- Uncover after the new route lands ---------- */
  useEffect(() => {
    if (!isCovering.current) return;
    if (pendingPath.current && pendingPath.current !== pathname) return;

    isCovering.current = false;
    pendingPath.current = null;

    // Start the new page at the top while it is still hidden.
    lenis?.scrollTo(0, { immediate: true });

    const timer = setTimeout(() => {
      animate(progress, -100, {
        duration: UNCOVER,
        ease: EASE_OUT_EXPO,
      }).then(() => {
        // Park it back below the fold, ready for the next navigation.
        progress.set(100);
      });
    }, SETTLE_MS);

    return () => clearTimeout(timer);
  }, [pathname, lenis, progress]);

  /* ---------- Intercept internal links ---------- */
  useEffect(() => {
    const prefetched = new Set<string>();

    function resolve(anchor: HTMLAnchorElement) {
      if (anchor.target && anchor.target !== "_self") return null;
      if (anchor.hasAttribute("download")) return null;
      if (!anchor.getAttribute("href")) return null;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return null;
      // Same-page anchors stay with Lenis' smooth scrolling.
      if (url.pathname === window.location.pathname) return null;
      return url;
    }

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return;

      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor) return;

      const url = resolve(anchor as HTMLAnchorElement);
      if (!url) return;

      event.preventDefault();
      if (isCovering.current) return;

      isCovering.current = true;
      pendingPath.current = url.pathname;

      animate(progress, 0, {
        duration: COVER,
        ease: EASE_IN_OUT_QUINT,
      }).then(() => {
        router.push(`${url.pathname}${url.search}${url.hash}`);
      });
    }

    /* Warm the route on hover so the curtain is not waiting on the network. */
    function onOver(event: PointerEvent) {
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor) return;
      const url = resolve(anchor as HTMLAnchorElement);
      if (!url || prefetched.has(url.pathname)) return;
      prefetched.add(url.pathname);
      router.prefetch(url.pathname);
    }

    document.addEventListener("click", onClick);
    document.addEventListener("pointerover", onOver, { passive: true });
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("pointerover", onOver);
    };
  }, [router, progress]);

  return (
    <>
      {children}

      <motion.div
        aria-hidden
        style={{ y, pointerEvents }}
        className="fixed inset-0 z-[900] bg-white"
      />
    </>
  );
}

/**
 * Slide-in / slide-out for the page body itself, keyed on the pathname.
 * `mode="wait"` holds the incoming route until the outgoing one has left.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -28 }}
        transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
