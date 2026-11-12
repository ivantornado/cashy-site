"use client";

import { useEffect, useRef, useState } from "react";
import { asset, cn } from "@/lib/utils";

type Status = "done" | "in-progress" | "next" | "maybe";
type Stop = { when: string; text: string; detail: string; status: string; unlocks?: string };
type Line = { phase: string; title: string; period: string; colour: string; items: Stop[] };

/** Base palette only: one strong blue, a lighter one, a pale dashed one. */
const COLOURS: Record<string, string> = { blue: "#0000ff", light: "#4d4dff", pale: "#c7c7ff" };
const DASHED = new Set(["pale"]);
const STATUS: Record<Status, string> = { done: "Done", "in-progress": "In progress", next: "Next", maybe: "Maybe" };

// The drawn map: three rows that snake like a metro line (left to right, back, then right again).
const W = 1200;
const H = 600;
const ROWS = [120, 300, 480];
const START = 150;
const END = 1050;

function stopX(line: number, index: number, count: number) {
  const x = START + (index * (END - START)) / Math.max(1, count - 1);
  return line === 1 ? START + END - x : x; // the middle line runs right to left
}

function statusOf(stop: Stop): Status {
  return (stop.status in STATUS ? stop.status : "next") as Status;
}

/** The stop marker: a circle, or a rounded square when the stop unlocks a Base City building. */
function Marker({ stop, colour }: { stop: Stop; colour: string }) {
  const status = statusOf(stop);
  const filled = status === "done" || status === "in-progress";
  return (
    <span
      aria-hidden
      className={cn("relative grid size-[26px] place-items-center border-4", stop.unlocks ? "rounded-md" : "rounded-full", status === "maybe" && "border-dashed")}
      style={{ borderColor: colour, background: filled ? colour : status === "next" ? "#f2f4f8" : "#070b24" }}
    >
      {status === "in-progress" && (
        <span className={cn("absolute -inset-2 animate-ping border-2 motion-reduce:animate-none", stop.unlocks ? "rounded-lg" : "rounded-full")} style={{ borderColor: colour }} />
      )}
      {status === "done" && (
        <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 6.5l2.2 2.2L9.5 3.5" />
        </svg>
      )}
    </span>
  );
}

function Progress({ line, colour }: { line: Line; colour: string }) {
  const done = line.items.filter((s) => s.status === "done").length;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-mist">
        {done} of {line.items.length} done
      </span>
      <span className="h-1 w-full overflow-hidden rounded-full bg-paper/10">
        <span className="block h-full rounded-full" style={{ width: `${(done / line.items.length) * 100}%`, background: colour }} />
      </span>
    </div>
  );
}

type Picked = { line: number; index: number } | null;

export function MetroMap({ lines }: { lines: Line[] }) {
  const [picked, setPicked] = useState<Picked>(null);
  const [hoverLine, setHoverLine] = useState<number | null>(null);
  const [tab, setTab] = useState(0);
  const opener = useRef<HTMLElement | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  const open = (line: number, index: number, from: HTMLElement) => {
    opener.current = from;
    setPicked({ line, index });
  };
  const close = () => {
    setPicked(null);
    opener.current?.focus();
  };

  // Escape closes the panel; focus goes into it on open and back to the stop on close.
  useEffect(() => {
    if (!picked) return;
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setPicked(null);
      opener.current?.focus();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [picked]);

  const here = { line: lines.findIndex((l) => l.items.some((s) => s.status === "in-progress")), index: -1 };
  if (here.line >= 0) here.index = lines[here.line].items.findIndex((s) => s.status === "in-progress");

  const pickedLine = picked ? lines[picked.line] : null;
  const pickedStop = picked && pickedLine ? pickedLine.items[picked.index] : null;

  return (
    <div className="flex flex-col gap-8">
      {/* Legend */}
      <ul className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-mist">
        {(["in-progress", "next", "maybe", "done"] as Status[]).map((s) => (
          <li key={s} className="flex items-center gap-2.5">
            <Marker stop={{ when: "", text: "", detail: "", status: s }} colour={COLOURS.blue} />
            {STATUS[s]}
          </li>
        ))}
        <li className="flex items-center gap-2.5">
          <Marker stop={{ when: "", text: "", detail: "", status: "next", unlocks: "x" }} colour={COLOURS.blue} />
          Unlocks a Base City building
        </li>
      </ul>

      {/* Desktop: the drawn map */}
      <div className="hidden rounded-2xl border border-blue/30 bg-[#070b24] p-6 lg:block">
        <div className="grid grid-cols-3 gap-8">
          {lines.map((line, i) => (
            <div key={line.phase} className={cn("flex flex-col gap-2 transition-opacity duration-200", hoverLine !== null && hoverLine !== i && "opacity-40")}>
              <span className="font-display text-lg font-bold text-paper">
                <span style={{ color: COLOURS[line.colour] }}>{line.phase}</span> {line.title}
              </span>
              <span className="text-sm text-mist">{line.period}</span>
              <Progress line={line} colour={COLOURS[line.colour]} />
            </div>
          ))}
        </div>

        <div className="relative mt-6 w-full" style={{ aspectRatio: `${W} / ${H}` }}>
          <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden>
            {lines.map((line, i) => {
              const y = ROWS[i];
              const colour = COLOURS[line.colour];
              const dash = DASHED.has(line.colour) ? "16 12" : undefined;
              const dim = hoverLine !== null && hoverLine !== i ? 0.3 : 1;
              // Each line also draws the bend that leads into it from the line before.
              const bend = i === 1 ? `M ${END + 50} ${ROWS[0]} C ${END + 130} ${ROWS[0]} ${END + 130} ${y} ${END + 50} ${y}` : i === 2 ? `M ${START - 50} ${ROWS[1]} C ${START - 130} ${ROWS[1]} ${START - 130} ${y} ${START - 50} ${y}` : null;
              return (
                <g key={line.phase} opacity={dim} style={{ transition: "opacity 200ms" }}>
                  {bend && <path d={bend} fill="none" stroke={colour} strokeWidth={8} strokeLinecap="round" strokeDasharray={dash} />}
                  <path d={`M ${START - 50} ${y} H ${END + 50}`} fill="none" stroke={colour} strokeWidth={hoverLine === i ? 11 : 8} strokeLinecap="round" strokeDasharray={dash} style={{ transition: "stroke-width 200ms" }} />
                </g>
              );
            })}
          </svg>

          {lines.map((line, i) =>
            line.items.map((stop, k) => {
              const x = stopX(i, k, line.items.length);
              const y = ROWS[i];
              const width = ((END - START) / Math.max(1, line.items.length - 1)) * 0.92;
              const isHere = here.line === i && here.index === k;
              const dim = hoverLine !== null && hoverLine !== i;
              return (
                <div key={`${line.phase}-${k}`} className={cn("transition-opacity duration-200", dim && "opacity-40")}>
                  {isHere && (
                    <span className="absolute -translate-x-1/2 rounded-full bg-paper px-2.5 py-1 font-display text-xs font-bold whitespace-nowrap text-blue" style={{ left: `${(x / W) * 100}%`, top: `${((y - 58) / H) * 100}%` }}>
                      You are here
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={`${stop.text}, ${stop.when}, ${STATUS[statusOf(stop)]}${stop.unlocks ? `, unlocks ${stop.unlocks}` : ""}`}
                    onClick={(e) => open(i, k, e.currentTarget)}
                    onMouseEnter={() => setHoverLine(i)}
                    onMouseLeave={() => setHoverLine(null)}
                    onFocus={() => setHoverLine(i)}
                    onBlur={() => setHoverLine(null)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-lg p-1.5 transition-transform duration-150 hover:scale-125 focus-visible:scale-125"
                    style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }}
                  >
                    <Marker stop={stop} colour={COLOURS[line.colour]} />
                  </button>
                  <div className="pointer-events-none absolute -translate-x-1/2 text-center" style={{ left: `${(x / W) * 100}%`, top: `${((y + 26) / H) * 100}%`, width: `${(width / W) * 100}%` }}>
                    <span className="block font-display text-[11px] font-bold tracking-wider text-mist uppercase">
                      {stop.when} · {STATUS[statusOf(stop)]}
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-snug font-semibold text-paper">{stop.text}</span>
                  </div>
                </div>
              );
            }),
          )}
        </div>
      </div>

      {/* Phones and tablets: one line at a time, drawn top to bottom */}
      <div className="lg:hidden">
        <div role="tablist" aria-label="Roadmap lines" className="flex gap-2">
          {lines.map((line, i) => (
            <button
              key={line.phase}
              type="button"
              role="tab"
              id={`roadmap-tab-${i}`}
              aria-selected={tab === i}
              aria-controls={`roadmap-panel-${i}`}
              onClick={() => setTab(i)}
              className="flex-1 rounded-lg border border-paper/25 px-3 py-2.5 font-display text-sm font-semibold text-paper transition-colors duration-150 aria-selected:border-blue aria-selected:bg-blue"
            >
              {line.phase}
            </button>
          ))}
        </div>
        {lines.map((line, i) => {
          const colour = COLOURS[line.colour];
          return (
            <div key={line.phase} role="tabpanel" id={`roadmap-panel-${i}`} aria-labelledby={`roadmap-tab-${i}`} hidden={tab !== i} className="mt-5 rounded-2xl border border-blue/30 bg-[#070b24] p-5">
              <span className="font-display text-lg font-bold text-paper">
                <span style={{ color: colour }}>{line.phase}</span> {line.title}
              </span>
              <span className="mt-1 block text-sm text-mist">{line.period}</span>
              <div className="mt-3">
                <Progress line={line} colour={colour} />
              </div>
              <ul className="relative mt-6 flex flex-col gap-6 pl-12">
                <span aria-hidden className={cn("absolute top-3 bottom-3 left-[18px] border-l-[6px]", DASHED.has(line.colour) && "border-dashed")} style={{ borderColor: colour }} />
                {line.items.map((stop, k) => (
                  <li key={k} className="relative">
                    <button
                      type="button"
                      aria-label={`${stop.text}, ${stop.when}, ${STATUS[statusOf(stop)]}${stop.unlocks ? `, unlocks ${stop.unlocks}` : ""}`}
                      onClick={(e) => open(i, k, e.currentTarget)}
                      className="absolute top-0 -left-12 rounded-lg p-1.5"
                    >
                      <Marker stop={stop} colour={colour} />
                    </button>
                    <span className="block font-display text-[11px] font-bold tracking-wider text-mist uppercase">
                      {stop.when} · {STATUS[statusOf(stop)]}
                    </span>
                    <span className="mt-0.5 block font-semibold text-paper">{stop.text}</span>
                    {here.line === i && here.index === k && <span className="mt-1.5 inline-block rounded-full bg-paper px-2.5 py-1 font-display text-xs font-bold text-blue">You are here</span>}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Detail: a side panel on desktop, a bottom sheet on phones */}
      {pickedStop && pickedLine && (
        <section
          role="dialog"
          aria-labelledby="roadmap-stop-title"
          className="fixed inset-x-0 bottom-0 z-40 max-h-[75svh] overflow-y-auto rounded-t-2xl border border-blue/40 bg-ink p-6 lg:inset-x-auto lg:top-24 lg:right-6 lg:bottom-auto lg:max-h-[calc(100svh-8rem)] lg:w-[400px] lg:rounded-2xl"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-md px-2 py-1 font-display text-xs font-bold tracking-wider text-ink uppercase" style={{ background: COLOURS[pickedLine.colour] }}>
              {pickedLine.phase} · {pickedLine.title}
            </span>
            <button ref={closeButton} type="button" aria-label="Close" onClick={close} className="rounded-md px-2 text-2xl leading-none text-mist transition-colors duration-150 hover:text-paper">
              ✕
            </button>
          </div>
          <h2 id="roadmap-stop-title" className="mt-4 font-display text-2xl font-bold text-paper">
            {pickedStop.text}
          </h2>
          <p className="mt-1 text-sm text-mist">
            {pickedStop.when} · {STATUS[statusOf(pickedStop)]}
          </p>
          <h3 className="mt-5 font-display text-xs font-bold tracking-wider text-mist uppercase">What’s planned</h3>
          <p className="mt-2 leading-relaxed text-paper">{pickedStop.detail}</p>
          {pickedStop.unlocks && (
            <div className="mt-5 rounded-xl border border-blue/40 p-4">
              <p className="text-paper">
                Unlocks in Base City: <strong>{pickedStop.unlocks}</strong>
              </p>
              {/* Base City is its own full-screen page, so a plain link rather than the in-app router. */}
              <a href={asset("/base-city/")} className="text-link mt-2 inline-block text-sm font-semibold">
                Enter Base City
              </a>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
