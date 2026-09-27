"use client";

import { useEffect, useRef } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { EASE_OUT_EXPO, site } from "@/lib/site";

import { GrassField } from "./grass-field";
import { BACK_RIDGE, FRONT_RIDGE, ridgePath } from "./landscape";

const YEAR = new Date().getFullYear();

/* Typographic apostrophe, kept out of JSX so it needs no escaping. */
const WORDMARK = "LET’S TALK";

/**
 * Every layer shares one 1600×900 canvas, sliced to cover, so clouds, haze
 * and hills stay registered to each other at any aspect ratio.
 */
const SCENE = { viewBox: "0 0 1600 900", preserveAspectRatio: "xMidYMid slice" } as const;

/**
 * The cloud banks, pre-rendered. They were an SVG of puffs roughened by
 * turbulence, displacement and blur filters, and rasterising those filters
 * stalled the GPU for a quarter of a second as the footer came into view.
 * Nothing in them moves, so they ship as one image rendered from that SVG
 * (footer-clouds.source.svg, rendered 2880px wide in Chrome).
 */
const CLOUDS = "/images/footer-clouds.webp";

/**
 * Closing panel: the LET’S TALK close, set in the sky of a painted landscape.
 *
 * Painted rather than photographed: the clouds are an SVG painting
 * (roughened by noise filters) baked to one light image, and
 * the hills are live WebGL grass moving in the wind, with a painted SVG
 * version standing in wherever that cannot run. Layers drift apart on the
 * way in for depth, and the clouds move slowly once it settles.
 */
export function Footer() {
  const ref = useRef<HTMLElement>(null);
  const motionOff = useReducedMotion();

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  // Parallax depth is flattened after mount for reduced motion, not branched
  // on during render, so the server's HTML and the first client render agree.
  const depth = useMotionValue(1);
  useEffect(() => depth.set(motionOff ? 0 : 1), [depth, motionOff]);
  const cloudsY = useTransform(() => -40 * (1 - scrollYProgress.get()) * depth.get());
  const hillsY = useTransform(() => 140 * (1 - scrollYProgress.get()) * depth.get());
  const markY = useTransform(() => 90 * (1 - scrollYProgress.get()) * depth.get());

  // One trigger for the whole close, so the wordmark and the button (which
  // live in different layers) still arrive together.
  const arrived = useInView(ref, { once: true, amount: 0.4 });
  const arrival = {
    initial: { opacity: 0 },
    animate: { opacity: arrived ? 1 : 0 },
    transition: { duration: motionOff ? 0 : 1.6, ease: EASE_OUT_EXPO },
  } as const;

  return (
    <footer
      ref={ref}
      className="relative z-10 flex min-h-svh w-full flex-col overflow-hidden"
      style={{
        background:
          "radial-gradient(90% 70% at 8% 0%, #f2e7e3 0%, rgba(242,231,227,0) 60%)," +
          "linear-gradient(180deg, #e7e9eb 0%, #e0e5e9 50%, #d4dde5 72%, #cfd9e2 100%)",
      }}
    >
      {/* ---- Scene ---- */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[2] select-none">
        {/* Clouds — the outer layer carries scroll depth, the inner one the
            slow drift (a compositor loop), both as transforms on an
            already-rasterised layer. */}
        <motion.div className="absolute inset-0 will-change-transform" style={{ y: cloudsY }}>
          <div
            className="ambient absolute inset-y-0 -left-[4%] w-[108%] will-change-transform"
            style={{ animationName: "drift-clouds", animationDuration: "70s" }}
          >
            {/* object-cover is the scene's xMidYMid slice. A plain img: it is
                one fixed decorative plate, already sized for any width. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={CLOUDS}
              alt=""
              decoding="async"
              draggable={false}
              className="h-full w-full object-cover"
            />
          </div>
        </motion.div>

        {/* Hills */}
        <motion.div className="absolute inset-0 will-change-transform" style={{ y: hillsY }}>
          <GrassField still={Boolean(motionOff)} fallback={<PaintedHills />} />
        </motion.div>
      </div>

      {/* ---- Close, set in the sky ----
           The ask holds the centre; the line below rides the grass, so the
           whole close still measures exactly one viewport.

           The wordmark sits behind the clouds and the button in front of
           them, so the letters sink into the cloud bank. That needs the two
           in separate layers either side of the scene (z 1 < scene 2 < 3):
           this wrapper must not form a stacking context of its own, so the
           parallax and fade are carried by each of them, not by it. */}
      <div className="relative flex flex-1 flex-col items-center justify-center gap-10 px-6 pb-[14svh] md:gap-14 md:px-12">
        {/* ---- Screen-width wordmark ----
             Gradient clipped to the glyphs: the weight stays enormous while
             the letters fade off at the baseline, which keeps it elegant. */}
        <motion.h2
          aria-label={WORDMARK}
          style={{ y: markY }}
          {...arrival}
          className={[
            "relative z-[1] select-none whitespace-nowrap text-center",
            "font-display text-[clamp(3.25rem,17vw,15rem)] font-medium leading-[0.82] tracking-tighter",
            "bg-[linear-gradient(180deg,#111111_0%,#111111_34%,rgba(17,17,17,0.32)_100%)]",
            "bg-clip-text text-transparent",
          ].join(" ")}
        >
          {WORDMARK}
        </motion.h2>

        {/* ---- Close ----
             Same pill as the section CTAs, scaled up: the footer is where the
             site's one action should look most familiar, not most novel. */}
        <motion.a
          href={`mailto:${site.contact.email}`}
          style={{ y: markY }}
          {...arrival}
          className="group relative z-[3] inline-flex items-center gap-4 rounded-full bg-headline py-2.5 pl-8 pr-2.5 text-[15px] font-medium text-white transition-colors duration-500 hover:bg-black/80 md:text-base"
        >
          {site.contact.cta}
          <span className="flex size-11 items-center justify-center rounded-full bg-white text-headline md:size-12">
            <ArrowUpRight
              className="size-[18px] transition-transform duration-500 ease-out-expo group-hover:rotate-45"
              strokeWidth={1.8}
            />
          </span>
        </motion.a>
      </div>

      {/* Light on the grass, where the old muted grey would sink */}
      <p className="relative z-[3] pb-10 text-center text-[12.5px] text-white/75">
        © {YEAR} {site.name}. All rights reserved.
      </p>
    </footer>
  );
}

/**
 * The hills as a still painting: streaked SVG turbulence for grass. Shown
 * until the live field is up, and wherever WebGL 2 is not available.
 */
function PaintedHills() {
  return (
    <svg {...SCENE} className="h-full w-full">
      <defs>
        <linearGradient id="nx-hill-back" x1="0" y1="600" x2="0" y2="900" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#c8583f" />
          <stop offset="0.35" stopColor="#9b2f36" />
          <stop offset="1" stopColor="#561722" />
        </linearGradient>
        <radialGradient id="nx-sunlit" cx="840" cy="640" r="520" gradientUnits="userSpaceOnUse" gradientTransform="translate(840 640) scale(1 0.2) translate(-840 -640)">
          <stop offset="0" stopColor="#f0a26a" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="#e07e5c" stopOpacity="0.55" />
          <stop offset="1" stopColor="#c8583f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="nx-hill-front" x1="0" y1="690" x2="0" y2="900" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#862530" />
          <stop offset="1" stopColor="#45111a" />
        </linearGradient>
        <filter id="nx-grass" x="0" y="-8%" width="100%" height="116%">
          {/* Tufted silhouette */}
          <feTurbulence type="fractalNoise" baseFrequency="0.24 0.02" numOctaves="2" seed="4" result="edge" />
          <feDisplacementMap in="SourceGraphic" in2="edge" scale="12" xChannelSelector="R" yChannelSelector="G" result="shape" />
          {/* Blades: noise stretched vertically */}
          <feTurbulence type="fractalNoise" baseFrequency="0.7 0.1" numOctaves="3" seed="9" result="blades" />
          <feColorMatrix
            in="blades"
            type="matrix"
            values="0 0 0 0 0.2  0 0 0 0 0.05  0 0 0 0 0.04  0 0 0 -1.3 0.8"
            result="shade"
          />
          <feComposite in="shade" in2="shape" operator="in" result="shadeIn" />
          <feColorMatrix
            in="blades"
            type="matrix"
            values="0 0 0 0 0.96  0 0 0 0 0.6  0 0 0 0 0.45  0 0 0 1.4 -0.95"
            result="glint"
          />
          <feComposite in="glint" in2="shape" operator="in" result="glintIn" />
          <feMerge>
            <feMergeNode in="shape" />
            <feMergeNode in="shadeIn" />
            <feMergeNode in="glintIn" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#nx-grass)">
        {/* Sunlit ridge */}
        <path d={ridgePath(BACK_RIDGE)} fill="url(#nx-hill-back)" />
        <path d={ridgePath(BACK_RIDGE)} fill="url(#nx-sunlit)" />
        {/* Shadowed foreground swell */}
        <path d={ridgePath(FRONT_RIDGE)} fill="url(#nx-hill-front)" opacity="0.92" />
      </g>
    </svg>
  );
}
