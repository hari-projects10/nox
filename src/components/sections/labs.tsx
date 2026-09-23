"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

import { BeforeAfter } from "@/components/ui/before-after";
import { SplitText } from "@/components/ui/split-text";
import { EASE_OUT_EXPO } from "@/lib/site";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  The in-house toolchain                                            */
/* ------------------------------------------------------------------ */

type Tool = {
  id: string;
  name: string;
  /** The problem domain it belongs to, not a product category. */
  discipline: string;
  description: string;
  /** What it does, in the language an engineer would use. */
  specs: string[];
  image: string;
  alt: string;
  /** How the processed layer is composited for this tool. */
  process: "grade" | "reframe" | "isolate";
};

const tools: Tool[] = [
  {
    id: "chroma-90",
    name: "Chroma-90",
    discipline: "Colour science",
    description:
      "A programmatic film stock. It models the response of 1990s emulsion channel crosstalk, highlight roll-off, the warmth that came from the chemistry rather than the lens and applies it as a grade that holds its character across an entire library.",
    specs: [
      "Emulsion response model",
      "Per-channel transfer curves",
      "Deterministic across batches",
    ],
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=2000&q=85&auto=format&fit=crop",
    alt: "Portrait used to demonstrate film colour grading",
    process: "grade",
  },
  {
    id: "align-ai",
    name: "Align AI",
    discipline: "Composition",
    description:
      "Group framing that corrects itself. It reads posture and relative height across every subject in the frame, then re-centres and levels the composition so nobody ends up cropped, leaning, or lost behind the person in front of them.",
    specs: [
      "Multi-subject pose read",
      "Relative-height normalisation",
      "Automatic reframe and level",
    ],
    image:
      "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=2000&q=85&auto=format&fit=crop",
    alt: "Four people of differing heights framed together at sunset",
    process: "reframe",
  },
  {
    id: "depth-isolate",
    name: "Depth Isolate",
    discipline: "Depth and matting",
    description:
      "Subject-aware depth separation. It estimates depth from a single frame, cuts a matte that survives hair and edges, and synthesises the defocus behind it a wide-aperture result from a lens that never had one.",
    specs: [
      "Monocular depth estimate",
      "Edge-accurate matte",
      "Synthesised optical defocus",
    ],
    image:
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=2000&q=85&auto=format&fit=crop",
    alt: "Close-up portrait used to demonstrate subject and background separation",
    process: "isolate",
  },
];

/* Processing recipes, expressed as compositing on the source frame. */
const GRADE: CSSProperties = {
  filter:
    "sepia(0.3) saturate(1.5) contrast(1.18) brightness(1.05) hue-rotate(-6deg)",
};
const REFRAME: CSSProperties = {
  transform: "scale(1.08) rotate(-2deg)",
  filter: "brightness(1.03) contrast(1.04)",
};
/* Scaled up so the blur samples past the frame instead of feathering the
   border into transparency. */
const BACKGROUND_BLUR: CSSProperties = {
  filter: "blur(14px) saturate(0.72) brightness(1.06)",
  transform: "scale(1.06)",
};
/* Tight enough to read as a cut-out subject: the face is kept, everything
   around it falls away. A wider ellipse covers the whole close-up and the
   separation stops being visible at all. */
const SUBJECT_ELLIPSE =
  "radial-gradient(ellipse 27% 36% at 50% 34%, #000 52%, transparent 76%)";
const SUBJECT_MASK: CSSProperties = {
  filter: "contrast(1.06) saturate(1.06)",
  maskImage: SUBJECT_ELLIPSE,
  WebkitMaskImage: SUBJECT_ELLIPSE,
};

const SIZES = "(max-width: 768px) 100vw, 66vw";

function Frame({
  tool,
  style,
  className,
}: {
  tool: Tool;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <Image
      src={tool.image}
      alt={tool.alt}
      fill
      sizes={SIZES}
      style={style}
      className={cn("object-cover", className)}
    />
  );
}

function processedLayer(tool: Tool) {
  if (tool.process === "grade") return <Frame tool={tool} style={GRADE} />;
  if (tool.process === "reframe") return <Frame tool={tool} style={REFRAME} />;

  /* Background isolation: soften everything, then lay the sharp subject
     back over the centre through a soft elliptical mask. */
  return (
    <>
      <Frame tool={tool} style={BACKGROUND_BLUR} />
      <Frame tool={tool} style={SUBJECT_MASK} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Section                                                           */
/* ------------------------------------------------------------------ */

export function Labs() {
  const [activeId, setActiveId] = useState(tools[0].id);
  const active = tools.find((tool) => tool.id === activeId) ?? tools[0];

  return (
    <section id="labs" className="relative px-6 py-20 md:px-12 md:py-28">
      <div className="mx-auto w-full max-w-7xl">
        {/* ---- Section header ---- */}
        <header className="mb-10 grid grid-cols-12 items-end gap-y-8 md:mb-14 md:gap-x-10">
          <div className="col-span-12 lg:col-span-7">
            <p className="mb-6 text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-muted">
              Applied research
            </p>
            <h2
              aria-label="Vision Engineering"
              className="font-display text-[clamp(2.25rem,5.5vw,4.5rem)] font-medium leading-[0.95] tracking-tighter text-headline"
            >
              <SplitText text="Vision Engineering" inView stagger={0.03} />
            </h2>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-120px" }}
            transition={{ duration: 1, delay: 0.15, ease: EASE_OUT_EXPO }}
            className="col-span-12 max-w-md text-[15px] leading-relaxed text-ink-soft lg:col-span-5 lg:justify-self-end"
          >
            Client work keeps running into capabilities no library ships. When it does,
            we build the instrument ourselves — and it stays in the toolchain. Drag any
            frame to run it.
          </motion.p>
        </header>

        {/* ---- Tool switcher ---- */}
        <div
          role="tablist"
          aria-label="Vision tools"
          className="flex flex-wrap items-center gap-x-8 gap-y-3 md:gap-x-12"
        >
          {tools.map((tool) => {
            const isActive = tool.id === activeId;

            return (
              <button
                key={tool.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`${tool.id}-stage`}
                onClick={() => setActiveId(tool.id)}
                className={cn(
                  "group relative pb-3 text-left transition-opacity duration-500",
                  isActive ? "opacity-100" : "opacity-40 hover:opacity-80",
                )}
              >
                <span className="block font-display text-[clamp(1.25rem,2.2vw,1.75rem)] font-medium tracking-tight text-headline">
                  {tool.name}
                </span>
                <span className="mt-1 block text-[11px] font-medium uppercase tracking-[0.18em] text-ink-muted">
                  {tool.discipline}
                </span>

                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-0 bottom-0 h-px origin-left bg-headline",
                    "transition-transform duration-500 ease-out-expo",
                    isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                  )}
                />
              </button>
            );
          })}
        </div>

        {/* ---- Stage ---- */}
        <div
          id={`${active.id}-stage`}
          role="tabpanel"
          aria-label={active.name}
          className="mt-10 grid grid-cols-12 gap-y-10 md:mt-12 md:gap-x-10 lg:gap-x-16"
        >
          <div className="col-span-12 lg:col-span-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
              >
                <BeforeAfter
                  before={<Frame tool={active} />}
                  after={processedLayer(active)}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="col-span-12 lg:col-span-4">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
              >
                <p className="max-w-md text-[15px] leading-relaxed text-ink-soft md:text-base">
                  {active.description}
                </p>

                <ul className="mt-8 max-w-md">
                  {active.specs.map((spec) => (
                    <li
                      key={spec}
                      className="flex items-center gap-3 py-2 text-[13.5px] text-ink-soft"
                    >
                      <span
                        aria-hidden="true"
                        className="h-1 w-1 shrink-0 rounded-full bg-headline"
                      />
                      {spec}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
