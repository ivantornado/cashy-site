// The city plan: coastline, road graph and building lots. Pure data and maths, no meshes.
// Map convention: x runs east, z runs south. The start camera looks from the south-east.
import * as THREE from 'three';
import { GROUND, seeded } from './core.js';

const ROAD = 1.5;     // street width
const AVENUE = 2.2;   // the diagonal avenue

// ---------- Geometry helpers ----------
function smooth(ctrl, closed, per = 8) {
  const c = new THREE.CatmullRomCurve3(ctrl.map(([x, z]) => new THREE.Vector3(x, 0, z)), closed, 'centripetal');
  const n = closed ? ctrl.length : ctrl.length - 1, out = [];
  for (let i = 0; i < n; i++) for (let k = 0; k < per; k++) { const p = c.getPoint((i + k / per) / n); out.push([p.x, p.z]); }
  if (!closed) out.push([ctrl[n][0], ctrl[n][1]]);
  return out;
}
function inPoly(poly, x, z) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
function segDist(x, z, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0;
  return Math.hypot(x - ax - dx * t, z - az - dz * t);
}
function lineDist(pts, x, z, closed) {
  let m = Infinity;
  for (let i = closed ? 0 : 1; i < pts.length; i++) { const a = pts[(i - 1 + pts.length) % pts.length], b = pts[i]; m = Math.min(m, segDist(x, z, a[0], a[1], b[0], b[1])); }
  return m;
}

// ---------- Coastline ----------
// A hand-drawn outline, smoothed. The bay is the dent on the south-east side, next to the core.
const COAST = smooth([
  [-4, -44], [14, -42], [30, -34], [38, -20], [36, -4], [31.5, 8], [30, 16], [23.5, 18.5], [18.5, 23.5], [19.5, 31],
  [10, 35], [-4, 33.5], [-18, 36.5], [-32, 30], [-41, 16], [-44, 0], [-40, -18], [-30, -34], [-18, -42],
], true, 8);
function blob(cx, cz, r, seed) {
  const rand = seeded(seed), ctrl = [];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, rr = r * (0.7 + rand() * 0.55); ctrl.push([cx + Math.cos(a) * rr, cz + Math.sin(a) * rr]); }
  return smooth(ctrl, true, 5);
}
const ISLETS = [blob(45, 7, 4.2, 5), blob(-15, 46, 3.3, 9)];
const LAND = [COAST, ...ISLETS];
// the box the camera target may move in: the island and its islets
const BOUNDS = { minX: -46, maxX: 50, minZ: -46, maxZ: 50 };

function onLand(x, z) { for (const p of LAND) if (inPoly(p, x, z)) return true; return false; }
function groundY(x, z) { return onLand(x, z) ? GROUND : 0.04; }
// on the main island, at least m away from the shore
function landMargin(x, z, m) { return inPoly(COAST, x, z) && lineDist(COAST, x, z, true) > m; }

// ---------- Road graph ----------
// nodes: { x, z, edges: [edge index] }. edges: { a, b, pts: [[x, z]], cum: [distance], len, width, kind, dead }.
const nodes = [], edges = [];
const nodeKey = new Map();
function node(x, z) {
  const k = Math.round(x * 4) + ',' + Math.round(z * 4);
  if (!nodeKey.has(k)) { nodeKey.set(k, nodes.length); nodes.push({ x, z, edges: [] }); }
  return nodeKey.get(k);
}
function addEdge(pts, opts = {}) {
  const a = node(pts[0][0], pts[0][1]), b = node(pts[pts.length - 1][0], pts[pts.length - 1][1]);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  nodes[a].edges.push(edges.length); nodes[b].edges.push(edges.length);
  edges.push({ a, b, pts, cum, len: cum[cum.length - 1], width: opts.width || ROAD, kind: opts.kind || 'street', dead: opts.dead || null });
}
// A smooth road through control points [x, z, isNode]. It is split into edges at the points marked as nodes.
function road(ctrl, opts = {}) {
  const per = opts.per || 6, closed = !!opts.closed;
  const c = new THREE.CatmullRomCurve3(ctrl.map(([x, z]) => new THREE.Vector3(x, 0, z)), closed, 'centripetal');
  const n = closed ? ctrl.length : ctrl.length - 1;
  const start = closed ? ctrl.findIndex((p) => p[2]) : 0;
  let cur = [[ctrl[start][0], ctrl[start][1]]];
  for (let s = 0; s < n; s++) {
    const i = (start + s) % ctrl.length, j = (i + 1) % ctrl.length;
    for (let k = 1; k < per; k++) { const p = c.getPoint((i + k / per) / n); cur.push([p.x, p.z]); }
    cur.push([ctrl[j][0], ctrl[j][1]]);
    if (ctrl[j][2] || s === n - 1) { addEdge(cur, opts); cur = [[ctrl[j][0], ctrl[j][1]]]; }
  }
}
const street = (a, b, opts) => addEdge([a, b], opts);

// 1. the dense central grid, minus the four sides of the tower block
const G = [-15, -9, -3, 3, 9, 15];
const aroundTower = (a, b) => Math.abs(a[0]) === 3 && Math.abs(a[1]) === 3 && Math.abs(b[0]) === 3 && Math.abs(b[1]) === 3;
for (let i = 0; i < G.length; i++) for (let j = 0; j < G.length; j++) {
  if (i + 1 < G.length && !aroundTower([G[i], G[j]], [G[i + 1], G[j]])) street([G[i], G[j]], [G[i + 1], G[j]]);
  if (j + 1 < G.length && !aroundTower([G[i], G[j]], [G[i], G[j + 1]])) street([G[i], G[j]], [G[i], G[j + 1]]);
}
// 2. the roundabout around the tower plaza: four arcs through the corners of the tower block
const ROUNDABOUT = 3 * Math.SQRT2;
for (let q = 0; q < 4; q++) {
  const pts = [];
  for (let k = 0; k <= 8; k++) { const a = Math.PI / 4 + (q + k / 8) * (Math.PI / 2); pts.push([Math.cos(a) * ROUNDABOUT, Math.sin(a) * ROUNDABOUT]); }
  pts[0] = pts[0].map(Math.round); pts[8] = pts[8].map(Math.round);
  addEdge(pts, { kind: 'roundabout' });
}
// 3. the diagonal avenue, south-west to north-east, through the roundabout
const AV = { width: AVENUE, kind: 'avenue' };
street([-15, 15], [-9, 9], AV); street([-9, 9], [-3, 3], AV); street([3, -3], [9, -9], AV); street([9, -9], [15, -15], AV);
street([15, -15], [21, -21], AV); street([-15, 15], [-21.5, 21.5], AV);
// 4. the belt road: a curved loop around the core that follows the coast along the south side and the bay
road([
  [23.4, -3, 1], [24.2, -12], [21, -21, 1], [12, -24.5], [3, -23.3, 1], [-4, -23], [-9, -24.6, 1], [-18, -24], [-23.5, -19], [-25, -11],
  [-23.6, -3, 1], [-23, 4], [-24.6, 9, 1], [-24, 16], [-21.5, 21.5, 1], [-20.5, 28], [-12, 32.5], [-3, 30.6, 1], [4, 31], [9, 30.2, 1],
  [13.6, 26.6], [15.8, 21.8], [19.5, 15.6, 1], [25.3, 12.6], [27.2, 5], [24.8, 0.5],
], { closed: true, kind: 'belt' });
// 5. grid streets that reach the belt road
street([15, -3], [23.4, -3]); street([3, -15], [3, -23.3]); street([-9, -15], [-9, -24.6]); street([-15, -3], [-23.6, -3]);
street([-15, 9], [-24.6, 9]); street([-3, 15], [-3, 30.6]); street([9, 15], [9, 30.2]); street([15, 15], [19.5, 15.6]);
// 6. roads to nowhere: they leave the city and stop in empty land ('sign') or at the water ('rail')
road([[21, -21, 1], [24.6, -25.2], [29.3, -32.6, 1]], { width: AVENUE, kind: 'avenue', dead: 'rail' });
road([[-21.5, 21.5, 1], [-25.4, 24.8], [-30.6, 28, 1]], { width: AVENUE, kind: 'avenue', dead: 'rail' });
road([[-23.6, -3, 1], [-29, -4.4], [-34.5, -3, 1]], { dead: 'sign' });
road([[3, -23.3, 1], [3.6, -28.5], [6.8, -34, 1]], { dead: 'sign' });

// the belt road as a polygon: everything outside it is the flat 2D outskirts
const BELT = edges.filter((e) => e.kind === 'belt').flatMap((e) => e.pts.slice(0, -1));
function inCore(x, z) { return inPoly(BELT, x, z); }
function roadDist(x, z) { let m = Infinity; for (const e of edges) m = Math.min(m, lineDist(e.pts, x, z, false) - e.width / 2); return m; }
function inOutskirts(x, z, m = 1.5) { return landMargin(x, z, m) && !inCore(x, z) && lineDist(BELT, x, z, true) > m; }

// position on an edge, s units from its start, off units to the right. Returns the heading (yaw).
function edgePos(e, s, off, out) {
  let i = 1;
  while (i < e.cum.length - 1 && e.cum[i] < s) i++;
  const p0 = e.pts[i - 1], p1 = e.pts[i], L = e.cum[i] - e.cum[i - 1] || 1, k = (s - e.cum[i - 1]) / L;
  const tx = (p1[0] - p0[0]) / L, tz = (p1[1] - p0[1]) / L;
  out.set(p0[0] + (p1[0] - p0[0]) * k - tz * off, 0, p0[1] + (p1[1] - p0[1]) * k + tx * off);
  return Math.atan2(tx, tz);
}
function nearestNode(p) {
  let best = 0, bd = Infinity;
  nodes.forEach((n, i) => { const d = (n.x - p.x) ** 2 + (n.z - p.z) ** 2; if (d < bd) { bd = d; best = i; } });
  return best;
}

// ---------- Lots ----------
const LOT = 4.5;
// landmarks, by district. Partner Row is the south row, facing the harbour.
const SITES = {
  tower: [0, 0],                                   // Downtown
  bank: [-6, -6], guide: [6, 6],
  feel: [6, 12], ipod: [12, 12],                   // Partner Row
  arcade: [-6, 12],                                // Leisure
  factory: [12, -6],                               // Industrial
  // the buildings on the reserved sites below, and the two that stand on no lot
  pet: [0, 12], stadium: [-12, 25], datacentre: [18.8, -9.5],
  station: [0, 9],                                 // on the street, under the monorail
  pier: [18.2, 18],                                // beside the belt road, at the head of the bay
};
const RAIL_Y = 5.3;   // height of the monorail rail above street level
// the larger lots: [x, z, width, depth]
const RESERVED = {
  pet: [0, 12, LOT, LOT],                          // Partner Row
  stadium: [-12, 25, 10, 7.5],                     // Leisure
  park: [3, 25, 9, 7],
  datacentre: [18.8, -9.5, 4, 9.5],                // Industrial
};
// small lots beside the roundabout
const SMALL = [[6.6, 0], [-6.6, 0], [0, 6.6], [0, -6.6]].map(([x, z]) => ({ x, z, size: 3.2 }));
// blocks cut in two by the avenue: each half becomes a small green
const AVENUE_BLOCKS = [[-12, 12], [-6, 6], [6, -6], [12, -12]];
// lots for generic buildings: the free grid blocks, then a row outside each side of the grid
const GENERIC = [];
for (const [x, z] of [[-12, -12], [-6, -12], [0, -12], [6, -12], [-12, -6], [-12, 0], [12, 0], [-12, 6], [12, 6]]) GENERIC.push({ x, z, outer: false });
for (const v of [-12, -6, 0, 6, 12]) {
  GENERIC.push({ x: v, z: -18.5, outer: true }, { x: v, z: 18.5, outer: true }, { x: -18.5, z: v, outer: true });
  if (v >= 0) GENERIC.push(v === 12 ? { x: 18.1, z: 11.5, outer: true } : { x: 18.5, z: v, outer: true }); // the last one makes room for the harbour road
}
GENERIC.push({ x: -18.5, z: -18.5, outer: true });
// one lot stays empty so the stadium's big screen has open space behind it
GENERIC.splice(GENERIC.findIndex((l) => l.x === -12 && l.z === 18.5), 1);
// ground plates under every lot: [x, z, width, depth]
const PLATES = [
  ...['bank', 'guide', 'feel', 'ipod', 'arcade', 'factory'].map((k) => [SITES[k][0], SITES[k][1], LOT, LOT]),
  ...Object.values(RESERVED),
  ...SMALL.map((l) => [l.x, l.z, l.size, l.size]),
  ...GENERIC.map((l) => [l.x, l.z, LOT, LOT]),
];

export {
  ROAD, AVENUE, ROUNDABOUT, LOT, COAST, ISLETS, LAND, BOUNDS, onLand, groundY, landMargin, lineDist,
  nodes, edges, edgePos, nearestNode, roadDist, inCore, inOutskirts, BELT,
  SITES, RESERVED, RAIL_Y, SMALL, AVENUE_BLOCKS, GENERIC, PLATES,
};
