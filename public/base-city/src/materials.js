// Shared materials, facade textures and mesh helpers.
import * as THREE from 'three';
import { BLUE, INDIGO, canvasTex, seeded } from './core.js';

// ---------- Materials ----------
const frand = seeded(42);
function facadeTex(kind) {
  return canvasTex(128, 128, (g) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
    const glass = ['#3b47b5', '#3b47b5', '#2f3a9c', '#4a57c8', '#27318a']; // unlit glass, at night
    if (kind === 0) {
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { g.fillStyle = glass[Math.floor(frand() * glass.length)]; g.fillRect(c * 32 + 6, r * 32 + 8, 20, 18); }
      g.fillStyle = 'rgba(0,0,255,0.3)'; for (let r = 0; r < 4; r++) g.fillRect(0, r * 32, 128, 2);
    } else if (kind === 1) {
      for (let c = 0; c < 4; c++) { g.fillStyle = c % 2 ? '#3b47b5' : '#2f3a9c'; g.fillRect(c * 32 + 8, 0, 16, 128); }
      g.fillStyle = 'rgba(0,0,255,0.22)'; for (let r = 0; r < 4; r++) g.fillRect(0, r * 32, 128, 2);
    } else {
      for (let r = 0; r < 4; r++) {
        g.fillStyle = '#3441a8'; g.fillRect(0, r * 32 + 8, 128, 14);
        g.fillStyle = 'rgba(0,0,255,0.3)'; for (let c = 0; c < 8; c++) g.fillRect(c * 16, r * 32 + 8, 1.5, 14);
      }
    }
  });
}
const FACADES = [0, 1, 2].map((k) => { const t = facadeTex(k); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; });

// ---------- Lit windows ----------
// Windows glow through a small shader patch on the facade materials: each window cell gets a random value,
// 30-50% of them are lit (warm white or pale blue), and a few switch on and off slowly. No lights, no extra draw calls.
const WIN = { time: { value: 0 } };
// per facade kind: window cells per texture tile, and the window rectangle inside a cell (x0, y0, x1, y1)
const WIN_LAYOUT = [
  { grid: '4.0, 4.0', rect: '0.1875, 0.1875, 0.8125, 0.75' },
  { grid: '4.0, 4.0', rect: '0.25, 0.0, 0.75, 0.93' },
  { grid: '8.0, 4.0', rect: '0.1, 0.3125, 1.0, 0.75' },
];
function litWindows(mat, kind, flat) {
  const L = WIN_LAYOUT[kind];
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uWinTime = WIN.time;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vWinSeed;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float winS = dot(floor(modelMatrix[3].xyz * 8.0 + 0.5), vec3(0.731, 1.933, 3.177));
        ${flat ? 'winS += normal.x * 17.0 + normal.z * 41.0;' : ''}
        vWinSeed = floor(fract(sin(winS) * 43758.5453) * 64.0);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uWinTime;
        varying float vWinSeed;
        float winHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          vec2 wg = vMapUv * vec2(${L.grid});
          vec2 wc = floor(wg), wf = fract(wg);
          float sd = floor(vWinSeed + 0.5); // the varying is constant per face; rounding removes interpolation noise
          vec4 wr = vec4(${L.rect});
          float inWin = step(wr.x, wf.x) * step(wf.x, wr.z) * step(wr.y, wf.y) * step(wf.y, wr.w);
          float r1 = winHash(wc + sd), r2 = winHash(wc + sd + 11.0), r3 = winHash(wc + sd + 23.0);
          float lit = step(r1, 0.3 + 0.2 * fract(sd * 0.731));
          float blink = smoothstep(0.42, 0.58, 0.5 + 0.5 * sin(6.2832 * (uWinTime * (0.03 + 0.05 * r2) + r1 * 10.0)));
          lit = mix(lit, blink, step(r3, 0.08));
          vec3 warm = vec3(1.0, 0.921, 0.686), pale = vec3(0.571, 0.571, 1.0);
          totalEmissiveRadiance += mix(warm, pale, step(0.62, r2)) * inWin * lit * (0.7 + 0.3 * r3);
        }`);
  };
  mat.customProgramCacheKey = () => 'win' + kind + (flat ? 'f' : 'r');
}

// Darker building tones (0 = white). About a third of the generic buildings use one, for depth in the skyline.
const TONES = [null, 0x000033, 0x0d0d40, 0x1a1a4d].map((c) => c === null ? null : {
  color: c,
  plain: new THREE.MeshStandardMaterial({ color: c, roughness: .5 }),
  top: new THREE.MeshStandardMaterial({ color: new THREE.Color(c).offsetHSL(0, 0, 0.07), roughness: .6 }),
});
const sideCache = new Map();
function sideMat(kind, u, v, flat = true, tone = 0) {
  const a = Math.max(0.25, Math.round(u * 4) / 4), b = Math.max(0.25, Math.round(v * 4) / 4);
  const key = `${kind}:${a}x${b}:${flat ? 'f' : 'r'}:${tone}`;
  if (!sideCache.has(key)) {
    const t = FACADES[kind].clone(); t.needsUpdate = true; t.repeat.set(a, b);
    const m = new THREE.MeshStandardMaterial({ map: t, roughness: .5, color: tone ? TONES[tone].color : 0xffffff });
    litWindows(m, kind, flat);
    sideCache.set(key, m);
  }
  return sideCache.get(key);
}
const topMat = new THREE.MeshStandardMaterial({ color: 0xe6e6ff, roughness: .6 });
const plainWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .5 });
const indigoMat = new THREE.MeshStandardMaterial({ color: INDIGO, roughness: .45 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0xaab6ff, roughness: .15, metalness: .1 });
const edgeMat = new THREE.LineBasicMaterial({ color: BLUE });
const edgeWhite = new THREE.LineBasicMaterial({ color: 0xffffff });
const glowMat = new THREE.MeshBasicMaterial({ color: 0x8c8cff });
const lightMat = new THREE.MeshBasicMaterial({ color: 0xdfe5ff });
const ghostMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1, depthWrite: false });
const ghostEdge = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 });
const glowTex = canvasTex(64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(220,226,255,.55)'); gr.addColorStop(1, 'rgba(200,210,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
});
function glowSprite(size, opacity = 0.9) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity }));
  s.scale.setScalar(size); return s;
}

const FLOOR = 3.2; // one facade tile = 3.2 units
// A box normally costs one draw call per face. This regroups its faces so the four sides share a call when they
// share a material: two or three calls per box instead of six. Returns the material list to use with it.
function boxMats(geo, mx, top, mz) {
  const i = geo.index.array, re = new i.constructor(36);
  re.set(i.subarray(0, 12), 0); re.set(i.subarray(24, 36), 12); re.set(i.subarray(12, 24), 24);   // x sides, z sides, then top and bottom
  geo.setIndex(new THREE.BufferAttribute(re, 1)); geo.clearGroups();
  if (mx === mz) { geo.addGroup(0, 24, 0); geo.addGroup(24, 12, 1); return [mx, top]; }
  geo.addGroup(0, 12, 0); geo.addGroup(12, 12, 1); geo.addGroup(24, 12, 2); return [mx, mz, top];
}
function block(w, h, d, kind, tone = 0) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const win = kind !== undefined && kind !== false;
  const plain = tone ? TONES[tone].plain : plainWhite, top = tone ? TONES[tone].top : topMat;
  const mx = win ? sideMat(kind, d / FLOOR, h / FLOOR, true, tone) : plain;
  const mz = win ? sideMat(kind, w / FLOOR, h / FLOOR, true, tone) : plain;
  const m = new THREE.Mesh(geo, boxMats(geo, mx, top, mz));
  m.castShadow = true; m.receiveShadow = true;
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
  return m;
}
function drum(rTop, rBot, h, kind, seg = 28, tone = 0) {
  const geo = new THREE.CylinderGeometry(rTop, rBot, h, seg);
  const top = tone ? TONES[tone].top : topMat;
  const side = kind !== undefined && kind !== false ? sideMat(kind, (2 * Math.PI * Math.max(rTop, rBot)) / FLOOR, h / FLOOR, false, tone) : (tone ? TONES[tone].plain : plainWhite);
  const m = new THREE.Mesh(geo, [side, top, top]);
  m.castShadow = true; m.receiveShadow = true;
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 30), edgeMat));
  return m;
}
function solid(geo, mat, edges = true, angle = 20) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true; m.receiveShadow = true;
  if (edges) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, angle), edgeMat));
  return m;
}
function ghostBlock(w, h, d) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, ghostMat);
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), ghostEdge));
  return m;
}

// ---------- A small chip: used on the factory conveyor, at its vents and in the Payday shower ----------
const chipTex = canvasTex(64, 64, (g) => {
  g.fillStyle = '#0b1040'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#a9dd8c';
  for (let k = 0; k < 5; k++) { const p = 9 + k * 10.5; g.fillRect(p, 0, 5, 7); g.fillRect(p, 57, 5, 7); g.fillRect(0, p, 7, 5); g.fillRect(57, p, 7, 5); }
  g.fillStyle = '#eaffdc'; g.fillRect(21, 21, 22, 22);
  g.strokeStyle = '#a9dd8c'; g.lineWidth = 2; g.strokeRect(16, 16, 32, 32);
});
const chipSide = new THREE.MeshStandardMaterial({ color: 0x0b1040, roughness: .5 });
const chipFace = new THREE.MeshStandardMaterial({ map: chipTex, emissive: 0xffffff, emissiveMap: chipTex, emissiveIntensity: 0.7, roughness: .5 });
const chipGeo = new THREE.BoxGeometry(1, 0.2, 1), chipMats = boxMats(chipGeo, chipSide, chipFace, chipSide);
function chipMesh(size) {
  const m = new THREE.Mesh(chipGeo, chipMats);
  m.scale.setScalar(size); return m;
}

export { boxMats, chipMesh, WIN, TONES, topMat, plainWhite, indigoMat, glassMat, edgeWhite, glowMat, lightMat, glowTex, glowSprite, block, drum, solid, ghostBlock };
