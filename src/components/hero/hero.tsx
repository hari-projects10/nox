"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { SplitText } from "@/components/ui/split-text";
import { EASE_OUT_EXPO, site } from "@/lib/site";

/** Background loop, served from public/videos. */
const HERO_VIDEO = "/videos/128648-741747833.mp4";

/** Longest the intro will wait on webfonts before starting regardless. */
const FONT_WAIT_MS = 900;

/** Solid through the copy, dissolving over the lower third. */
const VIDEO_MASK =
  "linear-gradient(to bottom, #000 0%, #000 58%, rgba(0,0,0,0.55) 80%, transparent 100%)";

export function Hero() {
  const prefersReducedMotion = useReducedMotion();
  const [introReady, setIntroReady] = useState(false);

  const video = useRef<HTMLVideoElement>(null);

  /* Hold the headline at its start state until the page has actually
     painted and the display face has landed. Started at hydration instead,
     the rise races first paint and the reveal is half over — or finished —
     before there is anything on screen to watch it on. */
  useEffect(() => {
    let cancelled = false;
    const start = () => {
      if (!cancelled) setIntroReady(true);
    };

    const timer = window.setTimeout(start, FONT_WAIT_MS);
    document.fonts?.ready.then(() => {
      /* One frame past the swap, so the rise is composited, not painted
         in the same tick as the font change. */
      requestAnimationFrame(start);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  /* Held transparent until the first frame decodes, so the hero never
     flashes a black box while the file buffers. A cached file can finish
     loading before hydration, when a React onLoadedData would never fire,
     so readiness is checked directly as well as listened for. */
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const reveal = () => {
      element.style.opacity = "1";
    };
    if (element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) reveal();
    element.addEventListener("loadeddata", reveal);
    return () => element.removeEventListener("loadeddata", reveal);
  }, []);

  /* Play only while on screen, so the hero stops decoding once the
     capabilities slideshow takes over. Reduced motion keeps the first
     frame and skips the loop. */
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (prefersReducedMotion) {
      element.pause();
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) element.play().catch(() => {});
      else element.pause();
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  return (
    <section
      id="top"
      className="relative flex h-svh min-h-[620px] items-center justify-center overflow-hidden px-6"
    >
      {/* ---- Background video ---- */}
      <video
        ref={video}
        aria-hidden="true"
        src={HERO_VIDEO}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-1000"
        style={{
          opacity: 0,
          /* Fade the footage itself to transparent at the base, rather than
             painting a solid fade over it: the aurora behind then continues
             straight into the next section with no seam, and the darker
             bands at the bottom of the clip clear the scroll cue. */
          maskImage: VIDEO_MASK,
          WebkitMaskImage: VIDEO_MASK,
        }}
      />

      {/* Legibility scrim: lifts the copy off the background without a visible edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(52%_26%_at_50%_47%,rgb(249_249_249_/_0.46)_0%,rgb(249_249_249_/_0.14)_60%,transparent_100%)]"
      />

      <div className="relative flex w-full max-w-6xl flex-col items-center text-center">
        <h1
          aria-label={site.hero.headline}
          className="font-display text-[clamp(2.6rem,8vw,7.5rem)] font-medium leading-[0.92] tracking-tighter text-headline"
        >
          <SplitText
            text={site.hero.headline}
            delay={0.4}
            stagger={0.03}
            play={introReady}
          />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={introReady ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
          transition={{ duration: 1.2, delay: 1.15, ease: EASE_OUT_EXPO }}
          className="mt-8 max-w-xl text-[15px] leading-relaxed text-ink-soft md:text-base"
        >
          {site.hero.subheadline}
        </motion.p>
      </div>

    </section>
  );
}
