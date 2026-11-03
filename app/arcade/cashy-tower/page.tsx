import type { Metadata } from "next";
import Link from "next/link";
import { GameFrame } from "@/components/game-frame";
import pages from "@/content/pages.json";

const { description, game } = pages.arcade;

export const metadata: Metadata = { title: game.title, description };

export default function CashyTowerPage() {
  return (
    <main className="min-h-svh bg-gradient-to-b from-ink via-night to-ink px-4 pb-16 pt-24 md:px-8 md:pt-28">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h1 className="neon-word text-[clamp(2.25rem,6vw,3.5rem)]">{game.title}</h1>
          <Link href="/arcade" className="font-display text-lg font-medium text-paper underline decoration-cyan decoration-2 underline-offset-4 transition-colors duration-150 hover:text-cyan">
            {game.backLabel}
          </Link>
        </div>

        <GameFrame src={game.embedUrl} title={game.title} />

        <p className="mx-auto max-w-xl text-center text-mist">{game.hint}</p>
        <p className="mx-auto max-w-xl text-center text-sm text-mist/80 lg:hidden">{game.phoneNote}</p>
      </div>
    </main>
  );
}
