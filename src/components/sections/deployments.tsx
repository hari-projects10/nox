"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

import { DemoPreview } from "@/components/demos/demo-preview";
import { DEMOS, ProductDemo, type DemoId } from "@/components/demos/product-demo";
import { SplitText } from "@/components/ui/split-text";
import { EASE_OUT_EXPO } from "@/lib/site";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  The surfaces we deploy into                                       */
/* ------------------------------------------------------------------ */

type Surface = {
  /** Which live system stands as proof of this surface. */
  demo: DemoId;
  label: string;
  headline: string;
  body: string;
  capabilities: string[];
  action: string;
  /** `top` crops a console at the fold; `contain` shows a device whole. */
  fit: "top" | "contain";
  /** Browser furniture reads as a console; a device needs none. */
  chrome: boolean;
};

const surfaces: Surface[] = [
  {
    demo: "smart-hr",
    label: "Enterprise Web",
    headline: "The console a company runs on.",
    body:
      "Operations platforms where the work actually happens: orchestration, live queues, approvals and audit. Built for the teams that keep a business moving, and for the volume they move it at.",
    capabilities: [
      "Multi-agent orchestration",
      "Role-based access and audit",
      "Real-time operational queues",
    ],
    action: "Open the live console",
    fit: "top",
    chrome: true,
  },
  {
    demo: "veloce",
    label: "Native Mobile",
    headline: "The device it is carried on.",
    body:
      "Applications that hold up away from the desk: streaming telemetry, hardware-grade rendering, and interfaces that stay readable at a glance in a moving vehicle or on a factory floor.",
    capabilities: [
      "Live device telemetry",
      "Real-time 3D rendering",
      "Glanceable, one-handed interfaces",
    ],
    action: "Open the live app",
    fit: "contain",
    chrome: false,
  },
];

const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-120px" },
  transition: { duration: 1, delay, ease: EASE_OUT_EXPO },
});

/* ------------------------------------------------------------------ */
/*  One surface                                                       */
/* ------------------------------------------------------------------ */

function SurfaceRow({
  surface,
  index,
  onOpen,
}: {
  surface: Surface;
  index: number;
  onOpen: (demo: DemoId) => void;
}) {
  const demo = DEMOS[surface.demo];
  const flipped = index % 2 === 1;

  return (
    <article>
      <div className="grid grid-cols-12 items-start gap-y-10 md:gap-x-10 lg:gap-x-16">
        {/* ---- Statement ---- */}
        <motion.div
          {...reveal()}
          className={cn("col-span-12 lg:col-span-4", flipped && "lg:order-2")}
        >
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-headline">
            {surface.label}
          </p>

          <h3 className="mt-3 font-display text-[clamp(1.75rem,2.6vw,2.75rem)] font-medium leading-[1.05] tracking-[-0.035em] text-headline">
            {surface.headline}
          </h3>

          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-ink-soft md:text-base">
            {surface.body}
          </p>

          <ul className="mt-8 max-w-md">
            {surface.capabilities.map((capability) => (
              <li
                key={capability}
                className="flex items-center gap-3 py-2 text-[13.5px] text-ink-soft"
              >
                <span
                  aria-hidden="true"
                  className="h-1 w-1 shrink-0 rounded-full"
                  style={{ background: demo.accent }}
                />
                {capability}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => onOpen(surface.demo)}
            className="group mt-8 inline-flex items-center gap-3 rounded-full bg-headline py-2 pl-5 pr-2 text-sm font-medium text-white transition-colors hover:bg-black/80"
          >
            {surface.action}
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-headline">
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />
            </span>
          </button>
        </motion.div>

        {/* ---- Proof: the system itself, running ---- */}
        <motion.div
          {...reveal(0.1)}
          className={cn("col-span-12 lg:col-span-8", flipped && "lg:order-1")}
        >
          <button
            type="button"
            onClick={() => onOpen(surface.demo)}
            aria-label={`${surface.action} — ${demo.name}`}
            className="group relative block aspect-[16/10] w-full cursor-pointer overflow-hidden rounded-[22px] text-left shadow-[0_40px_90px_-60px_rgba(0,0,0,0.55)] outline-none ring-1 ring-black/[0.08] focus-visible:ring-2 focus-visible:ring-black/50"
          >
            {/* Poster beneath the live frame: what phones and slow links get. */}
            <span
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background: `radial-gradient(120% 120% at 20% 0%, ${demo.accent}22, transparent 60%), ${demo.background}`,
              }}
            />

            {surface.chrome ? (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 z-20 flex h-9 items-center gap-1.5 border-b border-black/[0.06] bg-gradient-to-b from-[#fcfcfd] to-[#f2f2f5] px-4"
              >
                <span className="truncate text-[11px] text-black/35">{demo.url}</span>
              </span>
            ) : null}

            <span className={cn("absolute inset-0", surface.chrome && "top-9")}>
              <DemoPreview
                src={demo.src}
                title={`${demo.name} preview`}
                design={demo.design}
                background={demo.background}
                fit={surface.fit}
              />
            </span>

            {/* Weight at the base so the label always holds. */}
            <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 z-20 h-32 bg-gradient-to-t from-black/45 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-100"
            />

            <span className="absolute bottom-4 left-4 z-20 text-[13px] font-medium text-white md:bottom-5 md:left-5">
              {demo.name}
            </span>

            {/* Always shown where there is no hover to reveal it. */}
            <span className="absolute bottom-4 right-4 z-20 flex h-9 items-center gap-2 rounded-full bg-white/95 px-4 text-[12.5px] font-medium text-headline transition-all duration-500 md:bottom-5 md:right-5 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-visible:opacity-100">
              Open
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </button>
        </motion.div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Section                                                           */
/* ------------------------------------------------------------------ */

export function Deployments() {
  const [demo, setDemo] = useState<DemoId>("smart-hr");
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  const openDemo = useCallback((id: DemoId) => {
    setDemo(id);
    setIsDemoOpen(true);
  }, []);
  const closeDemo = useCallback(() => setIsDemoOpen(false), []);

  return (
    <section id="work" className="relative px-6 py-20 md:px-12 md:py-28">
      <div className="mx-auto w-full max-w-7xl">
        {/* ---- Section header ---- */}
        <header className="mb-12 grid grid-cols-12 items-end gap-y-8 md:mb-16 md:gap-x-10">
          <div className="col-span-12 lg:col-span-7">
            <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-muted">
              Deployment surfaces
            </p>
            <h2
              aria-label="Where our systems run"
              className="font-display text-[clamp(2.25rem,5.5vw,4.5rem)] font-medium leading-[0.95] tracking-tighter text-headline"
            >
              <SplitText text="Where our systems run" inView stagger={0.03} />
            </h2>
          </div>

          <motion.p
            {...reveal(0.2)}
            className="col-span-12 max-w-md text-[15px] leading-relaxed text-ink-soft lg:col-span-5 lg:justify-self-end"
          >
            Every engagement ends the same way, a system in production, on the surfaces
            the business actually operates on. Both environments below are running live.
            Open either one and use it.
          </motion.p>
        </header>

        <div className="flex flex-col gap-14 md:gap-20">
          {surfaces.map((surface, i) => (
            <SurfaceRow key={surface.demo} surface={surface} index={i} onOpen={openDemo} />
          ))}
        </div>
      </div>

      <ProductDemo id={demo} open={isDemoOpen} onClose={closeDemo} />
    </section>
  );
}
