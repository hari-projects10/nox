import { ImageResponse } from "next/og";

import { ARCS } from "@/components/layout/logo";

/*
 * Home-screen and Safari icon. Safari does not use the SVG favicon
 * (app/icon.svg) there, so it gets the same mark as a PNG on the site's
 * ground; iOS rounds the corners itself.
 */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f9f9f9",
        }}
      >
        {/* The favicon's own crop of the mark. */}
        <svg width={118} height={118} viewBox="4 2 96 96">
          <g fill="none" stroke="#0A0F1E" strokeWidth={7.5} strokeLinecap="round">
            {ARCS.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          <circle cx={88} cy={50} r={6.5} fill="#0E9C98" />
        </svg>
      </div>
    ),
    size,
  );
}
