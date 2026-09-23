"use client";

import { Fragment, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { EASE_OUT_EXPO } from "@/lib/site";
import { useRevealOnce } from "@/lib/use-reveal-once";
import { cn } from "@/lib/utils";

type SplitTextProps = {
  text: string;
  /** Seconds before the first character moves. */
  delay?: number;
  /** Seconds between characters. */
  stagger?: number;
  duration?: number;
  /** Reveal when scrolled into view instead of on mount. */
  inView?: boolean;
  /** External gate — held at the initial state until true. */
  play?: boolean;
  className?: string;
};

/**
 * Character-by-character slide-up reveal. Each word gets its own mask so
 * characters rise out of nothing while words still wrap normally.
 *
 * Decorative by nature: the tree is aria-hidden, so the parent element
 * must carry the real text via aria-label.
 */
export function SplitText({
  text,
  delay = 0,
  stagger = 0.03,
  duration = 1.05,
  inView = false,
  play = true,
  className,
}: SplitTextProps) {
  const prefersReducedMotion = useReducedMotion();

  // The trigger has to live on the unclipped wrapper, not the characters:
  // a character starts translated fully outside its own overflow-hidden
  // mask, and IntersectionObserver clips against ancestor overflow, so a
  // per-character whileInView would never fire.
  const ref = useRef<HTMLSpanElement>(null);
  const revealed = useRevealOnce(ref, { enabled: inView }) && play;

  // Pre-compute a running character index so the stagger reads as one
  // continuous wave across the whole line, not per word.
  const words = useMemo(() => {
    let index = 0;
    return text.split(" ").map((word) => ({
      word,
      chars: [...word].map((char) => ({ char, index: index++ })),
    }));
  }, [text]);

  return (
    <span ref={ref} aria-hidden="true" className={cn("inline", className)}>
      {words.map(({ word, chars }, wordIndex) => (
        <Fragment key={`${word}-${wordIndex}`}>
          {/* Mask: extra padding keeps descenders from being clipped. */}
          <span className="inline-block overflow-hidden whitespace-nowrap pb-[0.14em] align-bottom -mb-[0.14em]">
            {chars.map(({ char, index }) => (
              <motion.span
                key={index}
                className="inline-block will-change-transform"
                initial={prefersReducedMotion ? { y: 0 } : { y: "115%" }}
                animate={revealed ? { y: 0 } : { y: "115%" }}
                transition={{
                  duration: prefersReducedMotion ? 0 : duration,
                  delay: prefersReducedMotion ? 0 : delay + index * stagger,
                  ease: EASE_OUT_EXPO,
                }}
              >
                {char}
              </motion.span>
            ))}
          </span>
          {/* Real space, outside the mask, so words still wrap. */}
          {wordIndex < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );
}
