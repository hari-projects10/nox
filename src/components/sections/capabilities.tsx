"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "framer-motion";
import { ChevronRight } from "lucide-react";

import { EASE_OUT_EXPO } from "@/lib/site";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Static data                                                       */
/* ------------------------------------------------------------------ */

type Capability = {
  id: string;
  heading: string;
  content: string;
  video_keyword: string;
  /** Local clip, sourced against video_keyword. */
  video: string;
};

const capabilities: Capability[] = [
  {
    id: "ai-systems",
    heading: "Foundational AI",
    content:
      "Custom intelligence models trained on your proprietary data. We build the neural infrastructure that powers proactive decision-making and predictive analytics.",
    video_keyword: "abstract-neural-network-white",
    video: "/videos/ai%20systems.mp4",
  },
  {
    id: "agents",
    heading: "Autonomous Agents",
    content:
      "Reasoning engines that execute complex workflows. Moving beyond reactive chatbots to intelligent systems that act, adapt, and operate independently.",
    video_keyword: "kinetic-particles-bright",
    video: "/videos/agents.mp4",
  },
  {
    id: "ai-web",
    heading: "Cognitive Interfaces",
    content:
      "Web architectures that adapt in real-time. We bridge Large Language Models with hyper-reactive frontends to create context-aware, highly personalized user experiences.",
    video_keyword: "clean-code-projection",
    video: "/videos/ai%20web.mp4",
  },
  {
    id: "enterprise",
    heading: "Enterprise Infrastructure",
    content:
      "High-concurrency systems built for global scale. Secure, modular architectures engineered for zero downtime and seamless third-party integration.",
    video_keyword: "server-rack-minimal-white",
    video: "/videos/enterprise.mp4",
  },
  {
    id: "mobile",
    heading: "Native Ecosystems",
    content:
      "High-performance mobile environments. Fluid interactions and edge-computed features delivered natively to iOS and Android with zero latency.",
    video_keyword: "glass-mobile-wireframe",
    video: "/videos/mobile.mp4",
  },
];

/** How long each capability holds the stage, in seconds. */
const SLIDE_DURATION = 4;

/** The wipe between clips. */
const WIPE_DURATION = 1.2;
const WIPE_EASE = [0.76, 0, 0.24, 1] as const;

/** First sentence becomes the headline's tagline; the rest is the caption. */
function splitContent(content: string) {
  const end = content.indexOf(". ") + 1;
  return { lead: content.slice(0, end), body: content.slice(end).trim() };
}

/* ------------------------------------------------------------------ */
/*  Section                                                           */
/* ------------------------------------------------------------------ */

export function Capabilities() {
  const [{ activeIndex, previousIndex }, setSlide] = useState({
    activeIndex: 0,
    previousIndex: -1,
  });
  const prefersReducedMotion = useReducedMotion();
  const motionOff = Boolean(prefersReducedMotion);

  /* The hero's clip is above the fold and these are not, so they wait for
     the page to finish loading before claiming any bandwidth. Buffering all
     of them from the first byte left the hero with nothing to stream. */
  const [warm, setWarm] = useState(false);

  useEffect(() => {
    if (document.readyState === "complete") {
      setWarm(true);
      return;
    }
    const onLoad = () => setWarm(true);
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  const stage = useRef<HTMLDivElement>(null);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const isInView = useInView(stage, { amount: 0.2 });

  const active = capabilities[activeIndex];
  const { lead, body } = splitContent(active.content);

  /* Advance after a fixed hold. Paused while off-screen. */
  useEffect(() => {
    if (!isInView) return;
    const timer = window.setTimeout(
      () =>
        setSlide(({ activeIndex: i }) => ({
          activeIndex: (i + 1) % capabilities.length,
          previousIndex: i,
        })),
      SLIDE_DURATION * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [activeIndex, isInView]);

  /* Decode at most two clips, and only during a wipe: the incoming one
     starts from its first frame, the outgoing one stops once covered.
     Nothing decodes while the section is off-screen. */
  useEffect(() => {
    const all = videos.current;
    const incoming = all[activeIndex];
    if (!isInView) {
      all.forEach((video) => video?.pause());
      return;
    }
    if (incoming && incoming.paused) {
      incoming.currentTime = 0;
      if (!motionOff) incoming.play().catch(() => {});
    }
    const settle = window.setTimeout(() => {
      all.forEach((video, i) => {
        if (video && i !== activeIndex) video.pause();
      });
    }, WIPE_DURATION * 1000 + 100);
    return () => window.clearTimeout(settle);
  }, [activeIndex, isInView, motionOff]);

  return (
    <section id="services" className="relative">
      {/* ---- Section label ---- */}
      {/* Same container as the stage, so the label lines up with it */}
      <header className="mx-auto w-full max-w-[1600px] px-6 pb-6 pt-10 md:px-12 md:pb-8 md:pt-12">
        <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-headline">
          Services
        </span>
      </header>

      {/* ---- Full-screen stage ---- */}
      <div
        ref={stage}
        id="services-stage"
        aria-roledescription="carousel"
        aria-label="Capabilities"
        /* Tells the transparent header to invert while it is under the bar. */
        data-nav-dark=""
        className="relative isolate h-svh min-h-[640px] overflow-hidden bg-[#06070a] text-white"
      >
        {/* Video: every clip stays mounted (no re-fetch or decoder spin-up
            on change). The incoming clip wipes in from the right using a
            translate / counter-translate pair — transform only, so the
            wipe runs on the compositor instead of repainting each frame. */}
        <div aria-hidden="true" className="absolute inset-0 -z-20 isolate overflow-hidden">
          {capabilities.map((item, i) => {
            const role =
              i === activeIndex ? "active" : i === previousIndex ? "previous" : "idle";
            const wipe = {
              duration: motionOff || role === "idle" ? 0 : WIPE_DURATION,
              ease: WIPE_EASE,
            };
            return (
              <motion.div
                key={item.id}
                className="absolute inset-0 overflow-hidden will-change-transform"
                style={{ zIndex: role === "active" ? 2 : role === "previous" ? 1 : 0 }}
                initial={false}
                animate={{ x: role === "idle" ? "100%" : "0%" }}
                transition={wipe}
              >
                <motion.video
                  ref={(el) => {
                    videos.current[i] = el;
                  }}
                  src={item.video}
                  muted
                  loop
                  playsInline
                  /* Buffer the showing clip and the one queued next only,
                     and only once the page above has finished loading. */
                  preload={
                    warm &&
                    (i === activeIndex || i === (activeIndex + 1) % capabilities.length)
                      ? "auto"
                      : "metadata"
                  }
                  className="h-full w-full object-cover will-change-transform"
                  initial={false}
                  animate={{
                    x:
                      role === "idle"
                        ? "-100%"
                        : role === "previous" && !motionOff
                          ? "-18%"
                          : "0%",
                  }}
                  transition={wipe}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Scrims: overall dim, plus weight behind the headline and the base */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[#05060a]/50" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,6,10,0.7)_0%,rgba(5,6,10,0.2)_55%,transparent_100%),linear-gradient(0deg,rgba(5,6,10,0.75)_0%,transparent_32%)]"
        />

        <div className="relative mx-auto h-full w-full max-w-[1600px] px-6 md:px-12">
          <div className="relative h-full">
            {/* Architectural hairlines */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              {[0, 1 / 6, 1 / 2, 5 / 6, 1].map((at, i) => (
                <span
                  key={at}
                  className={cn(
                    "absolute inset-y-0 w-px bg-white/[0.12]",
                    (i === 1 || i === 3) && "hidden md:block",
                  )}
                  style={{ left: `${at * 100}%` }}
                />
              ))}
            </div>

            {/* Headline */}
            <div className="absolute inset-x-0 top-1/2 max-h-full -translate-y-1/2 overflow-y-auto py-4 md:overflow-visible md:py-0">
              <div aria-live="polite">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={active.id} className="font-serif font-normal">
                    {[`${active.heading}:`, lead].map((line, i) => (
                      <span
                        key={line}
                        className={cn(
                          "block overflow-hidden pb-[0.1em]",
                          i === 0
                            ? /* Heading: one fixed size (7xl scale), kept to one line from md up */
                              "text-[clamp(2.25rem,4.6vw,4.5rem)] leading-[1.05] tracking-[-0.01em] md:whitespace-nowrap"
                            : /* Tagline: two steps down the scale (5xl) */
                              "mt-3 max-w-[28ch] text-[clamp(1.5rem,2.9vw,3rem)] leading-[1.15] text-white/85 md:mt-4",
                        )}
                      >
                        <motion.span
                          role={i === 0 ? "heading" : undefined}
                          aria-level={i === 0 ? 3 : undefined}
                          className="block"
                          initial={{ y: "110%" }}
                          animate={{ y: 0 }}
                          exit={{
                            y: "-110%",
                            transition: { duration: motionOff ? 0 : 0.5, ease: [0.7, 0, 0.84, 0] },
                          }}
                          transition={{
                            duration: motionOff ? 0 : 1,
                            delay: motionOff ? 0 : 0.35 + i * 0.1,
                            ease: EASE_OUT_EXPO,
                          }}
                        >
                          {line}
                        </motion.span>
                      </span>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Phones: caption joins the flow instead of floating */}
              <p className="mt-6 max-w-sm border-l-[3px] border-white pl-4 text-sm leading-relaxed text-white/80 md:hidden">
                {body}
              </p>

              {/* Discover — one grid column wide on desktop */}
              <a
                href="#work"
                className="group mt-8 flex h-11 w-full max-w-[15rem] items-stretch bg-[#111317]/95 md:mt-10 md:w-[calc(100%/6+1px)] md:max-w-none"
              >
                <span className="flex flex-1 items-center border-l-[3px] border-white pl-5 text-[15px] tracking-wide">
                  Discover
                </span>
                <span className="flex w-11 items-center justify-center bg-white text-black">
                  <ChevronRight className="h-4 w-4 transition-transform duration-500 group-hover:translate-x-0.5" />
                </span>
              </a>
            </div>

            {/* Caption: rest of the copy, in the last grid column */}
            <div className="absolute bottom-[16%] right-0 hidden w-[calc(100%/6)] min-w-[17rem] md:block">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={active.id}
                  className="border-l-[3px] border-white bg-[#111317]/90 px-4 py-3 text-[13px] leading-relaxed text-white/85"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.8, delay: motionOff ? 0 : 0.6, ease: EASE_OUT_EXPO },
                  }}
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.35 } }}
                >
                  {body}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
