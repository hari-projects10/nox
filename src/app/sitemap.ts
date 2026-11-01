import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site-url";

/* /studio is a stub, kept out until it is real. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL.href,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: new URL("/about", SITE_URL).href,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
