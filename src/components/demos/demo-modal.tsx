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

import { DemoBrief, type Brief } from "./demo-brief";

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
  /** Case-study brief shown beside the product where the screen allows. */
  brief?: Brief;
  /**
   * Phone-sized screen: the product takes the whole screen as a sheet, in
   * its own mobile layout, rather than a shrunken desktop window.
   */
  compact?: boolean;
  children: ReactNode;
};

const CHROME = 48; /* h-12 title bar */
const MIN_WIDTH = 560; /* below this the title bar gets cramped */
const MIN_SCALE = 0.42; /* matches IframeDemo: pan rather than shrink further */
const BRIEF_WIDTH = 340;
const BRIEF_GAP = 56;
/* Below this a console window and a brief cannot share the screen well. */
const BRIEF_MIN_VIEWPORT = 1180;

/** Window size that exactly contains the demo at the largest scale that fits. */
function useWindowBox(
  design: { width: number; height: number } | undefined,
  shell: "browser" | "bare",
  withBrief: boolean,
) {
  const [box, setBox] = useState<{ width: number; height: number; brief: boolean } | null>(
    null,
  );

  useEffect(() => {
    if (!design) return;

    const chrome = shell === "browser" ? CHROME : 0;
    /* A bare panel has no title bar to keep legible, so it may be as narrow
       as the device it holds. */
    const minWidth = shell === "browser" ? MIN_WIDTH : 0;

    const measure = () => {
      const pad = window.innerWidth >= 768 ? 48 : 16; /* p-6 / p-2, both sides */
      /* A console gives up width to the brief beside it; a device keeps its
         place in the middle and the brief takes the free space to its right. */
      const brief =
        withBrief && shell === "browser" && window.innerWidth >= BRIEF_MIN_VIEWPORT;
      const availWidth = window.innerWidth - pad - (brief ? BRIEF_WIDTH + BRIEF_GAP : 0);
      const availHeight = window.innerHeight - pad;
      const scale = Math.max(
        Math.min(availWidth / design.width, (availHeight - chrome) / design.height, 1),
        MIN_SCALE,
      );
      const width = Math.min(Math.max(design.width * scale, minWidth), availWidth);
      const beside = (window.innerWidth - width) / 2 - BRIEF_GAP - pad / 2;
      setBox({
        width,
        height: Math.min(design.height * scale + chrome, availHeight),
        brief: brief || (withBrief && shell === "bare" && beside >= 300),
      });
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [design, shell, withBrief]);

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
  brief,
  compact = false,
  children,
}: DemoModalProps) {
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const box = useWindowBox(design, shell, Boolean(brief));
  const showBrief = Boolean(brief && box?.brief);
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
      {open && compact && (
        <div key="sheet" className="fixed inset-0 z-[800]">
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${name} interactive demo`}
            className="absolute inset-0 flex flex-col overflow-hidden bg-[#0c0c10] font-sans"
            style={{ "--accent": accent } as CSSProperties}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
          >
            {/* ---- Sheet header: what this is, and the way out ---- */}
            <div className="relative flex h-14 shrink-0 items-center gap-3 pl-5 pr-3 text-white">
              <motion.span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: accent }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.35, ease: EASE_OUT_EXPO }}
              />
              <motion.div
                className="min-w-0 flex-1"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3, ease: EASE_OUT_EXPO }}
              >
                <p className="text-[15px] font-semibold leading-tight tracking-[-0.01em]">{name}</p>
                <p className="truncate text-[12px] leading-tight text-white/50">
                  {brief?.pitch ?? tagline}
                </p>
              </motion.div>
              <button
                ref={closeButton}
                type="button"
                onClick={onClose}
                aria-label="Close demo"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors active:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
              {/* A hairline in the product's colour, drawn in as it opens. */}
              <motion.span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-px origin-left"
                style={{ background: accent }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.9, delay: 0.35, ease: EASE_OUT_EXPO }}
              />
            </div>

            <div className="relative min-h-0 flex-1">{children}</div>
          </motion.div>
        </div>
      )}
      {open && !compact && (
        <div
          key="window"
          className="fixed inset-0 z-[800] flex items-center justify-center p-2 md:p-6"
          style={{ gap: showBrief && shell === "browser" ? BRIEF_GAP : undefined }}
        >
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

          {/* ---- Brief: beside a console, or in the free space right of a device ---- */}
          {showBrief && brief && (
            <div
              className={cn(
                "relative shrink-0",
                shell === "bare" && "absolute top-1/2 -translate-y-1/2",
              )}
              style={{
                width: BRIEF_WIDTH,
                ...(shell === "bare" &&
                  box && { left: `calc(50% + ${box.width / 2 + BRIEF_GAP}px)` }),
              }}
            >
              <DemoBrief name={name} accent={accent} brief={brief} />
            </div>
          )}

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
