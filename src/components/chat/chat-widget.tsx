"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { useLenis } from "lenis/react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUp, RotateCcw, Square, X } from "lucide-react";

import { GRAIN } from "@/components/ui/film-grain";
import { requestDemo, type DemoId } from "@/lib/demos";
import { DELIBERATE_SCROLL } from "@/lib/scroll-store";
import { EASE_OUT_EXPO, site } from "@/lib/site";
import { cn } from "@/lib/utils";

import { ChatIntro } from "./chat-intro";
import { ChatThread, type Message } from "./chat-thread";
import { Orb } from "./orb";

/** Mirrors CHAT.input.maxMessageChars on the server. */
const MAX_CHARS = 600;
const STORAGE_KEY = "gatveon-chat-v2";
/** Turns sent per request; the server reads at most 50. */
const SEND_MESSAGES = 40;
const PANEL_ID = "site-assistant";

/** A reply that points to the demo work takes the visitor there. */
const SHOWS_WORK = /\bPlatforms section\b/;
/* The panel puts itself away for the trip, so it waits until the reply has
   been read. A phone's sheet covers more, so it waits a little longer. */
const AUTO_GO_MS = 3000;
const AUTO_GO_COMPACT_MS = 3400;
/* The launcher's arrival: a 1.6s wait, then a 0.9s rise. */
const LINK_OPEN_MS = 2600;

/** The way out of a reveal: quick to start, then gone. */
const EASE_IN_EXPO = [0.7, 0, 0.84, 0] as const;
const EASE_OUT_QUINT = [0.22, 1, 0.36, 1] as const;
const EASE_IN_OUT_QUART = [0.76, 0, 0.24, 1] as const;

/* ------------------------------------------------------------------ */
/*  Environment                                                       */
/* ------------------------------------------------------------------ */

/** Phones get a full-height sheet; anything wider, a floating panel. */
const COMPACT = "(max-width: 639px)";
const subscribeCompact = (onChange: () => void) => {
  const query = window.matchMedia(COMPACT);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useCompact = () =>
  useSyncExternalStore(subscribeCompact, () => window.matchMedia(COMPACT).matches, () => false);

/**
 * Whether the launcher is over a dark section, so it can invert the way the
 * navbar does. Bands are measured once, then resolved against the scroll
 * position with arithmetic, never by reading layout while scrolling.
 */
function useOverDark(fromBottom: number) {
  const pathname = usePathname();
  const bands = useRef<{ top: number; bottom: number }[]>([]);
  const [onDark, setOnDark] = useState(false);

  const probe = useCallback(
    (scroll = window.scrollY) => {
      const line = scroll + window.innerHeight - fromBottom;
      const dark = bands.current.some((band) => band.top <= line && band.bottom > line);
      setOnDark((prev) => (prev === dark ? prev : dark));
    },
    [fromBottom],
  );

  useEffect(() => {
    const measure = () => {
      const offset = window.scrollY;
      bands.current = Array.from(document.querySelectorAll("[data-nav-dark]")).map((el) => {
        const rect = el.getBoundingClientRect();
        return { top: rect.top + offset, bottom: rect.bottom + offset };
      });
      probe();
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    document.fonts?.ready.then(measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("load", measure);
    };
  }, [probe, pathname]);

  useLenis((lenis) => probe(lenis.scroll));
  return onDark;
}

/** Sections a reply can point to. */
const SECTION_HASHES = ["#services", "#work", "#labs"];

/**
 * Which section the visitor is looking at, so the assistant never offers a
 * link to where they already are. Measured once, then resolved against the
 * scroll position, like the launcher's tint. `locate` answers on demand.
 */
function useSectionHere() {
  const pathname = usePathname();
  const bands = useRef<{ hash: string; top: number; bottom: number }[]>([]);
  const [here, setHere] = useState<string | null>(null);

  const locate = useCallback((scroll = window.scrollY) => {
    const line = scroll + window.innerHeight * 0.35;
    return bands.current.find((band) => band.top <= line && band.bottom > line)?.hash ?? null;
  }, []);

  const probe = useCallback(
    (scroll?: number) => {
      const next = locate(scroll);
      setHere((prev) => (prev === next ? prev : next));
    },
    [locate],
  );

  useEffect(() => {
    const measure = () => {
      const offset = window.scrollY;
      bands.current = SECTION_HASHES.flatMap((hash) => {
        const el = document.querySelector(hash);
        if (!el) return [];
        const rect = el.getBoundingClientRect();
        return [{ hash, top: rect.top + offset, bottom: rect.bottom + offset }];
      });
      probe();
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    document.fonts?.ready.then(measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("load", measure);
    };
  }, [probe, pathname]);

  useLenis((lenis) => probe(lenis.scroll));
  return [here, locate] as const;
}

/* ------------------------------------------------------------------ */
/*  Panel atmosphere                                                  */
/* ------------------------------------------------------------------ */

/** The site's aurora, in miniature: the same palette, drift and loop. */
const AURORA = [
  {
    box: "-left-24 -top-32 size-[340px]",
    color: "226,232,240",
    drift: "drift-slate",
  },
  {
    box: "-right-28 -top-20 size-[380px]",
    color: "199,210,254",
    drift: "drift-indigo",
  },
  {
    box: "left-6 top-36 size-[320px]",
    color: "233,213,255",
    drift: "drift-violet",
  },
];

const soft = (rgb: string) =>
  `radial-gradient(circle closest-side, rgba(${rgb},0.95) 0%, rgba(${rgb},0.7) 55%, rgba(${rgb},0.25) 82%, rgba(${rgb},0) 100%)`;

/* ------------------------------------------------------------------ */
/*  Widget                                                            */
/* ------------------------------------------------------------------ */

/**
 * The site's AI concierge. The launcher is the site's own CTA pill with a
 * living orb for its circle; opening it grows the panel out of the pill.
 *
 * Every limit lives on the server. This side keeps the conversation tidy
 * and never leaves a visitor at a dead end: a refusal arrives as a notice
 * with a direct line to the team.
 */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  /* The pill the panel grows from, measured as it opens. */
  const [origin, setOrigin] = useState({ width: 172, height: 48 });
  /* The first arrival waits for the hero; later returns are immediate. */
  const [arrived, setArrived] = useState(false);

  const motionOff = Boolean(useReducedMotion());
  const compact = useCompact();
  const onDark = useOverDark(44);
  const [here, locate] = useSectionHere();

  /* On a phone the full pill would sit over the page's own buttons, so
     past the hero it tucks away to just the orb. */
  const [pastHero, setPastHero] = useState(false);
  useLenis((instance) => {
    const past = instance.scroll > window.innerHeight * 0.5;
    setPastHero((prev) => (prev === past ? prev : past));
  });
  const tucked = compact && pastHero;
  const lenis = useLenis();
  const router = useRouter();
  const drag = useDragControls();

  const launcher = useRef<HTMLButtonElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const inflight = useRef<AbortController | null>(null);
  /* Bumped on "new conversation", so a reply still streaming for the old
     one can't land in the new. */
  const generation = useRef(0);
  /* Follow new text only while the reader is at the bottom. */
  const stick = useRef(true);

  /* ---- Open and close ---- */

  /* The conversation survives reloads within a visit, not beyond. It is
     read back on first open, and nothing is written until then. */
  const restored = useRef(false);
  const openPanel = () => {
    if (!restored.current) {
      restored.current = true;
      try {
        const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null") as Message[] | null;
        if (Array.isArray(saved)) {
          setMessages(
            saved
              .filter((message) => message.content)
              .map((message) =>
                message.goTo?.state === "pending"
                  ? { ...message, goTo: { ...message.goTo, state: "done" } }
                  : message,
              ),
          );
        }
      } catch {
        /* Storage blocked or corrupt: start fresh. */
      }
    }
    const rect = launcher.current?.getBoundingClientRect();
    if (rect) setOrigin({ width: rect.width, height: rect.height });
    stick.current = true;
    setArrived(true);
    setOpen(true);
  };

  /* Temporary: `/?chat=open` opens the panel by itself, for portfolio links.
     It waits for the launcher to land, so the panel still grows out of it. */
  const openFromLink = useEffectEvent(openPanel);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("chat") !== "open") return;
    const timer = window.setTimeout(openFromLink, LINK_OPEN_MS);
    return () => window.clearTimeout(timer);
  }, []);

  /* Focus goes back to the launcher once it is interactive again. From an
     effect, after the commit that lifts its `inert`: a frame callback could
     run before that commit when the close comes from a timer, and focusing
     an inert element does nothing. */
  const refocus = useRef(false);
  const closePanel = useCallback(() => {
    refocus.current = true;
    setOpen(false);
  }, []);

  useEffect(() => {
    if (open || !refocus.current) return;
    refocus.current = false;
    launcher.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => () => inflight.current?.abort(), []);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape") return;
      /* A demo window opened over the panel closes on its own, first. */
      if (document.querySelector(`[aria-modal="true"]:not(#${PANEL_ID})`)) return;
      closePanel();
    };
    window.addEventListener("keydown", onKey);

    /* Desktop: ready to type once the panel has grown. A phone keeps the
       keyboard down so the welcome can be read first. */
    const focus = compact
      ? undefined
      : window.setTimeout(() => input.current?.focus({ preventScroll: true }), 420);

    /* A sheet covers the page, so the page behind holds still. */
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    if (compact) {
      lenis?.stop();
      root.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(focus);
      if (compact) {
        root.style.overflow = previousOverflow;
        lenis?.start();
      }
    };
  }, [open, compact, lenis, closePanel]);

  /* ---- Conversation ---- */

  useEffect(() => {
    if (pending || !restored.current) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      /* Storage blocked: nothing to persist to. */
    }
  }, [messages, pending]);

  useEffect(() => {
    const el = scroller.current;
    /* The welcome reads from the top; only a conversation follows its end. */
    if (!el || !stick.current || messages.length === 0) return;
    el.scrollTo({ top: el.scrollHeight, behavior: pending || motionOff ? "auto" : "smooth" });
  }, [messages, open, pending, motionOff]);

  /*
   * Phones: keep the sheet above the on-screen keyboard. Browsers now lay
   * the keyboard over the page instead of shrinking it, which would bury
   * the composer; the visual viewport says how much of the screen it takes.
   */
  useEffect(() => {
    const viewport = window.visualViewport;
    const sheet = shell.current;
    if (!open || !compact || !viewport || !sheet) return;

    const sync = () => {
      const covered = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      sheet.style.setProperty("--keyboard", `${Math.round(covered)}px`);
    };
    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
    };
  }, [open, compact]);

  const onScroll = () => {
    const el = scroller.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  /* The composer grows with its text, up to five lines. */
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [draft, open]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim().slice(0, MAX_CHARS);
      if (!content || pending) return;

      /* Talking on means staying put: a trip still counting down is called
         off, rather than firing once the next reply lands. */
      const history = [
        ...messages.map((message) =>
          message.goTo?.state === "pending"
            ? { ...message, goTo: { ...message.goTo, state: "stayed" as const } }
            : message,
        ),
        { role: "user" as const, content },
      ];
      setMessages([...history, { role: "assistant", content: "" }]);
      setDraft("");
      setPending(true);
      stick.current = true;

      const controller = new AbortController();
      inflight.current = controller;
      const conversation = generation.current;

      const write = (update: (current: Message) => Message) => {
        if (generation.current !== conversation) return;
        setMessages((all) => [...all.slice(0, -1), update(all[all.length - 1])]);
      };

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history
              .filter((message) => !message.notice && message.content)
              /* Enough for the server to vary its answers; it trims further for the model. */
              .slice(-SEND_MESSAGES)
              .map(({ role, content: body }) => ({ role, content: body })),
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const data = (await response.json().catch(() => null)) as { notice?: string } | null;
          write(() => ({
            role: "assistant",
            notice: true,
            content: data?.notice ?? `Something went wrong. Please email us at ${site.contact.email}.`,
          }));
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let received = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          received += chunk;
          write((current) => ({ ...current, content: current.content + chunk }));
        }

        if (SHOWS_WORK.test(received)) {
          /* Already looking at the demos: nothing to travel, so the reply
             offers them straight away instead of a trip that goes nowhere. */
          const there = locate() === "#work";
          write((current) => ({
            ...current,
            goTo: { hash: "#work", state: there ? "done" : "pending" },
          }));
        }
      } catch {
        if (!controller.signal.aborted) {
          write(() => ({
            role: "assistant",
            notice: true,
            content: `Connection lost. Please try again, or email us at ${site.contact.email}.`,
          }));
        }
      } finally {
        if (generation.current === conversation) {
          /* Drop an empty reply left by a stop or a silent stream. */
          setMessages((all) => {
            const last = all[all.length - 1];
            return last?.role === "assistant" && !last.content.trim() ? all.slice(0, -1) : all;
          });
          setPending(false);
          inflight.current = null;
        }
      }
    },
    [messages, pending, locate],
  );

  const stop = () => inflight.current?.abort();

  /* A starter sends at once, and leaves the cursor ready for the follow-up. */
  const pick = (prompt: string) => {
    void send(prompt);
    if (!compact) input.current?.focus({ preventScroll: true });
  };

  const reset = () => {
    generation.current += 1;
    inflight.current?.abort();
    inflight.current = null;
    setMessages([]);
    setDraft("");
    setPending(false);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Storage blocked: nothing to clear. */
    }
    if (!compact) input.current?.focus({ preventScroll: true });
  };

  /* A reply that names a section takes the visitor there. */
  /* A sheet always steps aside; the desktop panel does when the trip is the
     assistant's own (`close`), so the work it points to is seen whole. */
  const goToSection = useCallback(
    (hash: string, close = false) => {
      /* Through closePanel, so focus returns to the launcher rather than
         dropping to the page when the panel goes. */
      if (compact || close) closePanel();
      const target = document.querySelector<HTMLElement>(hash);
      if (!target) {
        router.push(`/${hash}`);
        return;
      }
      window.setTimeout(
        () => {
          /* Ours, not a gesture: the intro snap must not redirect it. */
          window.dispatchEvent(new Event(DELIBERATE_SCROLL));
          if (lenis) lenis.scrollTo(target, { duration: 1.6, force: true });
          else target.scrollIntoView({ behavior: "smooth" });
        },
        compact ? 380 : 0,
      );
    },
    [compact, lenis, router, closePanel],
  );

  /* Run a pending trip once its countdown has been seen. */
  useEffect(() => {
    if (pending) return;
    const index = messages.findIndex((message) => message.goTo?.state === "pending");
    if (index < 0) return;
    const { hash } = messages[index].goTo!;

    const timer = window.setTimeout(
      () => {
        setMessages((all) =>
          all.map((message, i) =>
            i === index && message.goTo
              ? { ...message, goTo: { ...message.goTo, state: "done" } }
              : message,
          ),
        );
        goToSection(hash, true);
      },
      compact ? AUTO_GO_COMPACT_MS : AUTO_GO_MS,
    );
    return () => window.clearTimeout(timer);
  }, [messages, pending, compact, goToSection]);

  /* Opens a demo's live window. On a phone the sheet steps aside first. */
  const openDemo = useCallback(
    (id: DemoId) => {
      const show = () => {
        /* Not on a page that hosts the demos: go to the one that does. */
        if (!requestDemo(id)) router.push("/#work");
      };
      if (!compact) {
        show();
        return;
      }
      closePanel();
      window.setTimeout(show, 380);
    },
    [compact, router, closePanel],
  );

  const stay = (index: number) =>
    setMessages((all) =>
      all.map((message, i) =>
        i === index && message.goTo
          ? { ...message, goTo: { ...message.goTo, state: "stayed" } }
          : message,
      ),
    );

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send(draft);
    }
  };

  /* A sheet can be pulled down to close, from its header. */
  const startDrag = (event: PointerEvent) => {
    if ((event.target as HTMLElement).closest("button")) return;
    drag.start(event);
  };

  /* ---- Choreography ---- */

  /*
   * Out of the pill: the panel is clipped to the launcher's exact shape and
   * opens from there. One number drives it — --reveal, 0 folded and 1 open —
   * and CSS derives the inset and corner radius from it and the measured
   * pill, so the shape stays exact at any panel height.
   */
  const morph = !motionOff && !compact;
  const clip = morph
    ? ({
        "--pill-w": `${origin.width}px`,
        "--pill-h": `${origin.height}px`,
        clipPath:
          "inset(calc((100% - var(--pill-h)) * (1 - var(--reveal))) 0px 0px calc((100% - var(--pill-w)) * (1 - var(--reveal))) round calc(var(--pill-h) / 2 + (28px - var(--pill-h) / 2) * var(--reveal)))",
      } as CSSProperties)
    : undefined;

  const surface: Variants = motionOff
    ? {
        closed: { opacity: 0, transition: { duration: 0.2 } },
        open: { opacity: 1, transition: { duration: 0.25 } },
      }
    : compact
      ? {
          closed: { y: "100%", transition: { duration: 0.45, ease: EASE_IN_EXPO } },
          open: { y: "0%", transition: { duration: 0.7, ease: EASE_OUT_EXPO } },
        }
      : {
          /* Back into the pill: the glass visibly folds down to the
             launcher, and only fades as the launcher returns over it. */
          closed: {
            "--reveal": 0,
            opacity: 0,
            transition: {
              "--reveal": { duration: 0.46, ease: EASE_IN_OUT_QUART },
              opacity: { duration: 0.12, delay: 0.34 },
            },
          },
          open: {
            "--reveal": 1,
            opacity: 1,
            transition: {
              /* Softer than expo, so the growth out of the pill reads. */
              "--reveal": { duration: 0.9, ease: EASE_OUT_QUINT },
              opacity: { duration: 0.12 },
            },
          },
        };

  /* Chrome settles in after the surface, and leaves before it. */
  const rise = (delay: number) => ({
    closed: { opacity: 0, y: motionOff ? 0 : 10, transition: { duration: 0.18 } },
    open: {
      opacity: 1,
      y: 0,
      transition: { duration: motionOff ? 0 : 0.8, delay: motionOff ? 0 : delay, ease: EASE_OUT_EXPO },
    },
  });

  const nearLimit = draft.length > MAX_CHARS * 0.8;
  const canSend = draft.trim().length > 0;

  return (
    <>
      {/* ---- Launcher: the site's CTA pill, with a living orb for its circle ---- */}
      <motion.div
        inert={open}
        className="fixed bottom-5 right-5 z-50 sm:bottom-6 sm:right-6"
        /* The start state is the same on the server and the client; reduced
           motion only changes the transition, which never reaches the HTML,
           so hydration matches. */
        initial={{ opacity: 0, y: 28 }}
        animate={
          open
            ? { opacity: 0, scale: 0.94, transition: { duration: 0.2 } }
            : {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                  default: {
                    duration: motionOff ? 0.2 : 0.9,
                    delay: arrived ? 0.32 : 1.6,
                    ease: EASE_OUT_EXPO,
                  },
                  /* Reduced motion: it fades in place, without the rise. */
                  y: motionOff
                    ? { duration: 0 }
                    : { duration: 0.9, delay: arrived ? 0.32 : 1.6, ease: EASE_OUT_EXPO },
                },
              }
        }
      >
        <motion.button
          ref={launcher}
          type="button"
          onClick={openPanel}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={PANEL_ID}
          initial={false}
          animate={{ paddingLeft: tucked ? 6 : 20 }}
          whileHover={motionOff ? undefined : { y: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          className={cn(
            "group relative flex items-center rounded-full py-1.5 pr-1.5 text-[13.5px] font-medium tracking-[-0.01em]",
            "outline-none transition-[background-color,color,box-shadow] duration-700 ease-out-expo",
            "focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2",
            onDark
              ? "bg-white text-headline shadow-[0_14px_44px_-12px_rgba(165,180,252,0.45)]"
              : "bg-headline text-white shadow-[0_16px_40px_-14px_rgba(11,11,15,0.6),0_3px_8px_-2px_rgba(11,11,15,0.25)]",
          )}
        >
          {/* Light catching the top edge, as on the demo windows. */}
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent transition-opacity duration-700",
              onDark && "opacity-0",
            )}
          />

          {/* The label rolls over on hover, and folds away when tucked
              (still read out: it stays in the accessible name). */}
          <motion.span
            className="relative block overflow-hidden whitespace-nowrap leading-[1.3]"
            initial={false}
            animate={{
              width: tucked ? 0 : "auto",
              marginRight: tucked ? 0 : 12,
              opacity: tucked ? 0 : 1,
            }}
            transition={{ duration: motionOff ? 0 : 0.6, ease: EASE_OUT_EXPO }}
          >
            <span className="block transition-transform duration-500 ease-out-expo group-hover:-translate-y-full">
              Ask {site.name}
            </span>
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-full block transition-transform duration-500 ease-out-expo group-hover:-translate-y-full"
            >
              Ask {site.name}
            </span>
          </motion.span>

          <span className="relative flex size-9 items-center justify-center">
            {!arrived && <span aria-hidden="true" className="chat-ping" />}
            <Orb
              size={36}
              className="transition-transform duration-700 ease-out-expo group-hover:scale-110 group-hover:rotate-12"
            />
          </span>
        </motion.button>
      </motion.div>

      {/* ---- Panel ---- */}
      <AnimatePresence>
        {open && compact && (
          <motion.div
            key="scrim"
            aria-hidden="true"
            onClick={closePanel}
            className="fixed inset-0 z-50 bg-[rgba(11,11,15,0.32)] backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}

        {open && (
          <motion.div
            key="panel"
            ref={shell}
            className={cn(
              "fixed z-50",
              compact
                ? "inset-x-0 bottom-[var(--keyboard,0px)] top-[max(0.75rem,env(safe-area-inset-top))]"
                : "bottom-6 right-6 h-[min(700px,calc(100svh-3rem))] w-[420px]",
            )}
            initial="closed"
            animate="open"
            exit="closed"
            drag={compact && !motionOff ? "y" : false}
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) closePanel();
            }}
          >
            {/* Depth, kept outside the clip so the shadow isn't cut off with it. */}
            {!compact && (
              <motion.div
                aria-hidden="true"
                className="absolute inset-0 rounded-[28px] shadow-[0_2px_8px_rgba(11,11,15,0.06),0_30px_70px_-24px_rgba(11,11,15,0.32),0_80px_160px_-60px_rgba(11,11,15,0.45)]"
                variants={{
                  closed: { opacity: 0, transition: { duration: 0.15 } },
                  open: { opacity: 1, transition: { duration: 0.6, delay: motionOff ? 0 : 0.3 } },
                }}
              />
            )}

            <motion.section
              id={PANEL_ID}
              role="dialog"
              aria-modal={compact || undefined}
              aria-labelledby={`${PANEL_ID}-title`}
              variants={surface}
              style={clip}
              className={cn(
                "relative flex h-full flex-col overflow-hidden font-sans text-ink",
                "bg-[#f8f8fa]/[0.88] backdrop-blur-2xl backdrop-saturate-150",
                "ring-1 ring-inset ring-black/[0.07]",
                compact ? "rounded-t-[28px]" : "rounded-[28px]",
              )}
            >
              {/* ---- Atmosphere: aurora, light on the top edge, grain ---- */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden"
                style={{
                  maskImage: "linear-gradient(to bottom, #000 0%, #000 40%, transparent 85%)",
                  WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 40%, transparent 85%)",
                }}
              >
                {AURORA.map((blob) => (
                  <div
                    key={blob.drift}
                    className={cn("ambient absolute rounded-full will-change-transform", blob.box)}
                    style={{
                      backgroundImage: soft(blob.color),
                      animationName: blob.drift,
                      animationDuration: "20s",
                    }}
                  />
                ))}
              </div>
              <span aria-hidden="true" className="pointer-events-none absolute inset-x-6 top-0 h-px bg-white" />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.04]"
                style={{ backgroundImage: GRAIN, backgroundRepeat: "repeat" }}
              />

              {/* ---- Header ---- */}
              <motion.header
                variants={rise(0.18)}
                onPointerDown={compact ? startDrag : undefined}
                className={cn(
                  "relative flex h-16 shrink-0 items-center gap-3 pl-5 pr-3 squat:h-14",
                  compact && "touch-none",
                )}
              >
                {compact && (
                  <span
                    aria-hidden="true"
                    className="absolute left-1/2 top-2 h-1 w-9 -translate-x-1/2 rounded-full bg-black/15"
                  />
                )}

                <Orb size={30} thinking={pending} />
                <div className="min-w-0 flex-1">
                  <p
                    id={`${PANEL_ID}-title`}
                    className="text-[14px] font-semibold leading-tight tracking-[-0.015em] text-headline"
                  >
                    {site.name}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 whitespace-nowrap text-[11.5px] leading-tight text-ink-muted">
                    <span className="relative flex size-1.5">
                      <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70 motion-reduce:hidden" />
                      <span className="relative size-1.5 rounded-full bg-emerald-500" />
                    </span>
                    {pending ? (
                      "Replying…"
                    ) : (
                      <span className="min-w-0 truncate">
                        Online
                        {/* Dropped on the narrowest phones rather than wrapped. */}
                        <span className="max-[359px]:hidden"> · replies in seconds</span>
                      </span>
                    )}
                  </p>
                </div>

                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={reset}
                    aria-label="New conversation"
                    title="New conversation"
                    className="flex size-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-black/[0.05] hover:text-headline pointer-coarse:size-11"
                  >
                    <RotateCcw className="size-[15px]" strokeWidth={1.9} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={closePanel}
                  aria-label="Close assistant"
                  className="flex size-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-black/[0.05] hover:text-headline pointer-coarse:size-11"
                >
                  <X className="size-4" strokeWidth={1.9} />
                </button>

                <motion.span
                  aria-hidden="true"
                  className="absolute inset-x-5 bottom-0 h-px origin-left bg-black/[0.07]"
                  variants={{
                    closed: { scaleX: 0, transition: { duration: 0.15 } },
                    open: {
                      scaleX: 1,
                      transition: { duration: motionOff ? 0 : 1, delay: motionOff ? 0 : 0.3, ease: EASE_OUT_EXPO },
                    },
                  }}
                />
              </motion.header>

              {/* ---- Conversation ---- */}
              {/* data-lenis-prevent: wheel and touch scroll this, not the page. */}
              <motion.div
                ref={scroller}
                onScroll={onScroll}
                data-lenis-prevent=""
                variants={{
                  closed: { opacity: 0, transition: { duration: 0.18 } },
                  open: { opacity: 1, transition: { duration: 0.5, delay: motionOff ? 0 : 0.1 } },
                }}
                className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-5"
                style={{
                  maskImage:
                    "linear-gradient(to bottom, transparent 0, #000 18px, #000 calc(100% - 18px), transparent 100%)",
                  WebkitMaskImage:
                    "linear-gradient(to bottom, transparent 0, #000 18px, #000 calc(100% - 18px), transparent 100%)",
                }}
              >
                <AnimatePresence mode="wait">
                  {messages.length === 0 ? (
                    <ChatIntro key="intro" onPick={pick} />
                  ) : (
                    <ChatThread
                      key="thread"
                      messages={messages}
                      pending={pending}
                      here={here}
                      onSection={goToSection}
                      onOpenDemo={openDemo}
                      onStay={stay}
                      autoGoMs={compact ? AUTO_GO_COMPACT_MS : AUTO_GO_MS}
                    />
                  )}
                </AnimatePresence>
              </motion.div>

              {/* ---- Composer ---- */}
              <motion.form
                variants={rise(0.32)}
                onSubmit={(event) => {
                  event.preventDefault();
                  void send(draft);
                }}
                className="relative shrink-0 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
              >
                <div className="group relative">
                  {/* An aurora rim that warms up while typing. */}
                  <div
                    aria-hidden="true"
                    className="absolute -inset-[3px] rounded-[25px] bg-[linear-gradient(120deg,#c7d2fe,#f5d0fe,#bae6fd,#c7d2fe)] opacity-0 blur-[6px] transition-opacity duration-500 group-focus-within:opacity-100"
                  />
                  <div className="relative flex items-end gap-2 rounded-[22px] bg-white p-1.5 pl-4 ring-1 ring-black/[0.07] shadow-[0_1px_2px_rgba(11,11,15,0.04),0_12px_32px_-16px_rgba(11,11,15,0.28)] transition-shadow duration-500 group-focus-within:ring-black/[0.1]">
                    <textarea
                      ref={input}
                      rows={1}
                      value={draft}
                      maxLength={MAX_CHARS}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={onKeyDown}
                      placeholder="Tell us what you're building…"
                      aria-label="Message"
                      className="max-h-[132px] min-h-[38px] flex-1 resize-none bg-transparent py-[9px] text-[14px] leading-[1.45] text-ink outline-none placeholder:text-ink-muted"
                    />

                    {pending ? (
                      <button
                        type="button"
                        onClick={stop}
                        aria-label="Stop the reply"
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-headline text-white transition-transform active:scale-95 pointer-coarse:size-10"
                      >
                        <Square className="size-3 fill-current" />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={!canSend}
                        aria-label="Send"
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-full transition-all duration-300 active:scale-95 pointer-coarse:size-10",
                          canSend ? "bg-headline text-white" : "bg-black/[0.06] text-black/30",
                        )}
                      >
                        <ArrowUp className="size-4" strokeWidth={2.2} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-3 px-2 text-[11px] text-ink-muted squat:hidden">
                  <span className="truncate">
                    Prefer a person?{" "}
                    <a
                      href={site.contact.whatsapp.start}
                      target="_blank"
                      rel="noreferrer"
                      className="-my-1 inline-block py-1 text-ink-soft underline decoration-black/15 underline-offset-2 transition-colors hover:text-headline hover:decoration-black/50 pointer-coarse:-my-2.5 pointer-coarse:py-2.5"
                    >
                      WhatsApp
                    </a>{" "}
                    or{" "}
                    <a
                      href={`mailto:${site.contact.email}`}
                      className="-my-1 inline-block py-1 text-ink-soft underline decoration-black/15 underline-offset-2 transition-colors hover:text-headline hover:decoration-black/50 pointer-coarse:-my-2.5 pointer-coarse:py-2.5"
                    >
                      {site.contact.email}
                    </a>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {nearLimit ? `${draft.length}/${MAX_CHARS}` : compact ? null : "↵ to send"}
                  </span>
                </div>
              </motion.form>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
