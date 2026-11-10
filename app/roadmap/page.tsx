import type { Metadata } from "next";
import { MetroMap } from "@/components/roadmap/metro-map";
import pages from "@/content/pages.json";
import roadmap from "@/content/roadmap.json";

const { title, description, line } = pages.roadmap;

export const metadata: Metadata = { title, description };

export default function RoadmapPage() {
  return (
    <main className="min-h-svh bg-gradient-to-b from-ink via-night to-ink px-4 pb-24 pt-32 md:px-8 md:pt-40">
      <div className="mx-auto max-w-[1200px]">
        <h1 className="neon-word text-[clamp(3.5rem,13vw,8rem)]">{title}</h1>
        <p className="mt-6 mb-12 text-lg font-semibold text-mist md:text-xl">{line}</p>
        <MetroMap lines={roadmap} />
      </div>
    </main>
  );
}
