import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { ARCS, WORDMARK } from "@/components/layout/logo";
import { site } from "@/lib/site";

/*
 * The card shown wherever a link to the site is shared, rendered once at
 * build time: the aurora ground, the logo and the hero's own words, in the
 * site's face. Inter ships in assets/fonts as static TTFs, the only kind
 * the renderer reads; next/og's bundled face set uneven word gaps.
 */

export const alt = `${site.name}: ${site.hero.headline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The aurora's washes (aurora-field.tsx), layered on the ground itself:
    positioned blobs come out with hard edges in this renderer. */
const AURORA = [
  "radial-gradient(circle at 8% 0%, rgba(226,232,240,1) 0%, rgba(226,232,240,0) 55%)",
  "radial-gradient(circle at 96% 18%, rgba(224,231,255,1) 0%, rgba(224,231,255,0) 50%)",
  "radial-gradient(circle at 40% 120%, rgba(243,232,255,1) 0%, rgba(243,232,255,0) 55%)",
].join(", ");

const LOGO_HEIGHT = 46;

const font = (file: string) => readFile(join(process.cwd(), "assets/fonts", file));

export default async function OpenGraphImage() {
  const [regular, medium] = await Promise.all([
    font("Inter-Regular.ttf"),
    font("Inter-Medium.ttf"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 84px 80px",
          backgroundColor: "#f9f9f9",
          backgroundImage: AURORA,
          color: "#111111",
          fontFamily: "Inter",
        }}
      >
        <svg
          width={(LOGO_HEIGHT * 515.8) / 100}
          height={LOGO_HEIGHT}
          viewBox="0 0 515.8 100"
        >
          <g fill="none" stroke="#111111" strokeWidth={7.5} strokeLinecap="round">
            {ARCS.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          <circle cx={88} cy={50} r={6.5} fill="#0E9C98" />
          <path d={WORDMARK} fill="#111111" />
        </svg>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              maxWidth: 1000,
              fontSize: 96,
              fontWeight: 500,
              lineHeight: 0.95,
              letterSpacing: -3.8,
            }}
          >
            {site.hero.headline}
          </div>
          <div
            style={{
              marginTop: 30,
              maxWidth: 760,
              fontSize: 30,
              lineHeight: 1.4,
              color: "#43434f",
            }}
          >
            {site.hero.subheadline}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: regular, weight: 400, style: "normal" },
        { name: "Inter", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}
