"use client";

import { ArrowUpRight } from "lucide-react";

import { site } from "@/lib/site";

/* Typographic apostrophe, kept out of JSX so it needs no escaping. */
const WORDMARK = "LET\u2019S TALK";

const YEAR = new Date().getFullYear();

/**
 * Closing panel.
 *
 * Sits in normal flow with no background of its own: the global 3D scene is
 * fixed behind every section and scales up to 2.2 through this range, so the
 * type reads against the glass rather than over an opaque plane.
 */
export function Footer() {
  return (
    <footer className="relative z-10 flex min-h-svh w-full flex-col overflow-hidden px-6 md:px-12">
      {/* The ask holds the centre; the line below rides the base, so the
          whole close still measures exactly one viewport. */}
      <div className="flex flex-1 flex-col items-center justify-center gap-10 md:gap-14">
        {/* ---- Screen-width wordmark ----
             Gradient clipped to the glyphs: the weight stays enormous while
             the letters fade off at the baseline, which keeps it elegant. */}
        <h2
          aria-label={WORDMARK}
          className={[
            "select-none whitespace-nowrap text-center",
            "font-display text-[clamp(3.25rem,17vw,15rem)] font-medium leading-[0.82] tracking-tighter",
            "bg-[linear-gradient(180deg,#111111_0%,#111111_34%,rgba(17,17,17,0.32)_100%)]",
            "bg-clip-text text-transparent",
          ].join(" ")}
        >
          {WORDMARK}
        </h2>

        {/* ---- Close ----
             Same pill as the section CTAs, scaled up: the footer is where the
             site's one action should look most familiar, not most novel. */}
        <a
          href={`mailto:${site.contact.email}`}
          className="group inline-flex items-center gap-4 rounded-full bg-headline py-2.5 pl-8 pr-2.5 text-[15px] font-medium text-white transition-colors duration-500 hover:bg-black/80 md:text-base"
        >
          {site.contact.cta}
          <span className="flex size-11 items-center justify-center rounded-full bg-white text-headline md:size-12">
            <ArrowUpRight
              className="size-[18px] transition-transform duration-500 ease-out-expo group-hover:rotate-45"
              strokeWidth={1.8}
            />
          </span>
        </a>
      </div>

      <p className="pb-10 text-center text-[12.5px] text-ink-muted">
        © {YEAR} {site.name}. All rights reserved.
      </p>
    </footer>
  );
}
