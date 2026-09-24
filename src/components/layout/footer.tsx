"use client";

import { useEffect, useRef } from "react";
import {
  motion,
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

/** Cloud banks as overlapping puffs, flattened on a shared base line. */
const MAIN_BANK = [
  [600, 470, 132],
  [470, 520, 96],
  [745, 515, 108],
  [350, 560, 82],
  [870, 560, 84],
  [225, 590, 76],
  [120, 606, 92],
  [990, 600, 62],
  [30, 630, 70],
] as const;

const SIDE_BANK = [
  [1110, 598, 44],
  [1185, 604, 40],
  [1330, 562, 70],
  [1255, 606, 46],
  [1420, 604, 42],
  [1525, 612, 52],
  [1600, 620, 44],
] as const;

/**
 * Closing panel: the LET’S TALK close, set in the sky of a painted landscape.
 *
 * Built from vector layers rather than a photograph so it stays sharp at
 * any width and weighs nothing. SVG noise roughens the cloud silhouettes;
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
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none">
        {/* Clouds — the outer layer carries scroll depth, the inner one the
            slow drift, both as transforms on an already-rasterised layer. */}
        <motion.div className="absolute inset-0 will-change-transform" style={{ y: cloudsY }}>
          <motion.div
            className="absolute inset-y-0 -left-[4%] w-[108%] will-change-transform"
            animate={motionOff ? undefined : { x: ["0%", "-2.5%", "0%"] }}
            transition={{ duration: 70, ease: "easeInOut", repeat: Infinity }}
          >
            <svg {...SCENE} className="h-full w-full">
              <defs>
                <linearGradient id="nx-cloud" x1="0" y1="330" x2="0" y2="690" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#fdf9f7" />
                  <stop offset="0.45" stopColor="#f7f1ef" />
                  <stop offset="1" stopColor="#dce3ea" />
                </linearGradient>
                <filter id="nx-brush" x="-10%" y="-20%" width="120%" height="140%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.013" numOctaves="3" seed="7" result="warp" />
                  <feDisplacementMap in="SourceGraphic" in2="warp" scale="30" xChannelSelector="R" yChannelSelector="G" result="rough" />
                  <feGaussianBlur in="rough" stdDeviation="2.6" result="soft" />
                  {/* Faint dry-brush strokes inside the fill */}
                  <feTurbulence type="fractalNoise" baseFrequency="0.05 0.18" numOctaves="2" seed="3" result="strokes" />
                  <feColorMatrix
                    in="strokes"
                    type="matrix"
                    values="0 0 0 0 0.82  0 0 0 0 0.86  0 0 0 0 0.9  0 0 0 -1.2 0.75"
                    result="tint"
                  />
                  <feComposite in="tint" in2="soft" operator="in" result="tintIn" />
                  <feMerge>
                    <feMergeNode in="soft" />
                    <feMergeNode in="tintIn" />
                  </feMerge>
                </filter>
                <filter id="nx-haze" x="-5%" y="-50%" width="110%" height="200%">
                  <feGaussianBlur stdDeviation="22" />
                </filter>
              </defs>

              <g filter="url(#nx-brush)" fill="url(#nx-cloud)">
                {MAIN_BANK.map(([cx, cy, r]) => (
                  <circle key={`m${cx}`} cx={cx} cy={cy} r={r} />
                ))}
                <rect x="-40" y="580" width="1100" height="120" rx="40" />
                {SIDE_BANK.map(([cx, cy, r]) => (
                  <circle key={`s${cx}`} cx={cx} cy={cy} r={r} />
                ))}
                <rect x="1070" y="610" width="600" height="90" rx="30" />
              </g>

              {/* Horizon haze melts the cloud bases into distance */}
              <rect x="-100" y="640" width="1800" height="90" fill="#d3dde6" opacity="0.85" filter="url(#nx-haze)" />
            </svg>
          </motion.div>
        </motion.div>

        {/* Hills */}
        <motion.div className="absolute inset-0 will-change-transform" style={{ y: hillsY }}>
          <GrassField still={Boolean(motionOff)} fallback={<PaintedHills />} />
        </motion.div>
      </div>

      {/* ---- Close, set in the sky ----
           The ask holds the centre; the line below rides the grass, so the
           whole close still measures exactly one viewport. */}
      <motion.div
        className="relative flex flex-1 flex-col items-center justify-center gap-10 px-6 pb-[14svh] md:gap-14 md:px-12"
        style={{ y: markY }}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: motionOff ? 0 : 1.6, ease: EASE_OUT_EXPO }}
      >
        {/* ---- Screen-width wordmark ----
             Gradient clipped to the glyphs: the weight stays enormous while
             the letters fade off at the baseline, which keeps it elegant. */}
        <h2
          aria-label={WORDMARK}
          className={[
            "select-none whitespace-nowrap text-center",
            "font-display text-[clamp(3.25rem,17vw,15rem)] font-medium leading-[0.82] tracking-tighter",
            "bg-[linear-gradient(180deg,#111111_0%,#111111_34%,rgba(17,17,17,0.32)_100%)]",
            "bg-clip-text text-transparent",
          ].join(" ")}
        >
          {WORDMARK}
        </h2>

        {/* ---- Close ----
             Same pill as the section CTAs, scaled up: the footer is where the
             site's one action should look most familiar, not most novel. */}
        <a
          href={`mailto:${site.contact.email}`}
          className="group inline-flex items-center gap-4 rounded-full bg-headline py-2.5 pl-8 pr-2.5 text-[15px] font-medium text-white transition-colors duration-500 hover:bg-black/80 md:text-base"
        >
          {site.contact.cta}
          <span className="flex size-11 items-center justify-center rounded-full bg-white text-headline md:size-12">
            <ArrowUpRight
              className="size-[18px] transition-transform duration-500 ease-out-expo group-hover:rotate-45"
              strokeWidth={1.8}
            />
          </span>
        </a>
      </motion.div>

      {/* Light on the grass, where the old muted grey would sink */}
      <p className="relative pb-10 text-center text-[12.5px] text-white/75">
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
