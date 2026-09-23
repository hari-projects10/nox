"use client";

import { useEffect, useRef, useState } from "react";

type Design = { width: number; height: number };

type IframeDemoProps = {
  src: string;
  title: string;
  /**
   * Viewport the demo was designed against. When set, the frame is rendered
   * at exactly that size and scaled to fit, so the page never sees a narrow
   * viewport and never trips its own responsive fallbacks. Omit for demos
   * that lay themselves out fluidly.
   */
  design?: Design;
  /** Letterbox colour, matched to the demo's own page background. */
  background?: string;
};

/** Below this, a shrunk-to-fit desktop UI stops being readable — pan instead. */
const MIN_SCALE = 0.42;

/**
 * A default OS scrollbar sitting against the window's rounded corner reads as
 * a web page, not a product. The demos are our own files on our own origin, so
 * we can style theirs; if that ever fails, the frame is fine without it.
 */
const SCROLLBAR_CSS = `
  html { scrollbar-width: thin; scrollbar-color: rgba(15,35,80,.22) transparent; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: rgba(15,35,80,.2);
    border-radius: 99px;
    border: 2px solid transparent;
    background-clip: content-box;
  }
  ::-webkit-scrollbar-thumb:hover { background: rgba(15,35,80,.34); background-clip: content-box; }
  ::-webkit-scrollbar-corner { background: transparent; }
`;

function refineScrollbars(frame: HTMLIFrameElement) {
  try {
    const doc = frame.contentDocument;
    if (!doc) return;
    const style = doc.createElement("style");
    style.textContent = SCROLLBAR_CSS;
    doc.head.appendChild(style);
  } catch {
    /* Cross-origin or not ready — the demo just keeps its own scrollbars. */
  }
}

export function IframeDemo({ src, title, design, background }: IframeDemoProps) {
  const [loaded, setLoaded] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(design ? 0 : 1);

  useEffect(() => {
    const el = container.current;
    if (!design || !el) return;

    const fit = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      /* Never upscale past the design size; never shrink past legibility. */
      const contain = Math.min(width / design.width, height / design.height, 1);
      setScale(Math.max(contain, MIN_SCALE));
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [design]);

  return (
    <div
      ref={container}
      className="relative flex h-full w-full items-center justify-center overflow-auto overscroll-contain"
      style={{ background: background ?? "#fff" }}
    >
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-black/10 border-t-[var(--accent)]" />
        </div>
      )}

      {design ? (
        /* Sizer carries the scaled footprint so the container can pan to it. */
        <div
          className="relative shrink-0"
          style={{
            width: design.width * scale,
            height: design.height * scale,
            visibility: scale ? "visible" : "hidden",
          }}
        >
          <iframe
            src={src}
            title={title}
            onLoad={(e) => {
              refineScrollbars(e.currentTarget);
              setLoaded(true);
            }}
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            className="absolute left-0 top-0 border-0"
            style={{
              width: design.width,
              height: design.height,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          />
        </div>
      ) : (
        <iframe
          src={src}
          title={title}
          onLoad={(e) => {
            refineScrollbars(e.currentTarget);
            setLoaded(true);
          }}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          className="h-full w-full border-0"
        />
      )}
    </div>
  );
}
