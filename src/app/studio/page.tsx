/* eslint-disable @next/next/no-html-link-for-pages --
 * Plain anchors are intentional across this site: RouteTransitionProvider
 * intercepts link clicks to run the curtain sweep before navigating, and
 * next/link would navigate first, skipping the transition entirely.
 */
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = { title: "Studio" };

/* Stub route: exists so the page transition has somewhere to go.
   Replace the body with the real Studio content. */
export default function StudioPage() {
  return (
    <main className="flex min-h-svh items-center px-6 md:px-12">
      <div className="mx-auto w-full max-w-7xl">
        <p className="text-[11px] uppercase tracking-[0.28em] text-ink-muted">
          Noxteam
        </p>
        <h1 className="mt-5 font-display text-[clamp(2.75rem,9vw,8rem)] font-medium leading-[0.88] tracking-tighter text-headline">
          Studio
        </h1>
        <a
          href="/"
          className="mt-12 inline-flex items-center gap-2 text-sm text-ink-soft transition-colors duration-300 hover:text-ink"
        >
          <ArrowLeft className="size-4" strokeWidth={1.6} />
          Back to work
        </a>
      </div>
    </main>
  );
}
