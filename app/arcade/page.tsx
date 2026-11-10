import type { Metadata } from "next";
import Link from "next/link";
import { BuyButton } from "@/components/ui/buy-button";
import { FollowLink } from "@/components/ui/follow-link";
import pages from "@/content/pages.json";
import { asset } from "@/lib/utils";

const { title, description, line, coming, mascot, mascotAlt, games } = pages.arcade;

export const metadata: Metadata = { title, description };

export default function ArcadePage() {
  return (
    <main className="relative isolate flex min-h-svh flex-col overflow-hidden bg-gradient-to-b from-ink via-night to-ink px-4 pb-16 pt-28 md:px-8 md:pt-36">
      <div className="mx-auto grid w-full max-w-[1200px] flex-1 items-center gap-10 md:grid-cols-[1.1fr_0.9fr] md:gap-6">
        <div>
          <h1 className="neon-word text-[clamp(3.5rem,13vw,9rem)]">{title}</h1>
          <p className="mt-6 max-w-lg text-lg font-semibold text-paper md:text-xl">{line}</p>

          {/* The cabinet's signs: one card per game, each with the way in. */}
          <div className="mt-8 grid max-w-xl gap-5">
            {games.map((game) => (
              <section key={game.id} aria-labelledby={`${game.id}-title`} className="rounded-2xl border-[3px] border-blue bg-ink/85 p-6 shadow-[0_4px_36px_rgb(2_79_246_/_0.5)] md:p-7">
                <p className="neon-flicker inline-block rounded-md bg-blue px-2.5 py-1 font-display text-sm font-semibold tracking-widest text-paper uppercase">{game.tag}</p>
                <h2 id={`${game.id}-title`} className="neon-word mt-2 text-[clamp(2.25rem,7vw,3.75rem)]">
                  {game.title}
                </h2>
                <p className="mt-3 text-lg text-paper">{game.line}</p>
                <Link href={game.playHref} className="btn-buy mt-5 h-12 px-8 text-lg">
                  {game.playLabel}
                </Link>
              </section>
            ))}
          </div>

          <ul className="mt-8 flex flex-col gap-2 text-mist">
            {coming.map((item) => (
              <li key={item} className="flex flex-wrap items-baseline gap-x-3">
                <span>{item}</span>
                <span className="font-display text-sm font-semibold text-cyan">Coming</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
            <BuyButton className="h-12 px-6 text-lg" />
            <FollowLink className="h-12 px-6 text-lg" />
            <Link href="/" className="font-display text-lg font-medium text-paper underline decoration-cyan decoration-2 underline-offset-4 transition-colors duration-150 hover:text-cyan">
              Back to the city
            </Link>
          </div>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset(mascot)} alt={mascotAlt} width={920} height={1030} className="mx-auto h-auto w-full max-w-[300px] md:max-w-[460px]" />
      </div>
    </main>
  );
}
