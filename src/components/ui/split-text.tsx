"use client";

import { type CSSProperties, Fragment, useMemo, useRef } from "react";

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
 * The rise is a CSS transition per character (.split-char in globals.css),
 * so it runs on the compositor: it stays smooth through a busy main thread
 * and costs nothing per frame. Reduced motion shows the text in place.
 *
 * The animated tree is aria-hidden and data-nosnippet: each character is
 * its own inline-block, which Google reads as separate words ("A r c h i
 * t e c t i n g"). The plain text rides alongside in an sr-only span, so
 * search engines and screen readers get the line once, as written.
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
  // The trigger has to live on the unclipped wrapper, not the characters:
  // a character starts translated fully outside its own overflow-hidden
  // mask, and IntersectionObserver clips against ancestor overflow, so a
  // per-character observer would never fire.
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
    <>
      <span className="sr-only">{text}</span>
      <span
        ref={ref}
        aria-hidden="true"
        data-nosnippet=""
        data-revealed={revealed ? "" : undefined}
        className={cn("inline", className)}
        style={{ "--split-duration": `${duration}s` } as CSSProperties}
      >
        {words.map(({ word, chars }, wordIndex) => (
          <Fragment key={`${word}-${wordIndex}`}>
            {/* Mask: extra padding keeps descenders from being clipped. */}
            <span className="inline-block overflow-hidden whitespace-nowrap pb-[0.14em] align-bottom -mb-[0.14em]">
              {chars.map(({ char, index }) => (
                <span
                  key={index}
                  className="split-char"
                  style={
                    { "--d": `${delay + index * stagger}s` } as CSSProperties
                  }
                >
                  {char}
                </span>
              ))}
            </span>
            {/* Real space, outside the mask, so words still wrap. */}
            {wordIndex < words.length - 1 ? " " : null}
          </Fragment>
        ))}
      </span>
    </>
  );
}
