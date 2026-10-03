import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site-url";

/* The home page only: /studio is a stub, kept out until it is real. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL.href,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
