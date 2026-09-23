import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* No floating dev badge over the bottom-left of the design. */
  devIndicators: false,
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
        /* The model and runtime are write-once and heavy; only the demo
           markup should ever need revalidating. */
        source: "/demos/:path*.:ext(glb|jpg|jpeg|png|svg|woff2)",
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
        ],
      },
    ];
  },
  images: {
    /* AVIF first: same picture, materially fewer bytes. */
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
