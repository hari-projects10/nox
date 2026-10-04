import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { AuroraField } from "@/components/background/aurora-field";
import { ChatWidget } from "@/components/chat/chat-widget";
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
import { site } from "@/lib/site";
import { SITE_URL } from "@/lib/site-url";

import "./globals.css";

/* Search results show the title and description, not the hero, so both say
   plainly what the studio does: the brand name alone gives Google nothing to
   match a search against. */
const TITLE = `${site.name} | Web, AI and App Development Studio`;
const DESCRIPTION =
  "GATVEON designs and builds websites, AI apps, AI agents and mobile apps for ambitious brands. Tell us about your project and book a call.";

/* Tells Google that GATVEON is an organisation with this site, logo and
   inbox, which is what lets a search for the name show the site. */
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": new URL("/#organization", SITE_URL).href,
      name: site.name,
      url: SITE_URL.href,
      logo: new URL("/gatveon-logo-horizontal.svg", SITE_URL).href,
      email: site.contact.email,
      telephone: site.contact.whatsapp.display,
      description: DESCRIPTION,
    },
    {
      "@type": "WebSite",
      "@id": new URL("/#website", SITE_URL).href,
      name: site.name,
      url: SITE_URL.href,
      publisher: { "@id": new URL("/#organization", SITE_URL).href },
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: {
    default: TITLE,
    template: `%s | ${site.name}`,
  },
  description: DESCRIPTION,
  /* Link previews in WhatsApp, LinkedIn, Slack and X. The card image is
     app/opengraph-image.tsx. */
  openGraph: {
    type: "website",
    siteName: site.name,
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c"),
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

        {/* Outside KineticViewport: its transform would unpin a fixed child. */}
        <ChatWidget />
      </body>
    </html>
  );
}
