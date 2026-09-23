"use client";

import { useEffect, useState, type RefObject } from "react";

type Options = {
  /** rootMargin for the observer. */
  margin?: string;
  /** When false the hook reports revealed immediately. */
  enabled?: boolean;
};

/**
 * Latches true once the element enters the viewport — or once it has
 * already travelled above it.
 *
 * That second case is the important one: IntersectionObserver only samples
 * on frame boundaries, so a fast flick scroll can carry an element past the
 * observer band between two samples. It then never reports as intersecting
 * and the content stays stuck in its hidden state forever.
 */
export function useRevealOnce(
  ref: RefObject<Element | null>,
  { margin = "-100px", enabled = true }: Options = {},
) {
  const [revealed, setRevealed] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const alreadyPassed =
            entry.rootBounds != null &&
            entry.boundingClientRect.bottom <= entry.rootBounds.top;

          if (entry.isIntersecting || alreadyPassed) {
            setRevealed(true);
            observer.disconnect();
            return;
          }
        }
      },
      { rootMargin: margin },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, margin, enabled]);

  return revealed;
}
