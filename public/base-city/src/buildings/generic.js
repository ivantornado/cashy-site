// Generic buildings, open plots, parks and the outer districts.
import * as THREE from 'three';
import { BLUE, seeded, put } from '../core.js';
import { TONES, topMat, plainWhite, glowMat, lightMat, block, drum, solid } from '../materials.js';
import { addLabel, place, roof, scatter, lawnMat } from '../world.js';
import { RESERVED, SMALL, GENERIC } from '../plan.js';
import { INFO } from '../data.js';

// ---------- Generic building types (for Base projects and future integrations) ----------
function antenna(g, x, y, z, h = 1.4) { put(g, new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, h, 5), plainWhite), x, y + h / 2, z); put(g, new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), lightMat), x, y + h, z); }
function rooftopUnits(g, x, y, z) { put(g, solid(new THREE.BoxGeometry(0.4, 0.25, 0.3), topMat), x, y + 0.125, z); }
function generic(rand, minH, maxH, tone = 0) {
  const g = new THREE.Group();
  const h = minH + rand() * (maxH - minH);
  const kind = Math.floor(rand() * 3);
  const type = Math.floor(rand() * 6);
  let rf = { x: 0, z: 0, y: h, r: 0.3 }, bw = 3.2, bd = 3.2;
  if (type === 0) { // setback tower
    const w = 2.9 + rand() * 0.5, h1 = h * 0.5, h2 = h * 0.3, h3 = h * 0.2;
    put(g, block(w, h1, w, kind, tone), 0, h1 / 2, 0);
    put(g, block(w * 0.74, h2, w * 0.74, kind, tone), 0, h1 + h2 / 2, 0);
    put(g, block(w * 0.5, h3, w * 0.5, kind, tone), 0, h1 + h2 + h3 / 2, 0);
    rooftopUnits(g, w * 0.3, h1, w * 0.3); bw = bd = w; rf.r = 0.25;
  } else if (type === 1) { // round tower with a helipad
    const r = 1.25 + rand() * 0.35;
    put(g, drum(r, r, h, kind === 2 ? 2 : 1, 28, tone), 0, h / 2, 0);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(r + 0.06, r + 0.06, 0.12, 28), glowMat), 0, h * 0.62, 0);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(r * 0.6, r * 0.6, 0.05, 24), new THREE.MeshBasicMaterial({ color: BLUE })), 0, h + 0.03, 0);
    bw = bd = r * 2; rf.r = r * 0.4; rf.y = h + 0.05;
  } else if (type === 2) { // twisted tower
    const w = 2.3 + rand() * 0.4, n = Math.max(5, Math.round(h / 0.9)), sh = h / n, tw = (0.5 + rand() * 0.5) / n;
    for (let i = 0; i < n; i++) { const b = block(w, sh, w, kind, tone); b.rotation.y = i * tw; put(g, b, 0, sh * i + sh / 2, 0); }
    bw = bd = w * 1.2; rf.r = 0.5;
  } else if (type === 3) { // slab with fins
    const w = 3.3, d = 1.5 + rand() * 0.4;
    put(g, block(w, h, d, 1, tone), 0, h / 2, 0);
    for (let i = 0; i < 6; i++) put(g, solid(new THREE.BoxGeometry(0.07, h + 0.5, d + 0.3), tone ? TONES[tone].plain : plainWhite), -w / 2 + 0.3 + i * ((w - 0.6) / 5), (h + 0.5) / 2, 0);
    bw = w; bd = d + 0.3; rf.r = 0.15; rf.x = 0.27;
  } else if (type === 4) { // podium and tower with a roof garden
    put(g, block(3.5, 1.5, 3.5, 2, tone), 0, 0.75, 0);
    const tx = -0.75, tz = -0.75;
    put(g, block(1.8, h - 1.5, 1.8, kind, tone), tx, 1.5 + (h - 1.5) / 2, tz);
    for (const [x, z] of [[1.0, 1.0], [1.1, -0.3], [-0.2, 1.1]]) put(g, new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 8), plainWhite), x, 1.5 + 0.35, z);
    antenna(g, tx + 0.6, h, tz + 0.6);
    rf = { x: tx - 0.2, z: tz - 0.2, y: h, r: 0.25 }; bw = bd = 3.5;
  } else { // tapered hexagonal tower
    const r = 1.45 + rand() * 0.25;
    put(g, drum(r * 0.72, r, h, kind, 6, tone), 0, h / 2, 0);
    put(g, new THREE.Mesh(new THREE.CylinderGeometry(r * 0.75, r * 0.75, 0.1, 6), glowMat), 0, h + 0.05, 0);
    bw = bd = r * 2; rf.r = r * 0.3; rf.y = h + 0.1;
  }
  return { g, h, rf, bw, bd };
}

function plotOutline() {
  const g = new THREE.Group();
  const pts = [[-2, -2], [2, -2], [2, 2], [-2, 2], [-2, -2]].map(([x, z]) => new THREE.Vector3(x, 0.03, z));
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.45, gapSize: 0.3 }));
  line.computeLineDistances(); g.add(line);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 4), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 0.1; g.add(hit);
  return g;
}

// ---------- Placement on the lots of the city plan ----------

const lawnGeo = new THREE.BoxGeometry(1, 0.08, 1);
const pondMat = new THREE.MeshStandardMaterial({ color: 0x0f1a66, roughness: .2 });
function park(x, z, w, d, trees, rand) {
  const g = new THREE.Group();
  const lawn = new THREE.Mesh(lawnGeo, lawnMat); lawn.scale.set(w, 1, d); lawn.receiveShadow = true; put(g, lawn, 0, 0.04, 0);
  const pr = Math.min(w, d) * 0.22;
  put(g, new THREE.Mesh(new THREE.CylinderGeometry(pr, pr, 0.03, 28), pondMat), (rand() - .5) * w * 0.3, 0.1, (rand() - .5) * d * 0.3);
  for (let k = 0; k < trees; k++) {
    const a = rand() * Math.PI * 2, r = 0.62 + rand() * 0.3;
    scatter.trees.push([x + Math.cos(a) * r * w / 2, z + Math.sin(a) * r * d / 2, 0.8 + rand() * 0.5]);
  }
  return place(g, x, z, INFO.park);
}

const crand = seeded(2026);
// about 30% of the generic buildings are dark indigo; a separate seed keeps the layout independent of the tones
const trand = seeded(77);
const pickTone = () => (trand() < 0.3 ? 1 + Math.floor(trand() * 3) : 0);
const orand = seeded(8453);

// Leisure: the big park on the south side
addLabel(park(RESERVED.park[0], RESERVED.park[1], RESERVED.park[2] - 0.4, RESERVED.park[3] - 0.4, 16, orand), 'Base Park', 2.2);
// the small lots beside the roundabout: two pocket parks and an open plot. The south one is the station plaza.
SMALL.forEach((l, i) => {
  if (l.z > 0 && l.x === 0) return;
  if (i % 2) { park(l.x, l.z, l.size - 0.3, l.size - 0.3, 4, orand); return; }
  const g = plotOutline(); g.scale.set(0.7, 1, 0.7);
  place(g, l.x, l.z, INFO.plot);
});

// generic buildings: towers downtown, lower towards the edge, with a few parks and open plots in the outer rows
let plotLabels = 0, projectLabels = 0;
for (const lot of GENERIC) {
  const r = lot.outer ? orand() : 1, near = Math.max(Math.abs(lot.x), Math.abs(lot.z)) <= 6;
  if (r < 0.12) park(lot.x, lot.z, 4, 4, 5 + Math.floor(orand() * 3), orand);
  else if (r < 0.24) {
    const g = plotOutline();
    if (plotLabels++ % 2 === 0) addLabel(g, 'Your Base project here', 0.7, { cls: 'plot' });
    place(g, lot.x, lot.z, INFO.plot);
  } else {
    const tone = pickTone();
    const b = lot.outer ? generic(orand, 2.4, 5.5, tone) : near ? generic(crand, 7, 11.5, tone) : generic(crand, 4.5, 9, tone);
    if (!lot.outer && projectLabels++ < 2) addLabel(b.g, 'Base project', b.h + 1.6, { cls: 'plot' });
    place(b.g, lot.x, lot.z, INFO.project);
    roof(b.g, b.rf.x, b.rf.z, b.rf.y, b.rf.r);
  }
}
