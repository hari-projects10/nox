import type { Metadata } from "next";

import { Hero } from "@/components/hero/hero";
import { IntroSnap } from "@/components/providers/intro-snap";
import { Capabilities } from "@/components/sections/capabilities";
import { Deployments } from "@/components/sections/deployments";
import { Labs } from "@/components/sections/labs";

/* One address for the home page, whichever domain or alias it is reached on. */
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <main>
      <IntroSnap targets={["#services-stage", "#work"]} />

      <Hero />

      <Capabilities />

      <Deployments />

      <Labs />
    </main>
  );
}
