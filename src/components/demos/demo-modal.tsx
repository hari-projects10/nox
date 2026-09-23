"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useLenis } from "lenis/react";
import { Lock, X } from "lucide-react";

import { EASE_OUT_EXPO } from "@/lib/site";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

type DemoModalProps = {
  open: boolean;
  onClose: () => void;
  name: string;
  tagline: string;
  url: string;
  accent: string;
  /** Design viewport of the demo inside; the window hugs it, so no letterbox. */
  design?: { width: number; height: number };
  /**
   * `browser` wraps the demo in a desktop window; `bare` drops the furniture
   * entirely, for a product that already draws its own device.
   */
  shell?: "browser" | "bare";
  children: ReactNode;
};

const CHROME = 48; /* h-12 title bar */
const MIN_WIDTH = 560; /* below this the title bar gets cramped */
const MIN_SCALE = 0.42; /* matches IframeDemo: pan rather than shrink further */

/** Window size that exactly contains the demo at the largest scale that fits. */
function useWindowBox(
  design: { width: number; height: number } | undefined,
  shell: "browser" | "bare",
) {
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!design) return;

    const chrome = shell === "browser" ? CHROME : 0;
    /* A bare panel has no title bar to keep legible, so it may be as narrow
       as the device it holds. */
    const minWidth = shell === "browser" ? MIN_WIDTH : 0;

    const measure = () => {
      const pad = window.innerWidth >= 768 ? 48 : 16; /* p-6 / p-2, both sides */
      const availWidth = window.innerWidth - pad;
      const availHeight = window.innerHeight - pad;
      const scale = Math.max(
        Math.min(availWidth / design.width, (availHeight - chrome) / design.height, 1),
        MIN_SCALE,
      );
      setBox({
        width: Math.min(Math.max(design.width * scale, minWidth), availWidth),
        height: Math.min(design.height * scale + chrome, availHeight),
      });
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [design, shell]);

  return box;
}

/**
 * Full-viewport product window. Portalled to <body> because page content
 * lives inside a transformed wrapper (KineticViewport), which would
 * otherwise trap `position: fixed`.
 */
export function DemoModal({
  open,
  onClose,
  name,
  tagline,
  url,
  accent,
  design,
  shell = "browser",
  children,
}: DemoModalProps) {
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const box = useWindowBox(design, shell);
  /* Chrome density follows the window, not the viewport — the window hugs
     its demo, so it can be far narrower than the screen. */
  const width = box?.width ?? (isClient ? window.innerWidth : 1480);
  const lenis = useLenis();
  const closeButton = useRef<HTMLButtonElement>(null);

  /* Freeze the page behind, close on Escape, hand focus back on close. */
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;

    lenis?.stop();
    root.style.overflow = "hidden";
    closeButton.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      root.style.overflow = previousOverflow;
      lenis?.start();
      previouslyFocused?.focus?.();
    };
  }, [open, lenis, onClose]);

  if (!isClient) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[800] flex items-center justify-center p-2 md:p-6">
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_0%,rgba(20,20,28,0.62),rgba(6,6,10,0.86))] backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={onClose}
          />

          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[46vh] w-[62vw] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
            style={{ background: accent }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.16 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${name} interactive demo`}
            className={cn(
              "relative flex flex-col overflow-hidden font-sans text-[#111]",
              "rounded-[18px] md:rounded-[22px]",
              shell === "browser"
                ? [
                    "bg-white ring-1 ring-white/[0.12]",
                    "shadow-[0_2px_8px_rgba(0,0,0,0.18),0_24px_60px_-20px_rgba(0,0,0,0.45),0_70px_140px_-50px_rgba(0,0,0,0.75)]",
                  ]
                : /* The device draws its own bezel and shadow; anything we add
                     around it reads as a second, fake frame. */
                  "bg-transparent",
              !box && "h-full max-h-[960px] w-full max-w-[1480px]",
            )}
            style={
              {
                "--accent": accent,
                ...(box && { width: box.width, height: box.height }),
              } as CSSProperties
            }
            initial={{ opacity: 0, y: 28, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.99 }}
            transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
          >
            {/* ---- Window chrome: only where a window is the right metaphor ---- */}
            {shell === "browser" ? (
              <div className="relative flex h-12 shrink-0 items-center gap-4 border-b border-black/[0.07] bg-gradient-to-b from-[#fcfcfd] to-[#f2f2f5] px-4">
                {/* Hairline highlight, like light catching the top edge of glass. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white"
                />

                {width >= 900 && (
                  <div className="flex min-w-0 items-baseline gap-2">
                    <span className="text-[13px] font-semibold tracking-[-0.01em]">{name}</span>
                    {width >= 1100 && (
                      <span className="truncate text-[12.5px] text-black/35">{tagline}</span>
                    )}
                  </div>
                )}

                {width >= 700 && (
                  <div className="mx-auto flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-[5px] text-[11.5px] font-medium text-black/45 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.05]">
                    <Lock className="h-[11px] w-[11px] text-black/30" />
                    <span className="tracking-[-0.005em]">{url}</span>
                  </div>
                )}

                <div className="ml-auto flex items-center gap-3">
                  <button
                    ref={closeButton}
                    type="button"
                    onClick={onClose}
                    aria-label="Close demo"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-black/40 transition-colors hover:bg-black/[0.05] hover:text-black"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}

            {/* ---- Product ---- */}
            <div className="relative min-h-0 flex-1">{children}</div>
          </motion.div>

          {/* A bare shell has no title bar, so close lives over the backdrop,
              clear of the device. */}
          {shell === "bare" && (
            <motion.div
              className="absolute right-4 top-4 flex items-center gap-4 md:right-8 md:top-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <button
                ref={closeButton}
                type="button"
                onClick={onClose}
                aria-label="Close demo"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 ring-1 ring-white/15 backdrop-blur-md transition-colors hover:bg-white/20 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
