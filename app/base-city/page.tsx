import type { Metadata } from "next";
import { BaseCity } from "@/components/base-city/base-city";
import content from "@/content/base-city.json";

export const metadata: Metadata = { title: content.title, description: content.description };

export default function BaseCityPage() {
  return (
    <main className="min-h-svh bg-gradient-to-b from-ink via-night to-ink px-4 pb-16 pt-24 md:px-8 md:pt-28">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5">
        <div className="flex flex-col gap-3">
          <h1 className="neon-word text-[clamp(2.75rem,8vw,5.5rem)]">{content.title}</h1>
          <p className="max-w-2xl text-lg text-mist">{content.line}</p>
        </div>
        <BaseCity />
        {content.credit && <p className="text-center text-sm text-mist/80">{content.credit}</p>}
      </div>
    </main>
  );
}
