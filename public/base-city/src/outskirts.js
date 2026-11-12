// The 2D outskirts: beyond the belt road the city is drawn flat and cheap, like a map.
// Street lines on the ground, building silhouettes as flat cards that turn to the camera, a few blinking lights,
// and a far skyline across the water that fades into the fog. Also the barriers at the ends of the roads to nowhere.
import * as THREE from 'three';
import { GROUND, scene, camera, canvasTex, seeded, signTex, put } from './core.js';
import { plainWhite, indigoMat, glowTex } from './materials.js';
import { nodes, edges, inOutskirts, roadDist, ISLETS } from './plan.js';
import { scatter } from './world.js';

const rand = seeded(404);

// ---------- Street lines on the ground ----------
{
  const pts = [], y = GROUND + 0.02;
  // wobbly lines in both directions, drawn only where the land is outskirts, with a gap now and then
  for (const flip of [false, true]) {
    for (let g = -46; g <= 42; g += 3.4 + rand() * 3.2) {
      let prev = null, gap = 0;
      const ph = rand() * 6;
      for (let t = -46; t <= 42; t += 1.4) {
        const w = g + Math.sin(t * 0.13 + ph) * 0.9;
        const x = flip ? t : w, z = flip ? w : t;
        if (rand() < 0.035) gap = 2 + Math.floor(rand() * 3);
        const ok = gap-- <= 0 && inOutskirts(x, z, 1.3) && roadDist(x, z) > 1.0;
        if (ok && prev) pts.push(prev[0], y, prev[1], x, y, z);
        prev = ok ? [x, z] : null;
      }
    }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  scene.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x5a6cdc, transparent: true, opacity: 0.6 })));
}

// ---------- Building silhouettes ----------
// three outline drawings; each is one instanced mesh of flat cards
function silhouetteTex(kind) {
  const t = canvasTex(128, 256, (g) => {
    const r = seeded(60 + kind);
    g.clearRect(0, 0, 128, 256);
    g.scale(2, 2);
    g.beginPath();
    if (kind === 0) g.rect(6, 14, 52, 114);
    else if (kind === 1) { g.moveTo(6, 128); g.lineTo(6, 52); g.lineTo(18, 52); g.lineTo(18, 24); g.lineTo(46, 24); g.lineTo(46, 52); g.lineTo(58, 52); g.lineTo(58, 128); }
    else { g.moveTo(8, 128); g.lineTo(8, 40); g.lineTo(30, 22); g.lineTo(30, 2); g.lineTo(33, 2); g.lineTo(33, 22); g.lineTo(56, 40); g.lineTo(56, 128); }
    g.closePath();
    g.fillStyle = '#101a58'; g.fill();
    g.save(); g.clip();
    for (let y = 34; y < 124; y += 12) for (let x = 12; x < 52; x += 10) {
      const v = r();
      g.fillStyle = v < 0.15 ? '#fff6d8' : v < 0.25 ? '#c7c7ff' : '#1c2878';
      g.fillRect(x, y, 5, 6);
    }
    g.restore();
    g.lineWidth = 2.5; g.strokeStyle = '#4f62d6'; g.stroke();
  });
  t.magFilter = THREE.LinearFilter;
  return t;
}
const cardGeo = new THREE.PlaneGeometry(1, 1); cardGeo.translate(0, 0.5, 0);
const cards = [[], [], []];      // per drawing: { x, y, z, w, h }
const lights = [[], [], []];     // blinking lights, in three groups that blink out of step
// outskirts on the island
for (let i = 0, made = 0; i < 1400 && made < 125; i++) {
  const x = -46 + rand() * 88, z = -46 + rand() * 86;
  if (!inOutskirts(x, z, 2.2) || roadDist(x, z) < 1.8) continue;
  const h = 1.3 + rand() * rand() * 3.8, w = 1.6 + rand() * 1.8;
  cards[made % 3].push({ x, y: GROUND, z, w, h });
  if (rand() < 0.2) lights[made % 2].push(x, GROUND + h + 0.25, z);
  made++;
}
// the far skyline, across the water
const farLights = [];
for (let i = 0; i < 150; i++) {
  const a = rand() * Math.PI * 2, d = 215 + rand() * 60, h = 14 + rand() * rand() * 40, w = 10 + rand() * 12; // far enough to sit deep in the fog
  cards[i % 3].push({ x: Math.cos(a) * d, y: 0, z: Math.sin(a) * d, w, h });
  if (rand() < 0.3) farLights.push(Math.cos(a) * d, h + 1, Math.sin(a) * d);
}
const cardMeshes = cards.map((list, kind) => {
  const im = new THREE.InstancedMesh(cardGeo, new THREE.MeshBasicMaterial({ map: silhouetteTex(kind), alphaTest: 0.5, side: THREE.DoubleSide }), list.length);
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; scene.add(im);
  return im;
});

// ---------- Islets: a few trees and a light ----------
for (const poly of ISLETS) {
  let cx = 0, cz = 0; for (const [x, z] of poly) { cx += x / poly.length; cz += z / poly.length; }
  for (let k = 0; k < 5; k++) { const a = rand() * 6.28, r = rand() * 1.6; scatter.trees.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r, 0.8 + rand() * 0.6]); }
  lights[2].push(cx, GROUND + 2.2, cz);
  put(scene, new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.2, 6), plainWhite), cx, GROUND + 1.1, cz);
}

// ---------- Roads to nowhere: a barrier where each one stops ----------
const stripeTex = canvasTex(128, 32, (g) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 32);
  g.fillStyle = '#0000ff';
  for (let x = -32; x < 160; x += 32) { g.beginPath(); g.moveTo(x, 32); g.lineTo(x + 16, 32); g.lineTo(x + 32, 0); g.lineTo(x + 16, 0); g.closePath(); g.fill(); }
});
const stripeMat = new THREE.MeshBasicMaterial({ map: stripeTex });
const soonMat = new THREE.MeshBasicMaterial({ map: signTex('COMING SOON', { w: 256, h: 56, bg: '#000033', font: 'bold 30px Arial, sans-serif' }) });
const box = (w, h, d, mat = plainWhite) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = true; return m; };
nodes.forEach((nd) => {
  if (nd.edges.length !== 1) return;
  const e = edges[nd.edges[0]], atB = nodes[e.b] === nd;
  const p = e.pts[atB ? e.pts.length - 1 : 0], q = e.pts[atB ? e.pts.length - 2 : 1];
  const g = new THREE.Group();
  g.position.set(p[0], GROUND, p[1]); g.rotation.y = Math.atan2(p[0] - q[0], p[1] - q[1]); // local +z points off the end of the road
  const half = e.width / 2 + 0.25;
  if (e.dead === 'sign') {
    for (const x of [-half, half]) put(g, box(0.09, 1.4, 0.09), x, 0.7, 0.35);
    put(g, box(half * 2 + 0.3, 0.34, 0.06, stripeMat), 0, 0.62, 0.35);
    put(g, new THREE.Mesh(new THREE.PlaneGeometry(half * 2 - 0.1, 0.4), soonMat), 0, 1.2, 0.31).rotation.y = Math.PI; // readable from the road
    put(g, box(half * 2 - 0.1, 0.4, 0.05, indigoMat), 0, 1.2, 0.35);
    for (const x of [-half, half]) lights[1].push(p[0] + Math.cos(g.rotation.y) * x + Math.sin(g.rotation.y) * 0.35, GROUND + 1.5, p[1] - Math.sin(g.rotation.y) * x + Math.cos(g.rotation.y) * 0.35);
  } else {
    // a guardrail at the water's edge, broken in the middle
    for (const x of [-half, -half * 0.35, half * 0.4, half]) put(g, box(0.08, 0.55, 0.08), x, 0.27, 0.3);
    put(g, box(half * 0.75, 0.16, 0.05), -half * 0.67, 0.42, 0.3);
    const hang = put(g, box(half * 0.7, 0.16, 0.05), half * 0.62, 0.3, 0.34); hang.rotation.z = -0.45; hang.rotation.y = 0.25;
    const fallen = put(g, box(half * 0.6, 0.16, 0.05), -0.1, 0.05, 0.75); fallen.rotation.x = Math.PI / 2; fallen.rotation.z = 0.5;
    put(g, box(half * 2 + 0.2, 0.05, 0.3, indigoMat), 0, 0.03, 0.05);
    lights[0].push(p[0] + Math.sin(g.rotation.y) * 0.3, GROUND + 0.8, p[1] + Math.cos(g.rotation.y) * 0.3);
  }
  scene.add(g);
});

// ---------- Blinking lights ----------
function points(list, color, size) {
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(list, 3));
  const mat = new THREE.PointsMaterial({ map: glowTex, color, size, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const p = new THREE.Points(geo, mat); p.frustumCulled = false; scene.add(p); return mat;
}
const blink = [points(lights[0], 0xfff6d8, 1.5), points(lights[1], 0xc7c7ff, 1.6), points(lights[2], 0xfff6d8, 1.6), points(farLights, 0xc7c7ff, 9)];

// ---------- Per frame ----------
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
let lastX = Infinity, lastZ = Infinity;
function updateOutskirts(t, still) {
  // turn every card to face the camera (around the vertical axis); only when the camera has moved
  if (Math.abs(camera.position.x - lastX) + Math.abs(camera.position.z - lastZ) > 0.05) {
    lastX = camera.position.x; lastZ = camera.position.z;
    cards.forEach((list, kind) => {
      list.forEach((c, i) => {
        q.setFromAxisAngle(up, Math.atan2(lastX - c.x, lastZ - c.z));
        cardMeshes[kind].setMatrixAt(i, m4.compose(pos.set(c.x, c.y, c.z), q, sc.set(c.w, c.h, 1)));
      });
      cardMeshes[kind].instanceMatrix.needsUpdate = true;
    });
  }
  if (still) return;
  blink.forEach((mat, i) => { mat.opacity = 0.25 + 0.75 * THREE.MathUtils.smoothstep(Math.sin(t * (0.9 + i * 0.37) + i * 2.1), -0.2, 0.2); });
}

export { updateOutskirts };
