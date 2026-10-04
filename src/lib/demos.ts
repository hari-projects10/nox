import type { Brief } from "@/components/demos/demo-brief";

/* Each product ships as a static page under /public/demos, loaded on demand. */
export const DEMOS = {
  "smart-hr": {
    name: "Smart HR",
    tagline: "Multi-agent HR orchestration",
    url: "gatveon.com/demos/smart-hr",
    accent: "#2d6bea",
    src: "/demos/smart-hr/index.html",
    poster: "/images/demos/smart-hr-poster.jpg",
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
    brief: {
      pitch: "An operations console where AI agents run HR end to end.",
      summary:
        "Payroll, leave, hiring and approvals run as coordinated agent workflows, with every step visible and every decision open to review by a person. One console for the team that keeps a company paid, staffed and on schedule.",
      modules: [
        "Multi-agent orchestration",
        "Payroll and settlement runs",
        "Hiring pipeline and shortlisting",
        "Approvals with a full audit trail",
      ],
      facts: [
        { label: "Surface", value: "Web console" },
        { label: "Built for", value: "HR and operations" },
      ],
    },
  },
  veloce: {
    name: "Veloce",
    tagline: "EV telemetry mobile app",
    url: "gatveon.com/demos/veloce",
    accent: "#ec0618",
    src: "/demos/veloce/index.html",
    poster: "/images/demos/veloce-poster.jpg",
    /* On a phone the app is the screen: no drawn device around it. */
    phoneSrc: "/demos/veloce/index.html?fullbleed",
    /* Phone mockup (384x812 + bezel + page padding) — fit it, never crop it. */
    design: { width: 436, height: 872 },
    background: "#0b0b0c",
    shell: "bare",
    brief: {
      pitch: "A companion app that puts the whole car in your pocket.",
      summary:
        "Live battery and cell telemetry, tariff-aware smart charging, remote climate and locks, all built around a real-time 3D model of the vehicle. Made to be read at a glance and used with one hand.",
      modules: [
        "Live battery telemetry",
        "Smart, tariff-aware charging",
        "Remote climate and security",
        "Real-time 3D vehicle",
      ],
      facts: [
        { label: "Surface", value: "Mobile app" },
        { label: "Built for", value: "EV owners and fleets" },
      ],
    },
  },
} satisfies Record<
  string,
  {
    name: string;
    tagline: string;
    url: string;
    accent: string;
    src: string;
    poster: string;
    /** Where a phone should load it, if not `src`. */
    phoneSrc?: string;
    design?: { width: number; height: number };
    background?: string;
    shell?: "browser" | "bare";
    brief: Brief;
  }
>;

export type DemoId = keyof typeof DEMOS;

/**
 * Window event asking the page to open one of the demos, from anywhere,
 * such as the assistant. The section that hosts them answers it.
 */
export const OPEN_DEMO = "site:open-demo";

/**
 * Open a demo's live window. Returns false when nothing on this page can
 * show it (its section isn't mounted here), so the caller can fall back.
 */
export function requestDemo(id: DemoId) {
  const event = new CustomEvent<{ id: DemoId }>(OPEN_DEMO, { detail: { id }, cancelable: true });
  return !window.dispatchEvent(event);
}
