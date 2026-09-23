import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { AuroraField } from "@/components/background/aurora-field";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { KineticViewport } from "@/components/providers/kinetic-viewport";
import {
  PageTransition,
  RouteTransitionProvider,
} from "@/components/providers/route-transition";
import { ScrollRig } from "@/components/providers/scroll-rig";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { FilmGrain } from "@/components/ui/film-grain";
import { bodoni, inter } from "@/lib/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "NOXTEAM — Architecting the Digital Frontier",
    template: "%s — NOXTEAM",
  },
  description:
    "We engineer kinetic interfaces and scalable architectures for the world’s most ambitious brands.",
};

export const viewport: Viewport = {
  themeColor: "#F9F9F9",
  colorScheme: "light",
};

/**
 * Layer order, back to front:
 *
 *   html background   off-white ground (set in globals.css)
 *  -z-10  AuroraField   fixed pastel wash
 *   z-10  KineticViewport  page content + footer, given under scroll velocity
 *   z-30  Navbar        floating chrome
 *   z-40  FilmGrain     unifies DOM and WebGL into one photographic plane
 *   z-[900]  route curtain
 *
 * body carries no background-color on purpose: it would paint over the
 * negative z-index aurora layer.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${bodoni.variable}`}>
      <head>
        {/* The demos pull fonts and three.js from these; opening the
            connections up front removes a DNS + TLS round trip each from
            the moment they are actually needed. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />

        {/* Runs before hydration on purpose. The browser restores the last
            scroll offset around the load event — later than any React effect
            — so opting out from a component is already too late and the page
            re-opens parked mid-document. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'if("scrollRestoration" in history){history.scrollRestoration="manual"}' +
              'if(!location.hash){window.scrollTo(0,0)}',
          }}
        />
      </head>
      <body className="font-sans text-ink antialiased">
        <SmoothScroll>
          <ScrollRig />

          <RouteTransitionProvider>
            <AuroraField />

            <Navbar />

            <KineticViewport>
              <PageTransition>{children}</PageTransition>
              <Footer />
            </KineticViewport>
          </RouteTransitionProvider>
        </SmoothScroll>

        <FilmGrain />
      </body>
    </html>
  );
}
