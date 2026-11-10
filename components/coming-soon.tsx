import Link from "next/link";
import { BuyButton } from "@/components/ui/buy-button";
import { FollowLink } from "@/components/ui/follow-link";
import { asset } from "@/lib/utils";

type ComingSoonProps = {
  title: string;
  line: string;
  coming?: string[];
  mascot: string;
  /** Replaces the default Buy / Follow / Back buttons. */
  actions?: React.ReactNode;
};

export function ComingSoon({ title, line, coming = [], mascot, actions }: ComingSoonProps) {
  return (
    <main className="relative isolate flex min-h-svh flex-col overflow-hidden bg-gradient-to-b from-ink via-night to-ink px-4 pb-16 pt-28 md:px-8 md:pt-36">
      <div className="mx-auto grid w-full max-w-[1200px] flex-1 items-center gap-10 md:grid-cols-[1.1fr_0.9fr] md:gap-6">
        <div>
          <h1 className="neon-word text-[clamp(3.5rem,13vw,9rem)]">{title}</h1>
          <p className="neon-word mt-4 text-[clamp(2rem,6vw,3.75rem)]">Coming soon</p>
          <p className="mt-8 max-w-lg text-lg font-semibold text-paper md:text-xl">{line}</p>
          {coming.length > 0 && (
            <ul className="mt-6 flex flex-col gap-2 text-mist">
              {coming.map((item) => (
                <li key={item} className="flex flex-wrap items-baseline gap-x-3">
                  <span>{item}</span>
                  <span className="font-display text-sm font-semibold text-cyan">Coming</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
            {actions ?? (
              <>
                <BuyButton className="h-12 px-6 text-lg" />
                <FollowLink className="h-12 px-6 text-lg" />
                <Link href="/" className="font-display text-lg font-medium text-paper underline decoration-cyan decoration-2 underline-offset-4 transition-colors duration-150 hover:text-cyan">
                  Back to the city
                </Link>
              </>
            )}
          </div>
        </div>

        {/* TODO: final art. Temporary mascot, treatment baked by scripts/bake-mascot.py */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset(mascot)} alt="Cashy, a banknote in sunglasses and a leather jacket, crouching and pointing at you." width={979} height={982} className="mx-auto h-auto w-full max-w-[280px] md:max-w-[460px]" />
      </div>
    </main>
  );
}
