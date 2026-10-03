/* eslint-disable @next/next/no-html-link-for-pages --
 * Plain anchors are intentional across this site: RouteTransitionProvider
 * intercepts link clicks to run the curtain sweep before navigating, and
 * next/link would navigate first, skipping the transition entirely.
 */
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = { title: "Page not found" };

/*
 * Replaces Next's default 404, whose inline styles paint the body solid
 * white (black under a dark OS theme) over the aurora, and leave the
 * navbar's dark links on black.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center px-6 md:px-12">
      <div className="mx-auto w-full max-w-7xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-ink-muted">404</p>
        <h1 className="mt-5 font-display text-[clamp(2.75rem,9vw,8rem)] font-medium leading-[0.88] tracking-tighter text-headline">
          Page not found
        </h1>
        <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-soft md:text-base">
          The page you’re looking for doesn’t exist or has moved.
        </p>
        <a
          href="/"
          className="mt-12 inline-flex items-center gap-2 text-sm text-ink-soft transition-colors duration-300 hover:text-ink"
        >
          <ArrowLeft className="size-4" strokeWidth={1.6} />
          Back to home
        </a>
      </div>
    </main>
  );
}
