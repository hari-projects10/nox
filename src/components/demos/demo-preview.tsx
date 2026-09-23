"use client";

import { useEffect, useRef, useState } from "react";

type Design = { width: number; height: number };

type DemoPreviewProps = {
  src: string;
  title: string;
  design: Design;
  background: string;
  /**
   * `top` scales to the container width and crops the fold, like a screenshot
   * of a console. `contain` fits the whole thing, for a device that should be
   * seen in full.
   */
  fit: "top" | "contain";
};

/** Live previews are heavy; phones get the static poster instead. */
const LIVE_FROM = "(min-width: 768px)";

/**
 * A running instance of the product, scaled into a panel and held inert —
 * the section's proof that these are real systems, not mockups. Mounts only
 * once it is near the viewport, so the homepage never pays for it up front.
 */
export function DemoPreview({ src, title, design, background, fit }: DemoPreviewProps) {
  const container = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [scale, setScale] = useState(0);

  /* Gate: desktop, not data-saving, and close enough to matter. */
  useEffect(() => {
    const el = container.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (!window.matchMedia(LIVE_FROM).matches) return;
    if (window.matchMedia("(prefers-reduced-data: reduce)").matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setMounted(true);
        observer.disconnect();
      },
      /* A screen and a half of warning: these carry a 3.4MB model and a
         WebGL runtime, so arriving at the panel should not be the moment
         the download starts. */
      { rootMargin: "1400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = container.current;
    if (!mounted || !el) return;

    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      setScale(
        fit === "top"
          ? width / design.width
          : /* Leave a margin so the device reads as an object in a space. */
            Math.min(width / design.width, height / design.height) * 0.92,
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [mounted, design, fit]);

  return (
    <div
      ref={container}
      className="absolute inset-0 overflow-hidden"
      style={{ background }}
    >
      {mounted && scale > 0 && (
        <iframe
          src={src}
          title={title}
          tabIndex={-1}
          aria-hidden="true"
          loading="lazy"
          scrolling="no"
          sandbox="allow-scripts allow-same-origin"
          className="pointer-events-none absolute border-0"
          style={{
            width: design.width,
            height: design.height,
            transform: `scale(${scale})`,
            ...(fit === "top"
              ? { top: 0, left: 0, transformOrigin: "top left" }
              : {
                  top: "50%",
                  left: "50%",
                  transformOrigin: "center center",
                  marginTop: -design.height / 2,
                  marginLeft: -design.width / 2,
                }),
          }}
        />
      )}
    </div>
  );
}
