"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * A tiny looping pixel-art preview of each game for its Arcade card. Drawn on a small canvas
 * (one art pixel = PX screen pixels), paused while off-screen, a still frame for reduced motion.
 * Decorative only: the card's text says what the game is.
 */

type Game = "cashy-tower" | "cashy-invaders" | "cashy-bubbles";
type Ctx = CanvasRenderingContext2D;

const PX = 4;
const LOOP = 3.6;

const C = {
  ink: "#05070d",
  blue: "#0000ff",
  mid: "#4d4dff",
  pale: "#c7c7ff",
  white: "#ffffff",
  green: "#a9dd8c",
};

// Cashy: green note head, shades, Base-blue tee with a white chest logo.
const CASHY = ["GGGGGGG", "GKKGKKG", "GGGGGGG", ".BBBBB.", "BBBWBBB", ".BBBBB.", ".W...W."];
const COIN = [".WWW.", "WWWWW", "WKWKW", "WWWWW", ".WWW."];
const PALETTE: Record<string, string> = { G: C.green, K: C.ink, B: C.mid, W: C.white };

function sprite(ctx: Ctx, rows: string[], x: number, y: number, recolour?: Record<string, string>) {
  const pal = recolour ? { ...PALETTE, ...recolour } : PALETTE;
  rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const ch = row[rx];
      if (ch === ".") continue;
      ctx.fillStyle = pal[ch];
      ctx.fillRect(Math.round(x) + rx, Math.round(y) + ry, 1, 1);
    }
  });
}

const frac = (v: number) => v - Math.floor(v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (t: number) => 1 - (1 - t) ** 3;

function label(ctx: Ctx, text: string, x: number, y: number, colour: string, alpha: number, align: CanvasTextAlign = "center") {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.font = "bold 7px ui-monospace, monospace";
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, Math.round(x), Math.round(y));
  ctx.globalAlpha = 1;
}

function burst(ctx: Ctx, x: number, y: number, k: number, colour: string) {
  if (k <= 0 || k >= 1) return;
  ctx.globalAlpha = 1 - k;
  ctx.fillStyle = colour;
  const d = 2 + k * 6;
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1.4], [0, 1.4]]) ctx.fillRect(Math.round(x + dx * d), Math.round(y + dy * d), 1, 1);
  ctx.globalAlpha = 1;
}

// Cashy Tower: he hops up three brick ledges per loop, bouncing off the wall on the middle jump.
function tower(ctx: Ctx, W: number, H: number, t: number) {
  const V = Math.max(12, Math.round(H * 0.27));
  const xs = [0.26, 0.66, 0.42].map((f) => Math.round(f * W));
  const baseY = H - 5;
  const cam = (t / LOOP) * 3 * V;
  const ledgeW = Math.max(14, Math.round(W * 0.2));

  // walls
  ctx.fillStyle = C.blue;
  ctx.fillRect(0, 0, 3, H);
  ctx.fillRect(W - 3, 0, 3, H);
  ctx.fillStyle = C.mid;
  for (let y = Math.round(cam % 6) - 6; y < H; y += 6) {
    ctx.fillRect(0, y, 3, 1);
    ctx.fillRect(W - 3, y + 3, 3, 1);
  }

  // ledges: bricks, scrolling down as he climbs
  for (let i = -1; i < Math.ceil(H / V) + 4; i++) {
    const y = Math.round(baseY - i * V + cam);
    if (y < -4 || y > H + 4) continue;
    const x = xs[((i % 3) + 3) % 3] - ledgeW / 2;
    ctx.fillStyle = C.pale;
    ctx.fillRect(Math.round(x), y, ledgeW, 3);
    ctx.fillStyle = C.mid;
    for (let b = 3; b < ledgeW; b += 5) ctx.fillRect(Math.round(x) + b, y + (b % 2 ? 1 : 2), 1, 1);
  }

  // Cashy
  const phase = (t / LOOP) * 3;
  const j = Math.floor(phase) % 3;
  const u = frac(phase);
  const sx = xs[j];
  const ex = xs[(j + 1) % 3];
  let x = lerp(sx, ex, u);
  let bounceAt = -1;
  if (j === 1) {
    const wall = W - 3 - 4;
    const out = wall - sx;
    const total = out + (wall - ex);
    const d = u * total;
    x = d < out ? sx + d : wall - (d - out);
    bounceAt = out / total;
  }
  const footY = baseY - (j + u) * V - Math.sin(Math.PI * u) * V * 0.85 + cam;
  sprite(ctx, CASHY, x - 3, footY - 7);

  if (bounceAt >= 0 && u > bounceAt && u < bounceAt + 0.55) {
    const k = (u - bounceAt) / 0.55;
    label(ctx, "COMBO x3", W - 6, footY - 9 - k * 4, C.green, 1 - k * k, "right");
  }
}

// Cashy Invaders: he slides under each rival coin and throws a note; each pops and drops, then a new wave slides in.
function invaders(ctx: Ctx, W: number, H: number, t: number) {
  const n = 5;
  const rowY = Math.round(H * 0.16);
  const sway = Math.round(Math.sin((t / LOOP) * Math.PI * 2) * 2);
  const cx = (k: number) => Math.round(W * (0.2 + (0.6 * k) / (n - 1))) + sway;
  const throwAt = (k: number) => 0.15 + 0.5 * k;
  const flight = 0.35;
  const groundY = H - 3;

  // the street
  ctx.fillStyle = C.blue;
  ctx.fillRect(0, groundY + 1, W, 2);

  for (let k = 0; k < n; k++) {
    const hit = throwAt(k) + flight;
    const colour = k % 2 ? { W: C.pale } : undefined;
    if (t < hit) sprite(ctx, COIN, cx(k) - 2, rowY - 2, colour);
    else {
      const d = t - hit;
      burst(ctx, cx(k), rowY, d / 0.3, C.white);
      if (d < 0.7) {
        ctx.globalAlpha = 1 - d / 0.7;
        sprite(ctx, COIN, cx(k) - 2, rowY - 2 + d * d * 60, colour);
        ctx.globalAlpha = 1;
      }
    }
    // the banknote on its way up
    const f = (t - throwAt(k)) / flight;
    if (f >= 0 && f < 1) {
      ctx.fillStyle = C.green;
      ctx.fillRect(cx(k) - 1, Math.round(lerp(groundY - 8, rowY + 3, f)), 3, 2);
    }
  }

  // the next wave slides in from the top
  const w = clamp01((t - 2.9) / 0.7);
  if (w > 0) for (let k = 0; k < n; k++) sprite(ctx, COIN, cx(k) - 2, lerp(-6, rowY - 2, ease(w)), k % 2 ? { W: C.pale } : undefined);

  // Cashy follows the coin he's aiming at
  let x = cx(0);
  for (let k = 0; k < n - 1; k++) {
    const m = clamp01((t - throwAt(k) - 0.1) / 0.3);
    if (m > 0) x = lerp(cx(k), cx(k + 1), ease(m));
  }
  const back = clamp01((t - 2.65) / 0.7);
  if (back > 0) x = lerp(cx(n - 1), cx(0), ease(back));
  sprite(ctx, CASHY, x - 3, groundY - 6);
}

// Cashy Bubbles: a green coin banks off the wall, lands next to two greens, and all three pop.
function bubbles(ctx: Ctx, W: number, H: number, t: number) {
  const step = 6;
  const cols = Math.max(6, Math.floor((W - 6) / step));
  const left = Math.round((W - cols * step) / 2);
  const colours = [C.mid, C.pale, C.white, C.blue];
  const rows = 4;
  const target = { r: rows - 1, c: Math.max(2, Math.floor(cols * 0.28)) };
  const greens = [
    [target.r, target.c - 1],
    [target.r, target.c - 2],
  ];
  const isGreen = (r: number, c: number) => greens.some(([gr, gc]) => gr === r && gc === c);
  const pos = (r: number, c: number) => ({ x: left + c * step + (r % 2 ? 3 : 0) + 3, y: 6 + r * 5 + 3 });
  const popT = 1.25;
  const refill = clamp01((t - 3.1) / 0.4);

  // ceiling and walls
  ctx.fillStyle = C.blue;
  ctx.fillRect(0, 0, W, 1);
  ctx.fillRect(0, 0, 1, H);
  ctx.fillRect(W - 1, 0, 1, H);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - (r % 2); c++) {
      if (r === target.r && c >= target.c) continue; // the gap the shot fills
      const p = pos(r, c);
      const green = isGreen(r, c);
      if (green && t >= popT) {
        burst(ctx, p.x, p.y, (t - popT) / 0.35, C.green);
        if (refill === 0) continue;
        ctx.globalAlpha = refill;
      }
      const flash = green && t > 1.0 && t < popT && Math.floor(t * 20) % 2 === 0;
      const fill = green ? (flash ? C.white : C.green) : colours[(r * 3 + c) % colours.length];
      sprite(ctx, COIN, p.x - 2, p.y - 2, { W: fill, K: fill });
      ctx.globalAlpha = 1;
    }
  }

  // launcher, with Cashy beside it
  const lx = Math.round(W * 0.55);
  const ly = H - 5;
  ctx.fillStyle = C.blue;
  ctx.fillRect(lx - 4, ly - 1, 9, 4);
  sprite(ctx, CASHY, lx - 16, H - 8);

  // the shot: aim line, then a straight path that banks off the left wall
  const dest = pos(target.r, target.c);
  const mirrorX = 2 - (dest.x - 2); // the target seen in the left wall's mirror
  const fire = 0.45;
  const land = 1.0;
  const point = (k: number) => {
    let x = lerp(lx, mirrorX, k);
    if (x < 2) x = 4 - x;
    return { x, y: lerp(ly - 2, dest.y, k) };
  };
  if (t < fire) {
    for (let k = 0.08; k < 0.75; k += 0.08) {
      const p = point(k);
      ctx.fillStyle = C.green;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
    ctx.globalAlpha = 1;
  }
  const s = clamp01((t - fire) / (land - fire));
  if (t < fire) sprite(ctx, COIN, lx - 2, ly - 4, { W: C.green, K: C.green });
  else if (t < popT) {
    const p = s < 1 ? point(s) : dest;
    sprite(ctx, COIN, p.x - 2, p.y - 2, { W: Math.floor(t * 20) % 2 === 0 && t > land ? C.white : C.green, K: Math.floor(t * 20) % 2 === 0 && t > land ? C.white : C.green });
  } else burst(ctx, dest.x, dest.y, (t - popT) / 0.35, C.green);
  if (t >= fire && t < 3.1) sprite(ctx, COIN, lx - 2, ly - 4, { W: C.pale, K: C.pale });
}

const SCENES: Record<Game, (ctx: Ctx, W: number, H: number, t: number) => void> = {
  "cashy-tower": tower,
  "cashy-invaders": invaders,
  "cashy-bubbles": bubbles,
};

export function ArcadeAnim({ game, className }: { game: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const scene = SCENES[game as Game];
    if (!canvas || !scene) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let visible = false;
    let start = performance.now();

    const draw = (t: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      scene(ctx, canvas.width, canvas.height, t);
    };
    const tick = (now: number) => {
      draw(((now - start) / 1000) % LOOP);
      raf = requestAnimationFrame(tick);
    };
    const run = () => {
      cancelAnimationFrame(raf);
      if (still) draw(0.8);
      else if (visible) raf = requestAnimationFrame(tick);
    };

    const ro = new ResizeObserver(() => {
      canvas.width = Math.max(40, Math.round(canvas.clientWidth / PX));
      canvas.height = Math.max(30, Math.round(canvas.clientHeight / PX));
      ctx.imageSmoothingEnabled = false;
      if (still || !visible) draw(0.8);
    });
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start = performance.now();
      run();
    });
    ro.observe(canvas);
    io.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [game]);

  // The canvas sits absolutely inside its box, so its own pixel size never feeds back into the card's height.
  return (
    <div aria-hidden className={cn("relative overflow-hidden", className)}>
      <canvas ref={ref} className="absolute inset-0 block size-full [image-rendering:pixelated]" />
    </div>
  );
}
