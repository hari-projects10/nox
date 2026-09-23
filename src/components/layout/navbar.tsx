"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useLenis } from "lenis/react";

import { EASE_OUT_EXPO, site } from "@/lib/site";
import { cn } from "@/lib/utils";

/** Where the bar reads the page: the vertical centre of its own band. */
const PROBE_Y = 40;

/** Above this the bar is always shown, so the landing never hides it. */
const REVEAL_ABOVE = 96;

/** Ignore scroll jitter below this, so the bar never flickers. */
const DEADZONE = 6;

const bar = {
  visible: { y: 0, opacity: 1, transition: { duration: 0.8, ease: EASE_OUT_EXPO } },
  hidden: { y: "-110%", opacity: 0, transition: { duration: 0.45, ease: EASE_OUT_EXPO } },
} as const;

/** A measured document band: where an element sits, in page coordinates. */
type Band = { href?: string; top: number; bottom: number };

/** In-page targets the nav can mark as current. */
const anchors = site.nav
  .map((item) => item.href)
  .filter((href) => href.startsWith("#"));

/**
 * Transparent header. It never paints a surface of its own — it simply
 * inverts when the section under its band is a dark one, so the links stay
 * legible without a frosted plate between them and the page.
 *
 * It also yields on the way down and returns on the way up, so reading is
 * never obstructed but navigation is always one gesture away.
 */
export function Navbar() {
  const [active, setActive] = useState<string | null>(null);
  const [onDark, setOnDark] = useState(false);
  const [hidden, setHidden] = useState(false);
  const lastScroll = useRef(0);
  const targets = useRef<{ anchors: Band[]; dark: Band[] }>({
    anchors: [],
    dark: [],
  });

  /*
   * Measure once, then read nothing from the DOM while scrolling.
   *
   * getBoundingClientRect() per frame was forcing a layout on every frame of
   * every scroll, because the viewport wrapper's transform dirties layout as
   * it goes. Document offsets are stable, so the band each element occupies
   * can be resolved against the scroll position with arithmetic instead.
   */
  const collect = useCallback(() => {
    const offset = window.scrollY;
    const measure = (el: Element): Band => {
      const rect = el.getBoundingClientRect();
      return { top: rect.top + offset, bottom: rect.bottom + offset };
    };

    targets.current = {
      anchors: anchors
        .map((href) => {
          const el = document.querySelector(href);
          return el ? { href, ...measure(el) } : null;
        })
        .filter((band): band is Band & { href: string } => band !== null),
      dark: Array.from(document.querySelectorAll("[data-nav-dark]")).map(measure),
    };
  }, []);

  const probe = useCallback((scroll = window.scrollY) => {
    const line = scroll + PROBE_Y;
    const spans = (band: Band) => band.top <= line && band.bottom > line;

    const current = targets.current.anchors.find(spans)?.href ?? null;
    setActive((prev) => (prev === current ? prev : current));

    const dark = targets.current.dark.some(spans);
    setOnDark((prev) => (prev === dark ? prev : dark));
  }, []);

  useEffect(() => {
    /* Sections settle after fonts and images land, so re-measure then too. */
    const remeasure = () => {
      collect();
      probe();
    };

    remeasure();
    window.addEventListener("resize", remeasure);
    window.addEventListener("load", remeasure);
    document.fonts?.ready.then(remeasure);

    return () => {
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("load", remeasure);
    };
  }, [collect, probe]);

  useLenis((lenis) => {
    probe(lenis.scroll);

    const y = lenis.scroll;
    const delta = y - lastScroll.current;
    /* Hold position until the gesture clears the deadzone, so the decision
       is made on intent rather than on noise. */
    if (Math.abs(delta) < DEADZONE) return;
    lastScroll.current = y;

    const next = y > REVEAL_ABOVE && delta > 0;
    setHidden((prev) => (prev === next ? prev : next));
  });


  return (
    <motion.header
      variants={bar}
      initial="hidden"
      animate={hidden ? "hidden" : "visible"}
      className={cn(
        "fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between gap-3 px-4 sm:gap-6 sm:px-6 md:h-20 md:px-12",
        "transition-colors duration-700 ease-out-expo",
        onDark ? "text-white" : "text-headline",
      )}
    >
      <a href="#top" className="flex shrink-0 items-center">
        <span className="font-display text-[12px] font-semibold tracking-tight sm:text-[13px]">
          {site.name}
        </span>
      </a>

      <nav className="-mr-2 flex items-center sm:gap-1">
        {site.nav.map((item) => {
          const isActive = item.href === active;

          return (
            <a
              key={item.label}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group relative block px-2 py-3 text-[12px] font-medium sm:px-3 sm:text-[13px]",
                "transition-opacity duration-300",
                isActive ? "opacity-100" : "opacity-60 hover:opacity-100",
              )}
            >
              {item.label}

              {/* Rule sits under the label, drawn in the inherited colour so
                  it inverts with the bar. */}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-x-2 bottom-1.5 h-px origin-left bg-current sm:inset-x-3",
                  "transition-transform duration-500 ease-out-expo",
                  isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                )}
              />
            </a>
          );
        })}
      </nav>
    </motion.header>
  );
}
