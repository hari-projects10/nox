"use client";

import { DemoModal } from "./demo-modal";
import { IframeDemo } from "./iframe-demo";

/* Each product ships as a static page under /public/demos, loaded on demand. */
export const DEMOS = {
  "smart-hr": {
    name: "Smart HR",
    tagline: "Multi-agent HR orchestration",
    url: "console.smarthr.ai/orchestrator",
    accent: "#2d6bea",
    src: "/demos/smart-hr/index.html",
    /*
     * The console's authored layout: a 6-column grid (Automation activity
     * full width; Workload and Performance & health side by side beneath it).
     * Its own CSS only produces that between 1241px and 1360px wide -- wider
     * goes 12-column and halves Automation, narrower drops table columns and
     * the announce bar. Taller than 900px keeps the promo rail.
     */
    design: { width: 1320, height: 940 },
    background: "#E8EFF9",
    shell: "browser",
  },
  veloce: {
    name: "Veloce",
    tagline: "EV telemetry mobile app",
    url: "fleet.veloce.app/vehicle",
    accent: "#ec0618",
    src: "/demos/veloce/index.html",
    /* Phone mockup (384x812 + bezel + page padding) — fit it, never crop it. */
    design: { width: 436, height: 872 },
    background: "#0b0b0c",
    shell: "bare",
  },
} satisfies Record<
  string,
  {
    name: string;
    tagline: string;
    url: string;
    accent: string;
    src: string;
    design?: { width: number; height: number };
    background?: string;
    shell?: "browser" | "bare";
  }
>;

export type DemoId = keyof typeof DEMOS;

/**
 * `id` stays set after closing, so the product keeps rendering while the
 * modal animates out. `onClose` must be stable (useCallback).
 */
export function ProductDemo({
  id,
  open,
  onClose,
}: {
  id: DemoId;
  open: boolean;
  onClose: () => void;
}) {
  const demo = DEMOS[id];

  return (
    <DemoModal
      open={open}
      onClose={onClose}
      name={demo.name}
      tagline={demo.tagline}
      url={demo.url}
      accent={demo.accent}
      design={demo.design}
      shell={demo.shell}
    >
      <IframeDemo
        key={id}
        src={demo.src}
        title={`${demo.name} interactive demo`}
        design={demo.design}
        background={demo.background}
      />
    </DemoModal>
  );
}
