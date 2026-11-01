// The skyline, drawn from scratch. Original art, not traced from anything.
// Every layer shares a 1600x900 canvas that crops from the centre-bottom, so on a
// phone only roughly x 590-1010 shows: anything that must read on phones sits there.
// No SVG filters: glows are stacked strokes and gradients, which stay cheap while moving.

import { asset } from "@/lib/utils";

const INK = "#04060f";
const CYAN = "#27e7ff";
const MAGENTA = "#ff2bd6";
const YELLOW = "#ffd21f";
const GREEN = "#a9dd8c";
const VIOLET = "#8b3dff";

type LayerProps = { className?: string };

function Canvas({ className, children }: LayerProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden>
      {children}
    </svg>
  );
}

function random(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

type Building = { x: number; w: number; top: number };

type Style = {
  body: string;
  side: string;
  outline: string;
  outlineWidth: number;
  windows: { colour: string; weight: number }[];
  window: { w: number; h: number; gapX: number; gapY: number; lit: number };
  rim?: boolean;
};

function pickWeighted(options: Style["windows"], roll: number) {
  let remaining = roll;
  for (const option of options) {
    remaining -= option.weight;
    if (remaining <= 0) return option.colour;
  }
  return options[0].colour;
}

// Windows go into one path per colour, so hundreds of them stay a handful of DOM nodes.
function Buildings({ buildings, style, seed }: { buildings: Building[]; style: Style; seed: number }) {
  const rand = random(seed);
  const windowPaths = new Map<string, string>();
  const totalWeight = style.windows.reduce((sum, w) => sum + w.weight, 0);
  const { w: winW, h: winH, gapX, gapY, lit } = style.window;

  for (const b of buildings) {
    const margin = 10;
    const usable = b.w - margin * 2;
    const cols = Math.max(1, Math.floor((usable + gapX - winW) / gapX));
    const startX = b.x + (b.w - ((cols - 1) * gapX + winW)) / 2;
    for (let row = 0; b.top + 18 + row * gapY < 900; row++) {
      for (let col = 0; col < cols; col++) {
        if (rand() > lit) continue;
        const colour = pickWeighted(style.windows, rand() * totalWeight);
        const x = Math.round(startX + col * gapX);
        const y = Math.round(b.top + 18 + row * gapY);
        windowPaths.set(colour, `${windowPaths.get(colour) ?? ""}M${x} ${y}h${winW}v${winH}h-${winW}z`);
      }
    }
  }

  const rimLeft = buildings.map((b) => `M${b.x + 3} 900V${b.top + 3}`).join("");
  const rimTop = buildings.map((b) => `M${b.x + 3} ${b.top + 3}H${b.x + b.w - 3}`).join("");

  return (
    <g>
      {buildings.map((b) => (
        <g key={`${b.x}-${b.top}`}>
          <rect x={b.x} y={b.top} width={b.w} height={900 - b.top} fill={style.body} stroke={style.outline} strokeWidth={style.outlineWidth} />
          <rect x={b.x + b.w * 0.68} y={b.top + style.outlineWidth / 2} width={b.w * 0.32 - style.outlineWidth / 2} height={900 - b.top} fill={style.side} />
        </g>
      ))}
      {[...windowPaths].map(([colour, d]) => (
        <path key={colour} d={d} fill={colour} />
      ))}
      {style.rim && (
        <>
          <path d={rimLeft} stroke={CYAN} strokeWidth="2.5" strokeOpacity="0.7" fill="none" />
          <path d={rimTop} stroke={MAGENTA} strokeWidth="2.5" strokeOpacity="0.85" fill="none" />
        </>
      )}
    </g>
  );
}

// Canyon outline: low through the middle so the moon, the word and Cashy stay clear.
function cityRow(seed: number, widths: [number, number], tops: { centre: number; edge: number; jitter: number }) {
  const rand = random(seed);
  const row: Building[] = [];
  let x = -30;
  while (x < 1630) {
    const w = Math.round(widths[0] + rand() * (widths[1] - widths[0]));
    const distance = Math.min(1, Math.abs(x + w / 2 - 800) / 420);
    const top = tops.centre + (tops.edge - tops.centre) * distance ** 0.8 + (rand() - 0.5) * tops.jitter;
    row.push({ x, w, top: Math.round(top) });
    x += w - 2;
  }
  return row;
}

function Antennas({ buildings, every, colour, seed }: { buildings: Building[]; every: number; colour: string; seed: number }) {
  const rand = random(seed);
  const d = buildings
    .filter((_, i) => i % every === 0)
    .map((b) => {
      const x = Math.round(b.x + b.w * (0.3 + rand() * 0.4));
      const h = Math.round(30 + rand() * 50);
      return `M${x} ${b.top}v-${h}M${x - 8} ${b.top - h * 0.55}h16`;
    })
    .join("");
  return <path d={d} stroke={colour} strokeWidth="3" fill="none" />;
}

function Halo({ id, colour }: { id: string; colour: string }) {
  return (
    <radialGradient id={id}>
      <stop offset="0" stopColor={colour} stopOpacity="0.55" />
      <stop offset="1" stopColor={colour} stopOpacity="0" />
    </radialGradient>
  );
}

export function Stars({ className }: LayerProps) {
  const rand = random(8453);
  const dots = Array.from({ length: 70 }, () => ({
    x: Math.round(rand() * 1600),
    y: Math.round(rand() * 520),
    r: rand() > 0.82 ? 2.2 : 1.2,
    o: 0.35 + rand() * 0.55,
  }));
  return (
    <Canvas className={className}>
      {dots.map((dot) => (
        <circle key={`${dot.x}-${dot.y}`} cx={dot.x} cy={dot.y} r={dot.r} fill="#dfe8ff" opacity={dot.o} />
      ))}
    </Canvas>
  );
}

export function Moon({ className }: LayerProps) {
  return (
    <Canvas className={className}>
      <defs>
        <radialGradient id="moon-glow">
          <stop offset="0.45" stopColor="#0052ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#0052ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="moon-face" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f7bff" />
          <stop offset="0.6" stopColor="#0052ff" />
          <stop offset="1" stopColor="#6a2bff" />
        </linearGradient>
      </defs>
      <circle cx="800" cy="330" r="430" fill="url(#moon-glow)" />
      <circle cx="800" cy="330" r="215" fill="url(#moon-face)" stroke={INK} strokeWidth="5" />
      <path d="M640 215a215 215 0 0 1 120-98" stroke="#bcd6ff" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.8" />
      <g fill="#0040cc" opacity="0.75">
        <circle cx="880" cy="230" r="30" />
        <circle cx="735" cy="400" r="20" />
        <circle cx="905" cy="430" r="44" />
        <circle cx="690" cy="285" r="13" />
      </g>
    </Canvas>
  );
}

export function FarSkyline({ className }: LayerProps) {
  const row = cityRow(11, [60, 118], { centre: 590, edge: 290, jitter: 110 });
  return (
    <Canvas className={className}>
      <defs>
        <linearGradient id="far-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={MAGENTA} stopOpacity="0" />
          <stop offset="1" stopColor={MAGENTA} stopOpacity="0.5" />
        </linearGradient>
      </defs>
      <Antennas buildings={row} every={4} colour="#2c2a80" seed={3} />
      <Buildings
        buildings={row}
        seed={21}
        style={{
          body: "#2c2a80",
          side: "#242270",
          outline: "#1a1958",
          outlineWidth: 2.5,
          windows: [
            { colour: "#7f7bea", weight: 3 },
            { colour: "#c78bff", weight: 1 },
          ],
          window: { w: 6, h: 9, gapX: 15, gapY: 21, lit: 0.26 },
        }}
      />
      <rect y="400" width="1600" height="500" fill="url(#far-haze)" />
    </Canvas>
  );
}

export function MidSkyline({ className }: LayerProps) {
  const row = cityRow(47, [78, 152], { centre: 670, edge: 370, jitter: 120 });
  return (
    <Canvas className={className}>
      <defs>
        <linearGradient id="mid-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={VIOLET} stopOpacity="0" />
          <stop offset="1" stopColor={VIOLET} stopOpacity="0.42" />
        </linearGradient>
      </defs>
      <Antennas buildings={row} every={3} colour={INK} seed={9} />
      <Buildings
        buildings={row}
        seed={5}
        style={{
          body: "#131d52",
          side: "#0d1540",
          outline: INK,
          outlineWidth: 3.5,
          windows: [
            { colour: CYAN, weight: 3 },
            { colour: "#ffe08a", weight: 4 },
            { colour: "#7ea8ff", weight: 3 },
            { colour: MAGENTA, weight: 1 },
          ],
          window: { w: 9, h: 13, gapX: 22, gapY: 29, lit: 0.34 },
          rim: true,
        }}
      />
      <rect y="560" width="1600" height="340" fill="url(#mid-haze)" />
    </Canvas>
  );
}

// A long dash in vertical Japanese has to run down the sign, not across.
function VerticalLetters({ text, x, top, step, size, fill }: { text: string; x: number; top: number; step: number; size: number; fill: string }) {
  return (
    <g fill={fill} fontSize={size} fontWeight="800" textAnchor="middle" style={{ fontFamily: "var(--font-sign), var(--font-display)" }}>
      {[...text].map((char, i) => {
        const y = top + step * i;
        return (
          <text key={`${char}-${i}`} x={x} y={y} dominantBaseline="central" transform={char === "ー" ? `rotate(90 ${x} ${y})` : undefined}>
            {char}
          </text>
        );
      })}
    </g>
  );
}

function VerticalSign({ x, y, w, text, colour, flicker }: { x: number; y: number; w: number; text: string; colour: string; flicker?: string }) {
  const step = w * 0.86;
  const h = step * text.length + w * 0.3;
  return (
    <g className={flicker}>
      <rect x={x - 5} y={y - 5} width={w + 10} height={h + 10} rx="11" fill="none" stroke={colour} strokeWidth="12" opacity="0.2" />
      <rect x={x} y={y} width={w} height={h} rx="7" fill={INK} stroke={colour} strokeWidth="4" />
      <VerticalLetters text={text} x={x + w / 2} top={y + w * 0.15 + step / 2} step={step} size={w * 0.68} fill={colour} />
    </g>
  );
}

function Billboard({ x, y, w, h, colour, children }: { x: number; y: number; w: number; h: number; colour: string; children: React.ReactNode }) {
  return (
    <g>
      <path d={`M${x + w * 0.2} ${y + h}v22M${x + w * 0.8} ${y + h}v22`} stroke={INK} strokeWidth="7" />
      <rect x={x - 5} y={y - 5} width={w + 10} height={h + 10} rx="9" fill="none" stroke={colour} strokeWidth="12" opacity="0.2" />
      <rect x={x} y={y} width={w} height={h} rx="5" fill={INK} stroke={colour} strokeWidth="4" />
      {children}
    </g>
  );
}

function BillboardWord({ x, y, size, fill, children }: { x: number; y: number; size: number; fill: string; children: string }) {
  return (
    <text x={x} y={y} fontSize={size} fontWeight="700" fill={fill} textAnchor="middle" dominantBaseline="central" style={{ fontFamily: "var(--font-display)" }}>
      {children}
    </text>
  );
}

// Near buildings are placed by hand, so the signs land where they read best.
const NEAR_BUILDINGS: Building[] = [
  { x: -20, w: 170, top: 215 },
  { x: 148, w: 150, top: 400 },
  { x: 296, w: 165, top: 290 },
  { x: 459, w: 136, top: 560 },
  { x: 593, w: 122, top: 455 },
  { x: 713, w: 90, top: 700 },
  { x: 801, w: 96, top: 725 },
  { x: 895, w: 120, top: 515 },
  { x: 1013, w: 150, top: 610 },
  { x: 1161, w: 160, top: 320 },
  { x: 1319, w: 145, top: 425 },
  { x: 1462, w: 160, top: 205 },
];

export function NearSkyline({ className }: LayerProps) {
  return (
    <Canvas className={className}>
      <defs>
        <Halo id="near-magenta" colour={MAGENTA} />
        <Halo id="near-cyan" colour={CYAN} />
        <Halo id="near-yellow" colour={YELLOW} />
        <linearGradient id="near-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#05070d" stopOpacity="0" />
          <stop offset="1" stopColor="#05070d" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      <ellipse cx="640" cy="590" rx="120" ry="210" fill="url(#near-magenta)" />
      <ellipse cx="955" cy="640" rx="110" ry="200" fill="url(#near-cyan)" />
      <ellipse cx="225" cy="560" rx="120" ry="220" fill="url(#near-yellow)" opacity="0.7" />
      <ellipse cx="1240" cy="510" rx="120" ry="230" fill="url(#near-magenta)" />
      <ellipse cx="380" cy="470" rx="110" ry="210" fill="url(#near-cyan)" />
      <ellipse cx="1390" cy="520" rx="110" ry="160" fill="url(#near-yellow)" opacity="0.7" />

      <path d="M70 215v-80M58 158h24M1540 205v-90M1526 140h28M380 290v-46M1240 320v-54" stroke={INK} strokeWidth="5" fill="none" />
      <circle cx="70" cy="133" r="5" fill={MAGENTA} />
      <circle cx="1540" cy="113" r="5" fill={MAGENTA} />

      <Buildings
        buildings={NEAR_BUILDINGS}
        seed={73}
        style={{
          body: "#0a1233",
          side: "#060c26",
          outline: INK,
          outlineWidth: 4.5,
          windows: [
            { colour: "#ffd76a", weight: 5 },
            { colour: "#38e8d8", weight: 3 },
            { colour: "#ff8ae2", weight: 1 },
          ],
          window: { w: 13, h: 19, gapX: 30, gapY: 39, lit: 0.3 },
          rim: true,
        }}
      />

      <VerticalSign x={624} y={486} w={60} text="キャッシー" colour={MAGENTA} flicker="neon-flicker" />
      <VerticalSign x={930} y={546} w={54} text="8453" colour={CYAN} />
      <VerticalSign x={196} y={432} w={56} text="アーケード" colour={YELLOW} />
      <VerticalSign x={350} y={322} w={58} text="PRINTER" colour={CYAN} />
      <VerticalSign x={1212} y={352} w={58} text="ARCADE" colour={MAGENTA} flicker="neon-flicker-late" />
      <VerticalSign x={1366} y={458} w={52} text="バンク" colour={YELLOW} />

      <Billboard x={18} y={250} w={112} h={74} colour={GREEN}>
        <BillboardWord x={74} y={287} size={52} fill={GREEN}>$</BillboardWord>
      </Billboard>
      <Billboard x={472} y={488} w={110} h={50} colour={CYAN}>
        <BillboardWord x={527} y={513} size={30} fill={CYAN}>CASHY</BillboardWord>
      </Billboard>
      <Billboard x={1030} y={540} w={118} h={48} colour={YELLOW}>
        <BillboardWord x={1089} y={564} size={30} fill={YELLOW}>$CASHY</BillboardWord>
      </Billboard>
      <Billboard x={1482} y={238} w={120} h={76} colour={MAGENTA}>
        <BillboardWord x={1542} y={276} size={36} fill={MAGENTA}>8453</BillboardWord>
      </Billboard>

      <rect y="640" width="1600" height="260" fill="url(#near-fade)" />
    </Canvas>
  );
}

// Source art is 670x983 with 48px of glow margin around the figure.
const MASCOT_HEIGHT = 500;
const MASCOT_WIDTH = (MASCOT_HEIGHT * 670) / 983;
const LEDGE_TOP = 772;
const MASCOT_Y = LEDGE_TOP + 10 - MASCOT_HEIGHT * (1 - 48 / 983);

export function Rooftop({ mascot, className }: LayerProps & { mascot: string }) {
  return (
    <Canvas className={className}>
      <defs>
        <linearGradient id="roof-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0e1540" />
          <stop offset="1" stopColor="#05070d" />
        </linearGradient>
        <linearGradient id="roof-rim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={CYAN} />
          <stop offset="0.5" stopColor="#7ea8ff" />
          <stop offset="1" stopColor={MAGENTA} />
        </linearGradient>
        <radialGradient id="roof-backlight">
          <stop offset="0" stopColor={MAGENTA} stopOpacity="0.4" />
          <stop offset="1" stopColor={MAGENTA} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="roof-shadow">
          <stop offset="0" stopColor="#000" stopOpacity="0.8" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="800" cy="560" rx="310" ry="320" fill="url(#roof-backlight)" />

      {/* Water tank, far left of the ledge */}
      <g transform="translate(-112 0)">
        <g stroke={INK} strokeWidth="5">
          <path d="M210 772l16-96M340 772l-16-96M226 700h98" fill="none" />
          <path d="M198 676V575l77-44 77 44v101z" fill="#16204f" />
          <path d="M198 575h154" fill="none" />
        </g>
        <path d="M201 672V577l74-42" stroke={CYAN} strokeWidth="2.5" fill="none" strokeOpacity="0.8" />
      </g>

      {/* Vent pipe, visible on phones too */}
      <g stroke={INK} strokeWidth="4.5">
        <rect x="610" y="688" width="30" height="84" fill="#1a2356" />
        <rect x="602" y="674" width="46" height="20" rx="4" fill="#232d66" />
      </g>
      <path d="M613 772v-80" stroke={CYAN} strokeWidth="2.5" strokeOpacity="0.7" fill="none" />

      {/* Air-con units on the right, the first one reads on phones */}
      <g stroke={INK} strokeWidth="4.5">
        <rect x="960" y="708" width="82" height="64" rx="4" fill="#1a2356" />
        <circle cx="1001" cy="740" r="21" fill="#0b1132" />
        <path d="M1001 719v42M980 740h42" fill="none" />
        <rect x="1230" y="660" width="136" height="112" rx="5" fill="#16204f" />
        <circle cx="1298" cy="716" r="40" fill="#0b1132" />
        <path d="M1298 676v80M1258 716h80" fill="none" />
      </g>
      <path d="M1040 772v-62M1364 772V662" stroke={MAGENTA} strokeWidth="2.5" strokeOpacity="0.85" fill="none" />

      {/* The ledge */}
      <rect x="-10" y={LEDGE_TOP} width="1620" height="26" fill="#1d275f" stroke={INK} strokeWidth="5" />
      <rect x="-10" y={LEDGE_TOP - 2} width="1620" height="4" fill="url(#roof-rim)" />
      <rect x="-10" y={LEDGE_TOP + 26} width="1620" height="110" fill="url(#roof-wall)" />
      <path d="M0 826h1600M0 856h1600M120 798v28M360 798v28M600 798v28M840 798v28M1080 798v28M1320 798v28M240 826v30M480 826v30M720 826v30M960 826v30M1200 826v30M1440 826v30" stroke="#04060f" strokeWidth="3" opacity="0.8" fill="none" />

      {/* Wet ledge catching the neon */}
      <path d="M690 781h70M840 781h96M480 781h110M1010 781h60" stroke={CYAN} strokeWidth="3" strokeLinecap="round" opacity="0.55" />
      <path d="M740 790h52M880 790h40M1100 790h90M360 790h70" stroke={MAGENTA} strokeWidth="3" strokeLinecap="round" opacity="0.55" />

      <ellipse cx="800" cy={LEDGE_TOP + 11} rx="178" ry="11" fill="url(#roof-shadow)" />

      {/* TODO: final art. Temporary mascot, treatment baked by scripts/bake-mascot.py */}
      <image href={asset(mascot)} x={800 - MASCOT_WIDTH / 2} y={MASCOT_Y} width={MASCOT_WIDTH} height={MASCOT_HEIGHT} />
    </Canvas>
  );
}
