"use client";

import { motion, useMotionValue, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef, useSyncExternalStore } from "react";
import { HeroCashy } from "@/components/home/hero-cashy";

function useReducedMotionPreference() {
  const query = "(prefers-reduced-motion: reduce)";
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false, // matches the server render; flips right after hydration
  );
}

function RevealLine({
  progress,
  range,
  className,
  children,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  className?: string;
  children: React.ReactNode;
}) {
  const opacity = useTransform(progress, range, [0, 1]);
  const y = useTransform(progress, range, [28, 0]);
  const blur = useTransform(progress, range, ["12px", "0px"]);

  return (
    <motion.span className={className} style={{ opacity, y, "--reveal-blur": blur } as never}>
      {children}
    </motion.span>
  );
}

type WhyCard = { title: string; text: string };
type AboutProps = {
  headline: string[];
  story: string[];
  pill: string;
  mascot: string;
  mascotAlt: string;
  printerLabel: string;
  why: { eyebrow: string; cards: WhyCard[]; note: string };
};

/** Puts the pill text (e.g. "denomination 8453") in a small white pill wherever it appears. */
function withPill(text: string, pill: string) {
  const at = text.indexOf(pill);
  if (at === -1) return text;
  return (
    <>
      {text.slice(0, at)}
      <span className="mx-0.5 inline-block rounded-full bg-paper px-2.5 py-0.5 align-[0.08em] font-display text-[0.875em] font-bold text-blue">{pill}</span>
      {text.slice(at + pill.length)}
    </>
  );
}

export function AboutCoin({ headline, story, pill, mascot, mascotAlt, printerLabel, why }: AboutProps) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotionPreference();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "start 5%"] });
  const settled = useMotionValue(1);
  const progress = reduceMotion ? settled : scrollYProgress;
  const step = 0.45 / Math.max(headline.length, 1);

  // The story opens with one big sentence; everything after it is body size.
  const [opening, ...restOfFirst] = story[0].split(/(?<=\.)\s/);

  return (
    <section ref={ref} className="bg-black px-4 py-24 md:px-8 md:py-32">
      <div className="relative isolate mx-auto w-full max-w-[1500px]">
        {/* A soft Base-blue light behind the heading. Static, so nothing to switch off for reduced motion. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-[6%] -left-[8%] -z-10 h-[40%] w-[85%] blur-3xl"
          style={{ background: "radial-gradient(ellipse at 40% 50%, rgb(0 0 255 / 0.42), rgb(0 0 255 / 0.12) 45%, transparent 72%)" }}
        />

        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-8">
          <h2 className="font-display text-[clamp(3.25rem,10.5vw,9rem)] font-semibold leading-[0.98] text-balance text-paper lg:text-[clamp(4rem,7.6vw,9rem)]">
            {headline.map((line, i) => (
              // Blur only from tablet up: it's the one effect here that costs phones frames.
              <RevealLine key={line} progress={progress} range={[i * step, i * step + 0.4]} className="block md:[filter:blur(var(--reveal-blur))]">
                {line}
              </RevealLine>
            ))}
          </h2>
          <HeroCashy src={mascot} alt={mascotAlt} chipLabel={printerLabel} className="mx-auto w-[60%] max-w-[480px] lg:w-full" />
        </div>

        <div className="mt-14 max-w-2xl md:mt-20">
          <RevealLine progress={progress} range={[0.5, 0.8]} className="block">
            <p className="text-lg text-mist md:text-xl">
              <span className="mb-3 block font-display text-[clamp(1.75rem,3vw,2rem)] leading-tight font-semibold text-paper">{opening}</span>
              {restOfFirst.join(" ")}
            </p>
          </RevealLine>
          {story.slice(1).map((paragraph, i) => (
            <RevealLine key={paragraph} progress={progress} range={[0.58 + i * 0.08, Math.min(1, 0.86 + i * 0.06)]} className="mt-5 block text-lg text-mist md:text-xl">
              {withPill(paragraph, pill)}
            </RevealLine>
          ))}
        </div>

        <div className="mt-20 md:mt-28">
          <p className="inline-block rounded-full bg-paper px-3.5 py-1.5 font-display text-sm font-bold tracking-[0.2em] text-blue uppercase">{why.eyebrow}</p>
          <ol className="mt-8 grid gap-5 md:grid-cols-2">
            {why.cards.map((card, i) => (
              <li key={card.title} className="rounded-2xl border border-t-4 border-paper/10 border-t-blue bg-night/60 p-6 md:p-8">
                <span aria-hidden className="block font-display text-5xl leading-none font-bold text-green md:text-6xl">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 font-display text-2xl font-bold text-paper md:text-3xl">{card.title}</h3>
                <p className="mt-3 text-lg text-mist">{card.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-mist">{why.note}</p>
        </div>
      </div>
    </section>
  );
}
