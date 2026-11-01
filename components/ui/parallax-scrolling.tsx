"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";

// Based on the 21st.dev parallax component (Osmo). Same idea, each layer moving at
// its own speed against the scroll, but here the camera sinks out of the night sky
// to a rooftop, so nearer layers travel further. Lenis now lives in SmoothScroll.
// Without JS or with reduced motion the layers simply rest in their final place.
const LAYERS = [
  { layer: "moon", from: 14 },
  { layer: "far", from: 30 },
  { layer: "mid", from: 48 },
  { layer: "word", from: 62 },
  { layer: "near", from: 80 },
];

export function ParallaxComponent({ label, children }: { label: string; children: React.ReactNode }) {
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: root, start: "top 75%", end: "bottom bottom", scrub: true },
      });

      LAYERS.forEach(({ layer, from }) => {
        tl.fromTo(`[data-parallax-layer="${layer}"]`, { yPercent: from }, { yPercent: 0, duration: 1 }, 0);
      });
      // The rooftop arrives last, as the landing.
      tl.fromTo('[data-parallax-layer="roof"]', { yPercent: 100 }, { yPercent: 0, duration: 0.75 }, 0.25);
      // Black from the section above thins out into the night sky.
      tl.fromTo("[data-parallax-wash]", { opacity: 1 }, { opacity: 0, duration: 0.55 }, 0);
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} aria-label={label} className="relative h-[280svh] bg-black">
      <div className="sticky top-0 h-svh overflow-hidden">{children}</div>
    </section>
  );
}
