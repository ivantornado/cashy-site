import type { Metadata } from "next";
import Link from "next/link";
import { BuyButton } from "@/components/ui/buy-button";
import { FollowLink } from "@/components/ui/follow-link";
import pages from "@/content/pages.json";
import { asset } from "@/lib/utils";

const { title, description, line, coming, mascot, game } = pages.arcade;

export const metadata: Metadata = { title, description };

export default function ArcadePage() {
  return (
    <main className="relative isolate flex min-h-svh flex-col overflow-hidden bg-gradient-to-b from-ink via-night to-ink px-4 pb-16 pt-28 md:px-8 md:pt-36">
      <div className="mx-auto grid w-full max-w-[1200px] flex-1 items-center gap-10 md:grid-cols-[1.1fr_0.9fr] md:gap-6">
        <div>
          <h1 className="neon-word text-[clamp(3.5rem,13vw,9rem)]">{title}</h1>
          <p className="mt-6 max-w-lg text-lg font-semibold text-paper md:text-xl">{line}</p>

          {/* The cabinet's sign: one game for now, with the way in. */}
          <section aria-labelledby="game-title" className="mt-8 max-w-xl rounded-2xl border-[3px] border-blue bg-ink/85 p-6 shadow-[0_4px_36px_rgb(2_79_246_/_0.5)] md:p-8">
            <p className="neon-flicker inline-block rounded-md bg-blue px-2.5 py-1 font-display text-sm font-semibold tracking-widest text-paper uppercase">{game.tag}</p>
            <h2 id="game-title" className="neon-word mt-2 text-[clamp(2.5rem,8vw,4.5rem)]">
              {game.title}
            </h2>
            <p className="mt-4 text-lg text-paper">{game.line}</p>
            <Link href={game.playHref} className="btn-buy mt-6 h-12 px-8 text-lg">
              {game.playLabel}
            </Link>
          </section>

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

        {/* TODO: final art. Temporary mascot, treatment baked by scripts/bake-mascot.py */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset(mascot)} alt="Cashy, a banknote in sunglasses and a leather jacket, crouching and pointing at you." width={979} height={982} className="mx-auto h-auto w-full max-w-[280px] md:max-w-[460px]" />
      </div>
    </main>
  );
}
