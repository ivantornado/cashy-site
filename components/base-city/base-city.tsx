"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import content from "@/content/base-city.json";
import type { BaseCityScene } from "@/lib/base-city/scene";
import { cn } from "@/lib/utils";

type Info = { name: string; tag: string; text: string; href?: string; hrefLabel?: string };
const info = content.info as Record<string, Info>;

const toggle = "rounded-lg border border-paper/40 bg-ink/70 px-3 py-2.5 font-display text-[13px] font-medium text-paper backdrop-blur-sm transition-colors duration-150 hover:bg-paper/15 aria-pressed:bg-paper aria-pressed:text-ink";

/** The 3D city: the scene fills the frame and the controls float over it. The 3D code loads only when this page opens. */
export function BaseCity() {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<BaseCityScene | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [stage, setStage] = useState(3);
  const [selected, setSelected] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [touring, setTouring] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [mstr, setMstr] = useState(0);
  const [paydays, setPaydays] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: BaseCityScene | undefined;
    import("@/lib/base-city/scene").then(({ createBaseCity }) => {
      if (cancelled || !host.current) return;
      try {
        created = createBaseCity(host.current, content, {
          onSelect: setSelected,
          onFollow: setFollowing,
          onTour: setTouring,
          onSpin: setSpinning,
          onPayday: ({ amount, wallets }) => {
            setMstr((total) => total + amount);
            setPaydays((count) => count + 1);
            setToast(content.toast.replace("{amount}", amount.toFixed(4)).replace("{wallets}", String(wallets)));
            clearTimeout(toastTimer.current);
            toastTimer.current = setTimeout(() => setToast(null), 3200);
          },
        });
        scene.current = created;
        setStatus("ready");
      } catch {
        setStatus("failed");
      }
    });
    return () => {
      cancelled = true;
      clearTimeout(toastTimer.current);
      created?.dispose();
      scene.current = null;
    };
  }, []);

  const card = selected ? info[selected] : null;

  return (
    <div className="relative isolate flex flex-col overflow-hidden rounded-2xl border-[3px] border-cyan bg-ink shadow-[0_4px_36px_rgb(39_231_255_/_0.3)] md:block md:h-[clamp(480px,calc(100svh_-_14rem),880px)]">
      {/* On phones the controls sit above and below the city; from tablet up they float over it. */}
      <div ref={host} role="img" aria-label={content.frameLabel} className="relative order-2 h-[52svh] min-h-[320px] md:absolute md:inset-0 md:h-auto" />

      {status !== "ready" && (
        <p className="absolute inset-0 grid place-items-center px-6 text-center text-mist" role="status">
          {status === "failed" ? content.fallback : content.loading}
        </p>
      )}

      {status === "ready" && (
        <>
          <div className="order-1 flex flex-wrap items-start justify-between gap-3 p-3 md:pointer-events-none md:absolute md:inset-x-0 md:top-0 md:p-5">
            <div className="pointer-events-auto flex max-w-[420px] flex-col gap-2">
              <span className="font-display text-[11px] font-bold tracking-[0.14em] text-mist uppercase">{content.eyebrow}</span>
              <div role="group" aria-label={content.stagesLabel} className="flex flex-wrap gap-2">
                <div className="inline-flex overflow-hidden rounded-lg border border-paper/40">
                  {content.stages.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={stage === s.id}
                      onClick={() => {
                        setStage(s.id);
                        scene.current?.setStage(s.id);
                      }}
                      className="border-l border-paper/25 bg-ink/70 px-3 py-2.5 font-display text-[13px] font-medium text-paper backdrop-blur-sm transition-colors duration-150 first:border-l-0 hover:bg-paper/15 aria-pressed:bg-paper aria-pressed:text-ink"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => scene.current?.runPayday()} className="btn-buy h-10 px-4 text-[13px]">
                  {content.paydayLabel}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" aria-pressed={following} onClick={() => scene.current?.setFollow(!following)} className={toggle}>
                  {content.controls.follow}
                </button>
                <button type="button" aria-pressed={touring} onClick={() => scene.current?.setTour(!touring)} className={toggle}>
                  {content.controls.tour}
                </button>
                <button type="button" aria-pressed={spinning} onClick={() => scene.current?.setSpin(!spinning)} className={toggle}>
                  {content.controls.spin}
                </button>
              </div>
            </div>

            <div aria-live="polite" className="pointer-events-auto flex w-full flex-col gap-1 rounded-xl border border-cyan/40 bg-ink/75 px-4 py-3 backdrop-blur-sm md:w-auto md:min-w-[220px]">
              <span className="font-display text-[11px] font-bold tracking-[0.14em] text-mist uppercase">{content.meter.label}</span>
              <span className="font-display text-2xl font-bold text-paper tabular-nums md:text-3xl">{mstr.toFixed(4)}</span>
              <span className="text-xs text-mist tabular-nums">
                {paydays} {paydays === 1 ? content.meter.payday : content.meter.paydays} · {content.meter.demo}
              </span>
            </div>
          </div>

          <div className="order-3 flex flex-col items-start justify-between gap-3 p-3 md:pointer-events-none md:absolute md:inset-x-0 md:bottom-0 md:flex-row md:items-end md:gap-4 md:p-5">
            {card ? (
              <section aria-live="polite" className="pointer-events-auto flex w-full flex-col gap-2 rounded-xl border border-cyan/50 bg-ink/90 p-4 shadow-[0_8px_30px_rgb(0_0_0_/_0.5)] backdrop-blur-sm md:w-[360px]">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-md bg-cyan/15 px-2 py-1.5 font-display text-[10.5px] font-bold tracking-widest text-cyan uppercase">{card.tag}</span>
                  <button type="button" aria-label={content.go.close} onClick={() => scene.current?.close()} className="rounded-md px-2 text-2xl leading-none text-mist transition-colors duration-150 hover:text-paper">
                    ×
                  </button>
                </div>
                <h2 className="font-display text-xl font-bold text-paper">{card.name}</h2>
                <p className="text-sm leading-relaxed text-mist">{card.text}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-2">
                  <button
                    type="button"
                    onClick={() => (selected === "cashy" ? scene.current?.setFollow(true) : scene.current?.flyToSelected())}
                    className="btn-buy h-10 px-4 text-[13px]"
                  >
                    {selected === "cashy" ? content.go.follow : content.go.fly}
                  </button>
                  {card.href && (
                    <Link href={card.href} className="font-display text-sm font-medium text-paper underline decoration-cyan decoration-2 underline-offset-4 transition-colors duration-150 hover:text-cyan">
                      {card.hrefLabel}
                    </Link>
                  )}
                </div>
              </section>
            ) : (
              <span className="hidden md:block" />
            )}
            <p className="pointer-events-none font-display text-[11px] leading-relaxed tracking-wider text-mist uppercase md:text-right">
              <span className="hidden md:block">
                {content.hint}
                <br />
                {content.hintKeys}
              </span>
              <span className="md:hidden">{content.hintTouch}</span>
            </p>
          </div>
        </>
      )}

      <p
        role="status"
        className={cn(
          "pointer-events-none absolute top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-paper px-4 py-2.5 font-display text-[13px] font-medium whitespace-nowrap text-ink transition-opacity duration-200 md:top-5",
          toast ? "opacity-100" : "opacity-0",
        )}
      >
        {toast}
      </p>
    </div>
  );
}
