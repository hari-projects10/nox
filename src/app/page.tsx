import { Hero } from "@/components/hero/hero";
import { IntroSnap } from "@/components/providers/intro-snap";
import { Capabilities } from "@/components/sections/capabilities";
import { Deployments } from "@/components/sections/deployments";
import { Labs } from "@/components/sections/labs";

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
