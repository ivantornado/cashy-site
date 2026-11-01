"use client";

import { motion, useMotionValue, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useRef, useSyncExternalStore } from "react";

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

export function AboutCoin({ headline, support }: { headline: string[]; support: string }) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotionPreference();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "center 45%"] });
  const settled = useMotionValue(1);
  const progress = reduceMotion ? settled : scrollYProgress;
  const step = 0.55 / Math.max(headline.length, 1);

  return (
    <section ref={ref} className="flex min-h-[120svh] flex-col justify-center bg-black px-4 py-24 md:px-8">
      <div className="mx-auto w-full max-w-[1500px]">
        <h2 className="font-display text-[clamp(3.25rem,10.5vw,10.5rem)] font-semibold leading-[0.98] text-balance text-paper">
          {headline.map((line, i) => (
            // Blur only from tablet up: it's the one effect here that costs phones frames.
            <RevealLine key={line} progress={progress} range={[i * step, i * step + 0.45]} className="block md:[filter:blur(var(--reveal-blur))]">
              {line}
            </RevealLine>
          ))}
        </h2>
        <RevealLine progress={progress} range={[0.6, 1]} className="mt-8 block max-w-xl text-lg text-mist md:text-xl">
          {support}
        </RevealLine>
      </div>
    </section>
  );
}
