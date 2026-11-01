import Link from "next/link";
import { FarSkyline, MidSkyline, Moon } from "@/components/home/skyline-art";
import { BuyButton } from "@/components/ui/buy-button";

export function ComingSoon({ title, line }: { title: string; line: string }) {
  return (
    <main className="relative isolate flex min-h-svh flex-col items-center overflow-hidden bg-gradient-to-b from-ink via-night to-[#3a1b6e] px-4 pb-16 pt-32 text-center md:pt-40">
      <div aria-hidden className="absolute inset-0 -z-10">
        <Moon className="absolute inset-0 size-full opacity-70" />
        <FarSkyline className="absolute inset-0 size-full" />
        <MidSkyline className="absolute inset-0 size-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
      </div>

      <h1 className="neon-word text-[clamp(3.5rem,15vw,11rem)]">{title}</h1>
      <p className="neon-flicker mt-8 rounded-xl border-[3px] border-magenta bg-ink/85 px-6 py-3 font-display text-2xl font-semibold tracking-wide text-magenta shadow-[0_4px_28px_rgb(255_43_214_/_0.55)] md:text-3xl">
        Coming soon
      </p>
      <p className="mt-6 max-w-md text-lg font-semibold text-paper">{line}</p>

      <div className="mt-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-4 pt-16">
        <BuyButton className="h-12 px-6 text-lg" />
        <Link href="/" className="font-display text-lg font-medium text-paper underline decoration-cyan decoration-2 underline-offset-4 transition-colors duration-150 hover:text-cyan">
          Back to the city
        </Link>
      </div>
    </main>
  );
}
