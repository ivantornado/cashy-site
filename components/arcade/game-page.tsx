import Link from "next/link";
import { GameFrame } from "@/components/game-frame";
import pages from "@/content/pages.json";

type Game = (typeof pages.arcade.games)[number];

/** One game, embedded in the page so visitors never leave Cashy. The same page serves every game in the Arcade. */
export function GamePage({ game }: { game: Game }) {
  return (
    <main className="min-h-svh bg-gradient-to-b from-ink via-night to-ink px-4 pb-16 pt-[4.75rem] md:px-8 md:pt-[5.75rem]">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5">
        <GameFrame src={game.embedUrl} title={game.title} />

        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h1 className="neon-word text-[clamp(2.25rem,6vw,3.5rem)]">{game.title}</h1>
          <Link href="/arcade" className="text-link text-lg">
            {pages.arcade.backLabel}
          </Link>
        </div>

        <p className="max-w-xl text-mist">{game.hint}</p>
        {"phoneNote" in game && <p className="max-w-xl text-sm text-mist/80 lg:hidden">{game.phoneNote}</p>}
      </div>
    </main>
  );
}
