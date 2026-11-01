import type { Metadata } from "next";
import pages from "@/content/pages.json";
import roadmap from "@/content/roadmap.json";
import { cn } from "@/lib/utils";

const { title, description, line } = pages.roadmap;

export const metadata: Metadata = { title, description };

const lineColours: Record<string, { rail: string; text: string }> = {
  cyan: { rail: "bg-cyan", text: "text-cyan" },
  magenta: { rail: "bg-magenta", text: "text-magenta" },
  yellow: { rail: "bg-hoodie", text: "text-hoodie" },
};

const statusLabels: Record<string, string> = {
  done: "Done",
  "in-progress": "In progress",
  next: "Next",
};

export default function RoadmapPage() {
  return (
    <main className="min-h-svh bg-gradient-to-b from-ink via-night to-ink px-4 pb-24 pt-32 md:px-8 md:pt-40">
      <div className="mx-auto max-w-3xl">
        <h1 className="neon-word text-[clamp(3.5rem,13vw,8rem)]">{title}</h1>
        <p className="mt-6 text-lg font-semibold text-mist md:text-xl">{line}</p>

        <div className="mt-16 flex flex-col gap-14 md:mt-20">
          {roadmap.map((section) => {
            const colour = lineColours[section.colour];
            return (
              <section key={section.phase} className="relative pl-10 md:pl-14">
                <span aria-hidden className={cn("absolute bottom-1 left-[9px] top-1 w-1.5 rounded-full", colour.rail)} />
                <h2 className="font-display text-3xl font-semibold text-paper md:text-4xl">
                  <span className={colour.text}>{section.phase}</span> {section.title}
                </h2>
                <ul className="mt-6 flex flex-col gap-5">
                  {section.items.map((item) => (
                    <li key={item.text} className="relative flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                      <span
                        aria-hidden
                        className={cn(
                          "absolute -left-[39px] top-1 size-5 rounded-full border-[3px] border-ink ring-[3px] md:-left-[55px]",
                          item.status === "next" ? "bg-ink" : "bg-paper",
                          section.colour === "cyan" && "ring-cyan",
                          section.colour === "magenta" && "ring-magenta",
                          section.colour === "yellow" && "ring-hoodie",
                        )}
                      />
                      <span className="text-lg text-paper">{item.text}</span>
                      <span className={cn("font-display text-sm font-semibold", item.status === "next" ? "text-mist" : colour.text)}>
                        {statusLabels[item.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
