"use client";

import { motion, useReducedMotion } from "framer-motion";

import { EASE_OUT_EXPO } from "@/lib/site";

export type Brief = {
  /** One line: what the product is. */
  pitch: string;
  /** Two sentences: what it does and who it is for. */
  summary: string;
  /** The parts of the build a visitor can try in the demo. */
  modules: string[];
  facts: { label: string; value: string }[];
};

/** The window lands first; the brief starts as it settles. */
const LEAD = 0.35;

/**
 * Case-study brief beside a live product. It reads in a sequence, the way
 * a presenter would introduce the work: what it is, what it does, what is
 * inside, then a nudge to go and use it.
 */
export function DemoBrief({
  name,
  accent,
  brief,
}: {
  name: string;
  accent: string;
  brief: Brief;
}) {
  const motionOff = useReducedMotion();
  const at = (delay: number, duration = 0.9) => ({
    duration: motionOff ? 0 : duration,
    delay: motionOff ? 0 : LEAD + delay,
    ease: EASE_OUT_EXPO,
  });
  const words = brief.summary.split(" ");

  return (
    <motion.aside
      aria-label={`About ${name}`}
      className="relative text-white"
      exit={{ opacity: 0, x: 12, transition: { duration: 0.25 } }}
    >
      {/* ---- Name: letters rise out of a mask, one after another ---- */}
      <h2
        aria-label={name}
        className="flex font-display text-[clamp(2.75rem,3.6vw,4rem)] font-medium leading-[0.95] tracking-[-0.04em]"
      >
        {Array.from(name).map((char, i) => (
          <span key={i} aria-hidden="true" className="inline-block overflow-hidden pb-[0.08em]">
            <motion.span
              className="inline-block whitespace-pre"
              initial={{ y: "105%", rotate: 6 }}
              animate={{ y: "0%", rotate: 0 }}
              transition={at(i * 0.035, 1.1)}
            >
              {char}
            </motion.span>
          </span>
        ))}
      </h2>

      <motion.p
        className="mt-4 max-w-[30ch] text-[17px] leading-snug text-white/90"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={at(0.35)}
      >
        {brief.pitch}
      </motion.p>

      {/* ---- Summary: words resolve from soft focus, left to right ---- */}
      <p className="mt-5 max-w-[42ch] text-[14px] leading-relaxed text-white/55">
        {words.map((word, i) => (
          <motion.span
            key={i}
            className="inline-block whitespace-pre"
            initial={{ opacity: 0, filter: "blur(6px)", y: 4 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            transition={at(0.5 + i * 0.014, 0.7)}
          >
            {word + (i < words.length - 1 ? " " : "")}
          </motion.span>
        ))}
      </p>

      {/* ---- Inside the build: rows ruled in, one by one ---- */}
      <div className="mt-9">
        <motion.p
          className="text-[10.5px] font-medium uppercase tracking-[0.24em] text-white/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={at(0.85)}
        >
          Inside the build
        </motion.p>
        <ul className="mt-3">
          {brief.modules.map((module, i) => (
            <li key={module} className="relative py-3">
              <motion.span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-px origin-left bg-white/12"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={at(0.9 + i * 0.09, 1)}
              />
              <motion.span
                className="flex items-baseline gap-4"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={at(0.98 + i * 0.09)}
              >
                <span className="w-5 text-[11px] tabular-nums" style={{ color: accent }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[14px] text-white/85">{module}</span>
              </motion.span>
            </li>
          ))}
        </ul>
      </div>

      {/* ---- Facts, then the invitation ---- */}
      <motion.dl
        className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-white/10 pt-6"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={at(1.4)}
      >
        {brief.facts.map((fact) => (
          <div key={fact.label}>
            <dt className="text-[10.5px] uppercase tracking-[0.2em] text-white/40">{fact.label}</dt>
            <dd className="mt-1 text-[13px] text-white/85">{fact.value}</dd>
          </div>
        ))}
      </motion.dl>

      <motion.p
        className="mt-8 flex items-center gap-2.5 text-[12px] text-white/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={at(1.6)}
      >
        <span className="relative flex h-2 w-2">
          {!motionOff && (
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
              style={{ background: accent }}
            />
          )}
          <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: accent }} />
        </span>
        Live build — everything here responds. Try it.
      </motion.p>
    </motion.aside>
  );
}
