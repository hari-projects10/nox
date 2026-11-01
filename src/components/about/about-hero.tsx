"use client";

import { useEffect, useRef, useState } from "react";

import { Logo } from "@/components/layout/logo";
import { AMBIENT_VIDEO } from "@/lib/site";
import { cn } from "@/lib/utils";

import styles from "./about.module.css";

/* Gold strands from the top corners, blue from the bottom, meeting at a
   white-hot point in the centre. The poster is its own first frame, so
   nothing flashes before playback. */
const VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_104303_0c6d60b2-9353-408e-9449-585108a22fb5.mp4";
const POSTER =
  "https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/130837c4-0244-4f37-9c61-8d801d93fd29.jpg";

const FEATURES = [
  "Strategy first",
  "End-to-end delivery",
  "AI at the core",
  "Built to last",
];

/** Longest the entrance can run (last delay + duration), plus margin. */
const ENTRANCE_MS = 4000;

export function AboutHero() {
  const video = useRef<HTMLVideoElement>(null);
  const last = useRef<HTMLSpanElement>(null);
  const [entered, setEntered] = useState(false);

  /* The artwork is a video, so the CSS reset cannot reach it: reduced
     motion pauses it on its first frame, the still the loop was built from. */
  useEffect(() => {
    const v = video.current;
    const q = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!v || !q) return;

    const sync = () => {
      if (q.matches) v.pause();
      else v.play()?.catch(() => {});
    };
    sync();
    q.addEventListener("change", sync);
    return () => q.removeEventListener("change", sync);
  }, []);

  /* The entrance is pure CSS; this only retires it once the last tween
     has ended, so a later breakpoint change can never replay it. */
  useEffect(() => {
    const el = last.current;
    if (!el) return;

    const done = () => {
      clearTimeout(timer);
      el.removeEventListener("animationend", done);
      setEntered(true);
    };
    const timer = setTimeout(done, ENTRANCE_MS);
    el.addEventListener("animationend", done);
    return () => {
      clearTimeout(timer);
      el.removeEventListener("animationend", done);
    };
  }, []);

  return (
    <section
      id="top"
      /* Tells the transparent header to invert while it is under the bar. */
      data-nav-dark=""
      className={cn(styles.hero, entered && styles.entered)}
    >
      <video
        ref={video}
        className={styles.art}
        aria-hidden="true"
        src={VIDEO}
        poster={POSTER}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        {...AMBIENT_VIDEO}
      />
      <div className={styles.veil} aria-hidden="true" />

      <div className={styles.main}>
        <p className={styles.eyebrow}>About us</p>

        <span className={cn("group/logo", styles.logoWrap)}>
          <Logo className={styles.logo} />
        </span>

        <h1 className={styles.title}>
          <span>We build what moves your business.</span>{" "}
          <span>Right on time, right on target.</span>
        </h1>

        <p className={styles.sub}>
          <span>A team of designers and engineers</span>{" "}
          <span>turning bold ideas into products people love.</span>
        </p>

        <a className={styles.glass} href="#contact">
          <span>Start a project</span>
          <svg className={styles.arrow} viewBox="0 0 16 11" aria-hidden="true">
            <path d="M0 5.5 H14.6 M10.3 1.2 L14.9 5.5 L10.3 9.8" />
          </svg>
        </a>

        <ul className={styles.feats}>
          {FEATURES.map((label) => (
            <li key={label}>
              <svg className={styles.chev} viewBox="0 0 11 20" aria-hidden="true">
                <path d="M1.15 1.15 L9.6 10 L1.15 18.85" />
              </svg>
              <span>{label}</span>
            </li>
          ))}
        </ul>

        <span className={styles.rule} aria-hidden="true" />
      </div>

      <p className={styles.foot}>
        <span>Design, engineering and AI under one roof.</span>
        <span ref={last}>Since 2026</span>
      </p>
    </section>
  );
}
