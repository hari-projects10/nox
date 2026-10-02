"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { SplitText } from "@/components/ui/split-text";
import { EASE_OUT_EXPO } from "@/lib/site";

/**
 * Openers that get a visitor talking about their own project, each leading
 * toward a conversation with the team. Every one is worded to hit a
 * prepared answer (lib/chat/faq.ts), so the first reply lands instantly
 * and costs no model quota.
 */
const STARTERS = [
  "What can you build for my business?",
  "Can you build an AI agent for my business?",
  "I have an idea. How do we get started?",
  "Where can I see your work?",
  "Can I book a call with the team?",
];

const HEADLINE = "What are we building together?";

/**
 * The welcome, read in sequence like the case-study briefs: the ask rises
 * out of its mask, then the starters are ruled in one row at a time.
 */
export function ChatIntro({ onPick }: { onPick: (prompt: string) => void }) {
  const motionOff = useReducedMotion();

  /* Held one frame so the letters have a start state to rise from. */
  const [play, setPlay] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setPlay(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const at = (delay: number, duration = 0.9) => ({
    duration: motionOff ? 0 : duration,
    delay: motionOff ? 0 : delay,
    ease: EASE_OUT_EXPO,
  });

  return (
    <motion.div
      key="intro"
      exit={{ opacity: 0, y: -10, transition: { duration: 0.25 } }}
      className="flex min-h-full flex-col justify-end pb-2 pt-6 short:pt-5 squat:pt-3"
    >
      <motion.p
        className="text-[10.5px] font-semibold uppercase tracking-[0.24em] text-ink-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={at(0.25)}
      >
        AI concierge
      </motion.p>

      <h2
        aria-label={HEADLINE}
        className="mt-4 max-w-[13ch] font-display text-[clamp(1.9rem,8.4vw,2.2rem)] font-medium leading-[1.02] tracking-tighter text-headline short:mt-3 short:text-[clamp(1.6rem,7.4vw,1.9rem)]"
      >
        <SplitText text={HEADLINE} delay={motionOff ? 0 : 0.3} stagger={0.016} play={play} />
      </h2>

      <motion.p
        className="mt-4 max-w-[36ch] text-[13.5px] leading-relaxed text-ink-soft short:mt-3 squat:hidden"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={at(0.55)}
      >
        Tell us about your idea, explore our demo work, or book a call with the team. Answers
        in seconds, in your language.
      </motion.p>

      <div className="mt-7 short:mt-6 squat:mt-4">
        <motion.p
          className="text-[10.5px] font-semibold uppercase tracking-[0.24em] text-ink-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={at(0.7)}
        >
          Start with
        </motion.p>

        <ul className="mt-2">
          {STARTERS.map((prompt, i) => (
            <li key={prompt} className="relative">
              <motion.span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-px origin-left bg-black/[0.08]"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={at(0.75 + i * 0.07, 1)}
              />
              <motion.button
                type="button"
                onClick={() => onPick(prompt)}
                className="group flex w-full items-center gap-4 py-3 text-left short:py-2.5"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={at(0.82 + i * 0.07)}
              >
                <span className="w-5 text-[11px] tabular-nums text-indigo-500">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="flex-1 text-[14px] leading-snug text-ink/85 transition-[transform,color] duration-500 ease-out-expo group-hover:translate-x-1 group-hover:text-headline">
                  {prompt}
                </span>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full text-ink-soft ring-1 ring-black/[0.08] transition-colors duration-300 group-hover:bg-headline group-hover:text-white group-hover:ring-headline">
                  <ArrowUpRight
                    className="size-3.5 transition-transform duration-500 ease-out-expo group-hover:rotate-45"
                    strokeWidth={2}
                  />
                </span>
              </motion.button>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
