"use client";

import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useSpring,
  type MotionProps,
  type MotionStyle,
} from "framer-motion";
import { ArrowUpRight, Mail, X } from "lucide-react";

import { EASE_OUT_EXPO, site } from "@/lib/site";
import { cn } from "@/lib/utils";

/** WhatsApp's own mark (Simple Icons), so the option reads at a glance. */
function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

const CHANNELS = [
  {
    id: "email",
    label: "Email",
    detail: site.contact.email,
    href: `mailto:${site.contact.email}`,
    Icon: Mail,
    external: false,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    detail: site.contact.whatsapp.display,
    href: site.contact.whatsapp.start,
    Icon: WhatsAppGlyph,
    external: true,
  },
] as const;

type ChannelId = (typeof CHANNELS)[number]["id"];

/** The pill's change of shape: a soft spring, so it settles rather than stops. */
const MORPH = { type: "spring", bounce: 0.2, duration: 0.75 } as const;
const FADE = { duration: 0.5, ease: EASE_OUT_EXPO } as const;
const STILL = { duration: 0 } as const;

/**
 * The footer's one ask. Closed, it is a single pill. Pressed, the same pill
 * widens in place into the two ways to reach the studio, so nothing covers
 * the wordmark and the visitor never loses sight of what they pressed.
 *
 * `style` and the arrival props come from the footer, which owns the
 * parallax and the fade-in. The root keeps `relative z-[3]` so the control
 * sits in front of the clouds.
 */
export function StartProject({ style, ...arrival }: { style?: MotionStyle } & MotionProps) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ChannelId | null>(null);
  const [choicesWidth, setChoicesWidth] = useState<number>();

  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const choices = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // The open width is whatever the choices need, measured rather than
  // guessed, so it holds across fonts and screen sizes.
  useEffect(() => {
    const el = choices.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setChoicesWidth(el.offsetWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const close = (refocus = false) => {
    setOpen(false);
    setActive(null);
    if (refocus) trigger.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    choices.current?.querySelector("a")?.focus({ preventScroll: true });

    const away = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  // Magnetic pull toward the cursor while closed: small, springy, mouse only.
  const pullX = useSpring(0, { stiffness: 220, damping: 18, mass: 0.6 });
  const pullY = useSpring(0, { stiffness: 220, damping: 18, mass: 0.6 });
  const pull = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (reduce || open || event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    pullX.set((event.clientX - (box.left + box.width / 2)) * 0.16);
    pullY.set((event.clientY - (box.top + box.height / 2)) * 0.3);
  };
  const release = () => {
    pullX.set(0);
    pullY.set(0);
  };

  const detail = CHANNELS.find((channel) => channel.id === active)?.detail;

  return (
    <motion.div
      ref={root}
      style={style}
      {...arrival}
      className="relative z-[3] flex flex-col items-center gap-5"
    >
      <motion.div
        onPointerMove={pull}
        onPointerLeave={release}
        style={{ x: pullX, y: pullY }}
        initial={false}
        animate={{ width: open && choicesWidth ? choicesWidth : "auto" }}
        transition={reduce ? STILL : MORPH}
        className="relative h-[60px] overflow-hidden rounded-full bg-headline shadow-[0_22px_44px_-20px_rgba(11,11,15,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] md:h-16"
      >
        {/* ---- Closed: the ask ---- */}
        <motion.button
          ref={trigger}
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          inert={open}
          onClick={() => {
            release();
            setOpen(true);
          }}
          initial={false}
          animate={
            open
              ? { opacity: 0, scale: 0.9, filter: "blur(6px)" }
              : { opacity: 1, scale: 1, filter: "blur(0px)" }
          }
          transition={reduce ? STILL : { ...FADE, delay: open ? 0 : 0.18 }}
          className="group/cta relative flex h-full items-center gap-4 whitespace-nowrap rounded-full pl-8 pr-2 text-[15px] font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-white/50 md:pr-2 md:text-base"
        >
          {/* A sweep of light across the pill on hover. It travels only one
              way: leaving snaps it back while it is out of sight. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -translate-x-full -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-0 ease-out-expo group-hover/cta:translate-x-[400%] group-hover/cta:duration-[1400ms]"
          />
          <span className="relative">{site.contact.cta}</span>
          {/* The arrow leaves top-right and a fresh one arrives from below. */}
          <span className="relative flex size-11 items-center justify-center overflow-hidden rounded-full bg-white text-headline md:size-12">
            <ArrowUpRight
              className="size-[18px] transition-transform duration-500 ease-out-expo group-hover/cta:-translate-y-[190%] group-hover/cta:translate-x-[190%]"
              strokeWidth={1.8}
            />
            <ArrowUpRight
              aria-hidden="true"
              className="absolute size-[18px] -translate-x-[190%] translate-y-[190%] transition-transform duration-500 ease-out-expo group-hover/cta:translate-x-0 group-hover/cta:translate-y-0 group-hover/cta:delay-75"
              strokeWidth={1.8}
            />
          </span>
        </motion.button>

        {/* ---- Open: the two ways in ----
             Always mounted (and measured); inert and invisible while closed. */}
        <div
          ref={choices}
          id={menuId}
          role="group"
          aria-label="Ways to reach us"
          inert={!open}
          onPointerLeave={() => setActive(null)}
          className="absolute left-1/2 top-0 flex h-full w-max -translate-x-1/2 items-center gap-1 p-1.5"
        >
          {CHANNELS.map(({ id, label, href, Icon, external }, i) => (
            <motion.a
              key={id}
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noreferrer" : undefined}
              onPointerEnter={() => setActive(id)}
              onFocus={() => setActive(id)}
              onClick={() => window.setTimeout(() => close(), 350)}
              initial={false}
              animate={
                open
                  ? { opacity: 1, y: 0, filter: "blur(0px)" }
                  : { opacity: 0, y: 12, filter: "blur(6px)" }
              }
              transition={reduce ? STILL : { ...FADE, delay: open ? 0.14 + i * 0.07 : 0 }}
              className={cn(
                "relative flex h-full items-center gap-2.5 rounded-full px-5 text-[15px] font-medium outline-none transition-colors duration-300 md:px-6 md:text-base",
                active === id ? "text-headline" : "text-white/80",
              )}
            >
              {/* One white highlight, sliding to whichever option is in reach. */}
              {active === id && (
                <motion.span
                  layoutId={`${menuId}-highlight`}
                  transition={reduce ? STILL : { type: "spring", bounce: 0.18, duration: 0.5 }}
                  className="absolute inset-0 rounded-full bg-white"
                />
              )}
              <Icon className="relative size-[18px]" />
              <span className="relative">{label}</span>
            </motion.a>
          ))}

          <motion.button
            type="button"
            aria-label="Close"
            onClick={() => close(true)}
            initial={false}
            animate={open ? { opacity: 1, rotate: 0, scale: 1 } : { opacity: 0, rotate: -90, scale: 0.6 }}
            transition={reduce ? STILL : { ...FADE, delay: open ? 0.26 : 0 }}
            className="relative ml-0.5 flex aspect-square h-full items-center justify-center rounded-full bg-white/10 text-white outline-none transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <X className="size-[18px]" strokeWidth={1.8} />
          </motion.button>
        </div>
      </motion.div>

      {/* ---- Detail line ----
           While an option is in reach, shows exactly where it leads. The
           height is held when empty, so the pill never shifts. */}
      <div className="relative h-5 text-[13px] text-ink-soft">
        <AnimatePresence mode="wait" initial={false}>
          {detail && (
            <motion.p
              key={detail}
              initial={reduce ? false : { opacity: 0, y: 6, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={reduce ? undefined : { opacity: 0, y: -6, filter: "blur(4px)" }}
              transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
              className="whitespace-nowrap"
            >
              {detail}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
