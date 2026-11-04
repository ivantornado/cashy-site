import { BuyButton } from "@/components/ui/buy-button";
import { FollowLink } from "@/components/ui/follow-link";
import { cn } from "@/lib/utils";

type HypeProps = {
  eyebrow: string;
  title: string;
  lede: string;
  points: { title: string; text: string }[];
};

/** Each point gets one of the site's three lights along its top edge. */
const accents = ["border-t-cyan", "border-t-base", "border-t-magenta"];

export function Hype({ eyebrow, title, lede, points }: HypeProps) {
  return (
    <section className="bg-black px-4 py-24 md:px-8 md:py-32">
      <div className="mx-auto w-full max-w-[1500px]">
        <p className="font-display text-sm font-bold tracking-[0.2em] text-cyan uppercase">{eyebrow}</p>
        <h2 className="neon-word mt-5 text-[clamp(3rem,9vw,8rem)] text-balance">{title}</h2>
        <p className="mt-8 max-w-2xl text-lg text-mist md:text-xl">{lede}</p>

        <ul className="mt-14 grid gap-5 md:grid-cols-3">
          {points.map((point, i) => (
            <li key={point.title} className={cn("rounded-2xl border border-t-4 border-paper/10 bg-night/60 p-6 md:p-8", accents[i % accents.length])}>
              <h3 className="font-display text-2xl font-bold text-paper md:text-3xl">{point.title}</h3>
              <p className="mt-3 text-lg text-mist">{point.text}</p>
            </li>
          ))}
        </ul>

        <div className="mt-14 flex flex-wrap items-center gap-x-6 gap-y-4">
          <BuyButton className="h-14 px-8 text-xl" />
          <FollowLink className="h-14 px-7 text-lg" />
        </div>
      </div>
    </section>
  );
}
