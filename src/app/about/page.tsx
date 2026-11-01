/* eslint-disable @next/next/no-html-link-for-pages --
 * Plain anchors are intentional across this site: RouteTransitionProvider
 * intercepts link clicks to run the curtain sweep before navigating, and
 * next/link would navigate first, skipping the transition entirely.
 */
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";

import { AboutHero } from "@/components/about/about-hero";
import styles from "@/components/about/about.module.css";
import { Logo, SPARKLE, SPARKLE_VIEWBOX } from "@/components/layout/logo";
import { sora } from "@/lib/fonts";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

/* Rendered from NASA's Black Marble 2016 night map (public domain). */
import earth from "../../../public/images/about/earth.jpg";
/* "Into the Light" by Chris B (CC0), graded into the brand blues. */
import intoTheLight from "../../../public/images/about/into-the-light.jpg";
/* Denali at sunrise, NPS photo by Tim Rains (public domain). */
import denali from "../../../public/images/about/denali.jpg";

export const metadata: Metadata = {
  title: "About",
  description:
    "GATVEON is a design and engineering studio building websites, AI agents, AI systems and mobile apps for ambitious brands.",
  alternates: { canonical: "/about" },
};

const SERVICES = [
  { name: "AI Agents", body: "Assistants that answer customers, qualify leads and take bookings, day and night." },
  { name: "AI Systems", body: "Custom AI built into your workflows, from document processing to smart search." },
  { name: "Software", body: "Dashboards, portals and internal tools shaped around how your team really works." },
  { name: "Websites", body: "Fast, striking websites that turn visitors into real enquiries." },
  { name: "Mobile Apps", body: "iOS and Android apps people actually keep on their home screen." },
  { name: "Automation", body: "Your tools connected and the repetitive work taken off your plate." },
  { name: "Design", body: "Brand, UI and UX that make your business look as good as it is." },
  { name: "Video Editing", body: "Clean, punchy edits for ads, reels and product launches." },
];

const STEPS = [
  { title: "Listen", body: "We start with your goals, your customers and your numbers. Not with a template." },
  { title: "Shape", body: "Strategy, structure and design, shared with you at every step so nothing is a surprise." },
  { title: "Build", body: "Clean, fast engineering for web, mobile and AI, tested on real devices." },
  { title: "Grow", body: "We launch with you, then stay on to measure, improve and build what comes next." },
];

const REASONS = [
  {
    title: "Craft in every detail",
    body: "People judge a business by how its product feels. We obsess over speed, motion and type because that is what earns trust.",
  },
  {
    title: "A direct line to the builders",
    body: "No layers of account managers. The people designing and coding your product are the people on your calls.",
  },
  {
    title: "AI where it pays off",
    body: "We use AI to answer customers, automate busywork and unlock new features. Never as a gimmick.",
  },
  {
    title: "With you after launch",
    body: "Launch day is the start. We support, measure and keep improving so your product grows with your business.",
  },
];

function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-[11px] uppercase leading-[1.9] tracking-[0.36em] text-white/60 [font-variation-settings:'wght'_480]",
        className,
      )}
    >
      {children}
    </p>
  );
}

/** Light, wide uppercase heading, as on the identity sheets. */
function Heading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={cn(
        "text-[clamp(1.9rem,4.2vw,3.4rem)] uppercase leading-[1.12] tracking-[0.06em] text-balance [font-variation-settings:'wght'_300]",
        className,
      )}
    >
      {children}
    </h2>
  );
}

function Rule({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("block h-px w-10 bg-white/50", className)} />;
}

function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox={SPARKLE_VIEWBOX} aria-hidden="true" className={className}>
      <path d={SPARKLE} fill="currentColor" />
    </svg>
  );
}

export default function AboutPage() {
  return (
    <div
      className={cn(sora.variable, styles.tokens, styles.board, "bg-[#02060f] text-white")}
      style={{ fontFamily: "var(--font-sora), system-ui, sans-serif" }}
    >
      <AboutHero />

      <div data-nav-dark="">
        {/* ---- Who we are ---- */}
        <section className="px-4 sm:px-6 py-14 md:px-12 md:py-20">
          <div className="mx-auto grid max-w-[1600px] items-center gap-14 md:grid-cols-[1.1fr_0.9fr] md:gap-20">
            <div>
              <Label>Who we are</Label>
              <Heading className="mt-6">
                Bold ideas,
                <br />
                real-world impact
              </Heading>
              <div className="mt-8 max-w-2xl space-y-5 text-[15px] leading-[1.8] text-white/70 md:text-base">
                <p>
                  {site.name} is a design and engineering studio. We build
                  websites, apps, AI agents and software for businesses that
                  want to grow, and we take them from the first idea all the
                  way to launch day and beyond.
                </p>
                <p>
                  We started {site.name} with one belief: good ideas deserve
                  better than template work. Every project gets a team that
                  cares how it looks, how it works and what it does for the
                  business behind it.
                </p>
                <p>
                  We work remotely with clients across India and around the
                  world, in small focused teams, so decisions move at the speed
                  of a conversation.
                </p>
              </div>
              <Rule className="mt-10" />
              <Label className="mt-8 text-white/50">
                Innovation
                <br />
                Clarity
                <br />
                Global impact
              </Label>
            </div>

            <figure className="relative mx-auto aspect-[3/4] w-full max-w-[440px] md:mr-0 overflow-hidden rounded-[6px] ring-1 ring-white/10">
              <Image
                src={intoTheLight}
                alt="A person walking out of a dark tunnel into bright light"
                placeholder="blur"
                fill
                sizes="(min-width: 768px) 420px, 90vw"
                className="object-cover"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#02060f]/80 via-transparent to-[#02060f]/30" />
              <figcaption className="absolute left-6 top-6 text-[11px] uppercase leading-[1.9] tracking-[0.32em] text-white/90">
                Bigger ideas
                <br />
                Brighter people
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ---- Mission and vision, over the horizon ---- */}
        <section className="relative overflow-hidden pt-14 md:pt-20">
          <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 md:px-12">
            <Label>Our purpose</Label>
            <p className="mx-auto mt-8 max-w-4xl text-[clamp(1.6rem,3.6vw,2.9rem)] leading-[1.25] tracking-[-0.01em] text-balance [font-variation-settings:'wght'_340]">
              We build technology for a more connected, intelligent and
              human future.
            </p>
            <div className="mx-auto mt-16 grid max-w-4xl gap-px overflow-hidden rounded-[6px] bg-white/10 text-left ring-1 ring-white/10 md:grid-cols-2">
              <div className="bg-[#04070f]/90 p-8 backdrop-blur md:p-10">
                <Label>Mission</Label>
                <p className="mt-4 text-[15px] leading-[1.75] text-white/75">
                  To give every ambitious business access to world-class
                  design, engineering and AI, without the agency overhead.
                </p>
              </div>
              <div className="bg-[#04070f]/90 p-8 backdrop-blur md:p-10">
                <Label>Vision</Label>
                <p className="mt-4 text-[15px] leading-[1.75] text-white/75">
                  A world where technology feels simple and human, and great
                  ideas reach the people they are meant for.
                </p>
              </div>
            </div>
            <p className="mt-14 text-[clamp(0.7rem,1.3vw,0.9rem)] uppercase tracking-[0.55em] text-white/70 [font-variation-settings:'wght'_360]">
              Ideas move worlds
            </p>
          </div>
          {/* Night side of the Earth, India on the crest: the arc rises
              just under the line above. */}
          <div aria-hidden="true" className="-mb-[clamp(40px,8vw,180px)] -mt-[clamp(20px,5vw,110px)]">
            <Image
              src={earth}
              alt=""
              placeholder="blur"
              sizes="100vw"
              className="h-[clamp(260px,37.5vw,900px)] w-full object-cover object-top"
            />
          </div>
        </section>

        {/* ---- What we do ---- */}
        <section className="relative overflow-hidden px-4 sm:px-6 py-14 md:px-12 md:py-20">
          <div aria-hidden="true" className={styles.halftone} />
          <div className="relative mx-auto max-w-[1600px]">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <Label>What we do</Label>
                <Heading className="mt-6">
                  Simple technology,
                  <br />
                  brighter possibilities
                </Heading>
              </div>
              <a
                href="/#services"
                className="text-[11px] uppercase tracking-[0.3em] text-white/50 underline decoration-white/20 underline-offset-8 transition-colors duration-300 hover:text-white"
              >
                Explore services
              </a>
            </div>
            <ul className="mt-16 grid border-t border-white/10 sm:grid-cols-2">
              {SERVICES.map((service, i) => (
                <li
                  key={service.name}
                  className="group flex gap-6 border-b border-white/10 py-8 sm:pr-10 sm:odd:border-r sm:even:pl-10 sm:even:pr-0"
                >
                  <span className="pt-1.5 text-[11px] tabular-nums tracking-[0.2em] text-white/40">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="flex items-center gap-2.5 text-xl tracking-[-0.01em] [font-variation-settings:'wght'_500]">
                      {service.name}
                      <Sparkle className="size-3.5 text-[#4d94ff] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    </h3>
                    <p className="mt-2 text-[14.5px] leading-[1.65] text-white/60">
                      {service.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---- How we work ---- */}
        <section className="px-4 sm:px-6 py-14 md:px-12 md:py-20">
          <div className="mx-auto max-w-[1600px]">
            <Label>How we work</Label>
            <Heading className="mt-6">From idea to impact</Heading>
            <ol className="relative mt-16 grid gap-12 md:grid-cols-4 md:gap-8">
              {/* The path the four steps sit on. */}
              <span
                aria-hidden="true"
                className="absolute left-[22px] top-[22px] hidden h-px w-[calc(100%-44px)] bg-gradient-to-r from-[#0066ff] via-white/25 to-[#7c3aed] md:block"
              />
              {STEPS.map((step, i) => (
                <li key={step.title} className="relative">
                  <span className="relative grid size-11 place-items-center rounded-[12px] bg-[#0b0f1a] text-white shadow-[0_0_30px_rgba(0,102,255,0.25)] ring-1 ring-white/15">
                    <Sparkle className="size-5" />
                  </span>
                  <p className="mt-7 text-[11px] tabular-nums tracking-[0.3em] text-white/40">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-2 text-2xl uppercase tracking-[0.08em] [font-variation-settings:'wght'_340]">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-[14.5px] leading-[1.7] text-white/60">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---- Why GATVEON ---- */}
        <section className="px-4 sm:px-6 py-14 md:px-12 md:py-20">
          <div className="mx-auto max-w-[1600px]">
            <Label>Why {site.name}</Label>
            <Heading className="mt-6">
              Bolder, smarter,
              <br />
              brighter
            </Heading>
            <div className="mt-16 grid gap-px overflow-hidden rounded-[6px] bg-white/10 ring-1 ring-white/10 sm:grid-cols-2">
              {REASONS.map((reason) => (
                <div key={reason.title} className="bg-[#05080f] p-8 md:p-10">
                  <span
                    aria-hidden="true"
                    className="block h-px w-10 bg-gradient-to-r from-[#0066ff] to-[#7c3aed]"
                  />
                  <h3 className="mt-6 text-xl tracking-[-0.01em] [font-variation-settings:'wght'_500]">
                    {reason.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-[1.75] text-white/60">{reason.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- Further together ---- */}
        <section className="px-4 sm:px-6 pb-16 pt-6 md:px-12 md:pb-20">
          <div
            id="contact"
            className="relative mx-auto grid max-w-[1600px] scroll-mt-28 overflow-hidden rounded-[10px] bg-[#05080f] ring-1 ring-white/10 md:grid-cols-[1fr_0.85fr]"
          >
            <div className="relative z-10 flex flex-col justify-between gap-12 p-8 sm:p-12">
              <div>
                <Label>Let’s talk</Label>
                <Heading className="mt-6">
                  Further
                  <br />
                  together
                </Heading>
                <Rule className="mt-8" />
                <p className="mt-8 max-w-md text-[15px] leading-[1.75] text-white/70">
                  Have a project in mind? Tell us what you are building and we
                  will come back with ideas, a plan and clear next steps.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <a className={styles.glass} href={`mailto:${site.contact.email}`}>
                  <span>{site.contact.email}</span>
                </a>
                <a
                  className={styles.glass}
                  href={site.contact.whatsapp.start}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>WhatsApp us</span>
                  <svg className={styles.arrow} viewBox="0 0 16 11" aria-hidden="true">
                    <path d="M0 5.5 H14.6 M10.3 1.2 L14.9 5.5 L10.3 9.8" />
                  </svg>
                </a>
              </div>
            </div>
            <div className="relative min-h-[280px]">
              <Image
                src={denali}
                alt="Denali at sunrise, its snowfields lit pink"
                placeholder="blur"
                fill
                sizes="(min-width: 768px) 520px, 100vw"
                className="object-cover"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[#05080f] via-transparent to-transparent md:bg-gradient-to-r" />
              <span aria-hidden="true" className="absolute bottom-7 right-7">
                <Logo className="h-6 text-white" />
              </span>
            </div>
          </div>

          {/* Closing band */}
          <div className="mx-auto mt-4 flex max-w-[1600px] flex-wrap items-center justify-between gap-6 rounded-[10px] bg-gradient-to-r from-[#0047d9] via-[#3b3fe0] to-[#7c3aed] px-8 py-6 sm:px-12">
            <p className="text-[clamp(0.65rem,1.2vw,0.8rem)] uppercase tracking-[0.5em] text-white/90 [font-variation-settings:'wght'_420]">
              A brighter tomorrow together
            </p>
            <span aria-hidden="true">
              <Logo className="h-5 text-white" />
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
