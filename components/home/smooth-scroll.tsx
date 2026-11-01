"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useEffect } from "react";
import { isHeroLocked, isMenuOpen, subscribeScrollState } from "@/lib/scroll-state";

// Runs Lenis only while the hero is unlocked, so the two never fight over the wheel.
export function SmoothScroll() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let lenis: Lenis | null = null;
    const tick = (time: number) => lenis?.raf(time * 1000);

    function sync() {
      if (isHeroLocked()) {
        if (lenis) {
          lenis.destroy();
          lenis = null;
          gsap.ticker.remove(tick);
        }
        return;
      }
      if (!lenis) {
        lenis = new Lenis();
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
        // The page was pinned until now, so every trigger position needs measuring again.
        ScrollTrigger.refresh();
      }
      if (isMenuOpen()) lenis.stop();
      else lenis.start();
    }

    sync();
    const unsubscribe = subscribeScrollState(sync);

    return () => {
      unsubscribe();
      gsap.ticker.remove(tick);
      lenis?.destroy();
    };
  }, []);

  return null;
}
