"use client";

import {
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  useTransform,
} from "framer-motion";
import { MoveHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Deliberately heavy: a high mass with firm damping means the reveal
 * trails the pointer under the finger and glides into place on release
 * instead of stopping dead.
 */
const CARRIAGE = { stiffness: 210, damping: 28, mass: 1.15 } as const;

type BeforeAfterProps = {
  /** Full-bleed original layer. */
  before: ReactNode;
  /** Full-bleed processed layer, revealed right of the divider. */
  after: ReactNode;
  className?: string;
};

export function BeforeAfter({ before, after, className }: BeforeAfterProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  /* The pointer sets a target; the spring is what the eye follows. */
  const target = useMotionValue(50);
  const position = useSpring(target, CARRIAGE);

  const clip = useTransform(position, (value) => `inset(0 0 0 ${value}%)`);
  const offset = useTransform(position, (value) => `${value}%`);

  /* Keep the assistive value current without re-rendering every frame. */
  useMotionValueEvent(position, "change", (value) => {
    handleRef.current?.setAttribute("aria-valuenow", String(Math.round(value)));
  });

  function moveTo(clientX: number) {
    const frame = frameRef.current;
    if (!frame) return;
    const { left, width } = frame.getBoundingClientRect();
    const next = ((clientX - left) / width) * 100;
    target.set(Math.min(100, Math.max(0, next)));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    moveTo(event.clientX);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    moveTo(event.clientX);
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 12 : 4;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      target.set(Math.max(0, target.get() - step));
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      target.set(Math.min(100, target.get() + step));
    }
  }

  return (
    <div
      ref={frameRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      className={cn(
        // touch-none: a horizontal drag must not scroll the page away.
        "relative aspect-[16/10] touch-none select-none overflow-hidden",
        "rounded-[28px] border border-black/5 bg-neutral-100",
        className,
      )}
    >
      <div className="absolute inset-0">{before}</div>

      <motion.div style={{ clipPath: clip }} className="absolute inset-0">
        {after}
      </motion.div>

      {/* ---- Corner labels ---- */}
      <span className="absolute left-5 top-5 rounded-full bg-black/45 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white backdrop-blur-sm">
        Before
      </span>
      <span className="absolute right-5 top-5 rounded-full bg-white/75 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-ink backdrop-blur-sm">
        After
      </span>

      {/* ---- Divider + grab handle ---- */}
      <motion.div
        style={{ left: offset }}
        className="absolute inset-y-0 z-10 w-px -translate-x-1/2 bg-white/85 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
      >
        <div
          ref={handleRef}
          role="slider"
          tabIndex={0}
          aria-label="Reveal processed image"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={50}
          onKeyDown={handleKeyDown}
          className={cn(
            "absolute left-1/2 top-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2",
            "items-center justify-center rounded-full border border-black/5",
            "bg-white/90 backdrop-blur-md",
            "shadow-[0_12px_32px_-12px_rgba(0,0,0,0.45)]",
            "transition-transform duration-500 ease-out-expo",
            isDragging && "scale-95",
          )}
        >
          <MoveHorizontal className="size-4 text-ink" strokeWidth={1.6} />
        </div>
      </motion.div>
    </div>
  );
}
