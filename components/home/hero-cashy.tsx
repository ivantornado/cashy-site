"use client";

import { useEffect, useRef } from "react";
import { asset, cn } from "@/lib/utils";

/** Things the printer feeds out: banknotes and NVDA chips, each with its own lane, delay and tilt. */
const PRINTS = [
  { kind: "note", x: 18, delay: 0, tilt: -14 },
  { kind: "chip", x: 44, delay: 0.8, tilt: 10 },
  { kind: "note", x: 30, delay: 1.6, tilt: 18 },
  { kind: "chip", x: 8, delay: 2.4, tilt: -8 },
  { kind: "note", x: 52, delay: 3.2, tilt: -20 },
  { kind: "chip", x: 24, delay: 4, tilt: 14 },
] as const;

function Note() {
  return (
    <svg viewBox="0 0 52 28" width="52" height="28" aria-hidden>
      <rect x="1" y="1" width="50" height="26" rx="3" fill="#a9dd8c" stroke="#2f5a24" strokeWidth="2" />
      <rect x="5" y="5" width="42" height="18" rx="2" fill="none" stroke="#2f5a24" strokeWidth="1" opacity="0.6" />
      <circle cx="26" cy="14" r="6.5" fill="#2f5a24" />
      <text x="26" y="18" textAnchor="middle" fontSize="11" fontWeight="700" fill="#a9dd8c" fontFamily="system-ui, sans-serif">
        $
      </text>
    </svg>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 44 44" width="44" height="44" aria-hidden>
      <g stroke="#c7c7ff" strokeWidth="2.5" strokeLinecap="round">
        {[13, 22, 31].map((p) => (
          <g key={p}>
            <path d={`M${p} 2v5M${p} 37v5M2 ${p}h5M37 ${p}h5`} />
          </g>
        ))}
      </g>
      <rect x="7" y="7" width="30" height="30" rx="4" fill="#0b1330" stroke="#a9dd8c" strokeWidth="2" />
      <text x="22" y="25.5" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#a9dd8c" fontFamily="system-ui, sans-serif" letterSpacing="0.3">
        {label}
      </text>
    </svg>
  );
}

function Printer() {
  return (
    <svg viewBox="0 0 120 92" className="w-full" aria-hidden>
      {/* paper slot on top, where the prints come out */}
      <rect x="22" y="6" width="76" height="12" rx="4" fill="#05070d" stroke="#4d4dff" strokeWidth="2.5" />
      <rect x="6" y="16" width="108" height="62" rx="12" fill="#0b1330" stroke="#0000ff" strokeWidth="3" />
      <rect x="18" y="30" width="56" height="12" rx="3" fill="#141f52" />
      <text x="46" y="39.5" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#c7c7ff" fontFamily="system-ui, sans-serif" letterSpacing="1">
        8453
      </text>
      <circle cx="94" cy="36" r="5" fill="#a9dd8c" className="hero-cashy-led" />
      <path d="M18 56h84" stroke="#4d4dff" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      <rect x="14" y="74" width="16" height="10" rx="2" fill="#05070d" />
      <rect x="90" y="74" width="16" height="10" rx="2" fill="#05070d" />
    </svg>
  );
}

/**
 * Cashy beside the home headline: a gentle bob, a lean towards the Buy button every few seconds,
 * and a little printer feeding out banknotes and NVDA chips. All CSS, paused off-screen,
 * and a still frame for reduced motion.
 */
export function HeroCashy({ src, alt, chipLabel, className }: { src: string; alt: string; chipLabel: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => el.classList.toggle("is-paused", !entry.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn("hero-cashy is-paused relative isolate", className)}>
      {/* soft Base-blue light behind him, like the one behind the headline */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-[-12%] -z-10 blur-3xl"
        style={{ background: "radial-gradient(ellipse at 50% 45%, rgb(0 0 255 / 0.5), rgb(0 0 255 / 0.14) 48%, transparent 72%)" }}
      />
      <div className="hero-cashy-bob">
        <div className="hero-cashy-lean">
          {/* TODO: final art. Nikita's new-look poses (idle, blink, side-eye, point) replace this one picture. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset(src)} alt={alt} width={900} height={925} loading="lazy" decoding="async" className="h-auto w-full [mask-image:linear-gradient(to_bottom,#000_80%,transparent)]" />
        </div>
      </div>

      <div aria-hidden className="absolute -right-[9%] bottom-[3%] w-[25%]">
        <div className="absolute inset-x-0 bottom-[78%] h-0">
          {PRINTS.map((p, i) => (
            <span
              key={i}
              className="hero-cashy-print absolute bottom-0 left-1/2"
              style={{ "--x": `${p.x}px`, "--tilt": `${p.tilt}deg`, animationDelay: `${p.delay}s` } as React.CSSProperties}
            >
              {p.kind === "note" ? <Note /> : <Chip label={chipLabel} />}
            </span>
          ))}
        </div>
        <Printer />
      </div>
    </div>
  );
}
