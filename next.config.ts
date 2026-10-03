import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

const nextConfig: NextConfig = {
  /* No floating dev badge over the bottom-left of the design. */
  devIndicators: false,
  /* Don't advertise the framework in every response header. */
  poweredByHeader: false,
  /* Pull only the icons and helpers actually referenced, instead of the
     whole barrel file, out of these packages. */
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  /*
   * Files in public/ are not fingerprinted, so Next serves them
   * must-revalidate by default: every visit re-checks 26MB of video. These
   * are write-once assets, so let the CDN and the browser keep them.
   */
  async headers() {
    return [
      {
        /* Baseline hardening. SAMEORIGIN still lets the page frame its own
           demos; nothing on the site uses the camera, mic or location. */
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/videos/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/demos/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
          /* The demos are seen inside the site, never as search results. */
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
      {
        /* The model and images are write-once and heavy; only the demo
           markup and scripts should ever need revalidating. Listed after the
           rule above on purpose: when two rules set the same header, the
           later one wins. */
        source: "/demos/:path*.:ext(glb|jpg|jpeg|png|svg|woff2)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
  images: {
    /* AVIF first: same picture, materially fewer bytes. Local images only:
       an allowed remote host would let anyone spend the optimisation quota
       on it through /_next/image. */
    formats: ["image/avif", "image/webp"],
  },
};

/* BotID proxies its challenge through this domain, so it can't be told
   apart from the site itself (see src/instrumentation-client.ts). */
export default withBotId(nextConfig);
