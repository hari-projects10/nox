"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

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
  /** A still of the product: all phones see, and what desktop sees first. */
  poster: string;
};

/** Live previews are heavy; phones and touch keep the poster instead. */
const LIVE_FROM = "(min-width: 768px)";

/**
 * A running instance of the product, scaled into a panel and held inert —
 * the section's proof that these are real systems, not mockups. Shows a
 * poster of the same frame until someone rests on it.
 */
export function DemoPreview({ src, title, design, background, fit, poster }: DemoPreviewProps) {
  const container = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [scale, setScale] = useState(0);

  /*
   * Goes live only when a pointer rests on the card. Starting a product is
   * heavy work that shares the page's main thread (Veloce parses a 3.4MB
   * model), so doing it as the section scrolls past froze the scroll for
   * most of a second. The poster is the same frame, so until then nothing
   * looks different; resting on the card is also exactly when the motion
   * inside it is worth seeing.
   */
  const dwell = useRef(0);
  const canGoLive = () =>
    window.matchMedia(LIVE_FROM).matches &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-data: reduce)").matches;
  const onPointerEnter = () => {
    if (mounted || !canGoLive()) return;
    dwell.current = window.setTimeout(() => setMounted(true), 350);
  };
  const onPointerLeave = () => window.clearTimeout(dwell.current);
  useEffect(() => () => window.clearTimeout(dwell.current), []);

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
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <Image
        src={poster}
        alt=""
        aria-hidden="true"
        fill
        sizes="(max-width: 1024px) 100vw, 66vw"
        className={fit === "top" ? "object-cover object-top" : "scale-[0.92] object-contain"}
      />

      {mounted && scale > 0 && (
        <iframe
          src={src}
          title={title}
          tabIndex={-1}
          aria-hidden="true"
          loading="lazy"
          scrolling="no"
          sandbox="allow-scripts allow-same-origin"
          onLoad={() => setLoaded(true)}
          className="pointer-events-none absolute border-0 transition-opacity duration-700"
          style={{
            /* Takes over from the poster only once it has something to show. */
            opacity: loaded ? 1 : 0,
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
