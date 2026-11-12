// Water, island, roads, lot plates, lamps, trees, shore glow, labels and the places registry.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { PLAT, WALK, GROUND, scene, camera, canvasTex, seeded, hooks } from './core.js';
import { plainWhite, glowTex } from './materials.js';
import { COAST, ISLETS, LAND, landMargin, nodes, edges, edgePos, PLATES, AVENUE_BLOCKS, AVENUE, LOT, ROUNDABOUT, ROAD } from './plan.js';

// ---------- Water ----------
const waterTex = canvasTex(256, 256, (g) => {
  g.fillStyle = '#0a1440'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(170,185,255,0.10)'; g.lineWidth = 2; g.lineCap = 'round';
  const r = seeded(7);
  for (let i = 0; i < 26; i++) { const x = r() * 256, y = r() * 256, l = 14 + r() * 26; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 4, x + l, y); g.stroke(); }
});
waterTex.wrapS = waterTex.wrapT = THREE.RepeatWrapping; waterTex.repeat.set(70, 70);
const water = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ map: waterTex }));
water.rotation.x = -Math.PI / 2; scene.add(water);

// ---------- Land: the island and its islets, extruded from the coastline ----------
const landMat = new THREE.MeshStandardMaterial({ color: 0x111a55, roughness: .95 });
const quayMat = new THREE.MeshStandardMaterial({ color: 0x0c1340, roughness: 1 });
const shoreLine = new THREE.LineBasicMaterial({ color: 0x4a5cc8 });
function landMesh(poly, h, mat) {
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z))), { depth: h, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, mat); m.receiveShadow = true; return m;
}
for (const poly of LAND) {
  scene.add(landMesh(poly, GROUND, landMat));
  let cx = 0, cz = 0; for (const [x, z] of poly) { cx += x / poly.length; cz += z / poly.length; }
  const grow = poly === COAST ? 1.012 : 1.06;
  scene.add(landMesh(poly.map(([x, z]) => [cx + (x - cx) * grow, cz + (z - cz) * grow]), 0.25, quayMat));
  scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(poly.map(([x, z]) => new THREE.Vector3(x, GROUND + 0.004, z))), shoreLine));
}

// ---------- Roads: one ribbon mesh built from the road graph ----------
const ROAD_COLOR = '#0d1338';
const roadTex = canvasTex(32, 128, (g) => {
  g.fillStyle = ROAD_COLOR; g.fillRect(0, 0, 32, 128);
  g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(15, 20, 2, 56);
  g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(1, 0, 1.5, 128); g.fillRect(29.5, 0, 1.5, 128);
});
roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
{
  const pos = [], uv = [], nor = [], idx = [];
  edges.forEach((e, ei) => {
    const y = GROUND + 0.006 + ei * 0.0002, hw = e.width / 2, base = pos.length / 3, n = e.pts.length;
    e.pts.forEach((p, i) => {
      const a = e.pts[Math.max(0, i - 1)], b = e.pts[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const tx = (b[0] - a[0]) / l, tz = (b[1] - a[1]) / l;
      pos.push(p[0] - tz * hw, y, p[1] + tx * hw, p[0] + tz * hw, y, p[1] - tx * hw);
      uv.push(0, e.cum[i] / 1.8, 1, e.cum[i] / 1.8); nor.push(0, 1, 0, 0, 1, 0);
      if (i) { const k = base + i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); }
    });
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const roads = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: roadTex, roughness: 1 }));
  roads.receiveShadow = true; scene.add(roads);
  // a plain disc on every junction and road end, so the ribbons join cleanly
  const discGeo = new THREE.CircleGeometry(0.5, 20); discGeo.rotateX(-Math.PI / 2);
  const discs = new THREE.InstancedMesh(discGeo, new THREE.MeshStandardMaterial({ color: ROAD_COLOR, roughness: 1 }), nodes.length);
  const m4 = new THREE.Matrix4();
  nodes.forEach((nd, i) => {
    const w = Math.max(...nd.edges.map((k) => edges[k].width)) * 1.04;
    discs.setMatrixAt(i, m4.makeScale(w, 1, w).setPosition(nd.x, GROUND + 0.03, nd.z));
  });
  discs.receiveShadow = true; scene.add(discs);
}

// ---------- Lot plates, the tower plaza and the greens along the avenue ----------
const plateMat = new THREE.MeshStandardMaterial({ color: 0x1d2a78, roughness: .95 });
const lawnMat = new THREE.MeshStandardMaterial({ color: 0x22358f, roughness: 1 });
// trees and lamps are collected here by every module, then built as instanced meshes by buildScatter()
const scatter = { trees: [], lamps: [] };
{
  const plates = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.04, 1), plateMat, PLATES.length);
  const m4 = new THREE.Matrix4();
  PLATES.forEach(([x, z, w, d], i) => plates.setMatrixAt(i, m4.makeScale(w, 1, d).setPosition(x, GROUND, z)));
  plates.receiveShadow = true; scene.add(plates);
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(ROUNDABOUT - ROAD / 2, 48), plateMat);
  plaza.rotation.x = -Math.PI / 2; plaza.position.y = GROUND + 0.02; plaza.receiveShadow = true; scene.add(plaza);
  // each block the avenue cuts gives two triangular greens
  const tri = [], rand = seeded(12), h = LOT / 2, cut = AVENUE * 0.75 + 0.2;
  for (const [bx, bz] of AVENUE_BLOCKS) for (const s of [-1, 1]) {
    const y = GROUND + 0.03, cx = bx + s * h, cz = bz + s * h;
    const a = [cx, cz], b = [cx, cz - s * (LOT - cut)], c = [cx - s * (LOT - cut), cz];
    const [p, q] = s > 0 ? [b, c] : [c, b];
    tri.push(a[0], y, a[1], p[0], y, p[1], q[0], y, q[1]);
    for (let k = 0; k < 3; k++) { const u = 0.15 + rand() * 0.3, v = 0.15 + rand() * 0.3; scatter.trees.push([cx + (b[0] - cx) * u + (c[0] - cx) * v, cz + (b[1] - cz) * u + (c[1] - cz) * v, 0.75 + rand() * 0.4]); }
  }
  const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(tri, 3)); tg.computeVertexNormals();
  const greens = new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ color: 0x22358f, roughness: 1, side: THREE.DoubleSide })); greens.receiveShadow = true; scene.add(greens);
}

// ---------- Street lamps along the roads ----------
{
  const v = new THREE.Vector3();
  for (const e of edges) {
    let side = 1;
    for (let s = 2.4; s < e.len - 1.6; s += 5.2, side = -side) {
      edgePos(e, s, side * (e.width / 2 + 0.3), v);
      if (landMargin(v.x, v.z, 0.4)) scatter.lamps.push([v.x, v.z]);
    }
  }
}

// Build the instanced trees and lamps. Call once, after every module has added its own.
function buildScatter() {
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  // trees: trunk, then a cone or a round crown
  const treeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .7 });
  const T = scatter.trees, cones = T.filter((_, i) => i % 2 === 0), balls = T.filter((_, i) => i % 2 === 1);
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.07, 0.5, 6), treeMat, T.length);
  T.forEach(([x, z, s], i) => trunks.setMatrixAt(i, m4.compose(p.set(x, GROUND + 0.3 * s, z), q, sc.setScalar(s))));
  const crown = (list, geo) => {
    const im = new THREE.InstancedMesh(geo, treeMat, list.length);
    list.forEach(([x, z, s], i) => im.setMatrixAt(i, m4.compose(p.set(x, GROUND + 1.0 * s, z), q, sc.setScalar(s))));
    im.castShadow = true; scene.add(im);
  };
  scene.add(trunks); crown(cones, new THREE.ConeGeometry(0.42, 1.1, 10)); crown(balls, new THREE.IcosahedronGeometry(0.45, 1));
  // lamps: pole, glow point and a soft pool of light on the ground
  const Lm = scatter.lamps, lampPts = [];
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.045, 1.5, 6), plainWhite, Lm.length);
  const poolGeo = new THREE.PlaneGeometry(2.6, 2.6); poolGeo.rotateX(-Math.PI / 2);
  const pools = new THREE.InstancedMesh(poolGeo, new THREE.MeshBasicMaterial({ map: glowTex, color: 0xfff6d8, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending }), Lm.length);
  Lm.forEach(([x, z], i) => {
    poles.setMatrixAt(i, m4.makeTranslation(x, GROUND + 0.75, z));
    pools.setMatrixAt(i, m4.makeTranslation(x, GROUND + 0.05, z));
    lampPts.push(x, GROUND + 1.55, z);
  });
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lampPts, 3));
  scene.add(poles, pools, new THREE.Points(lg, new THREE.PointsMaterial({ map: glowTex, color: 0xfff6d8, size: 1.35, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
}

// ---------- Fake reflections: a glow on the water around the shore, with streaks of warm and pale-blue light ----------
{
  const SPAN = 132, px = 1024 / SPAN, at = (v) => (v + SPAN / 2) * px;
  const shoreTex = canvasTex(1024, 1024, (g) => {
    g.clearRect(0, 0, 1024, 1024);
    g.shadowColor = 'rgba(90,110,255,0.85)'; g.shadowBlur = 42; g.fillStyle = 'rgba(90,110,255,0.85)';
    for (const poly of LAND) { g.beginPath(); poly.forEach(([x, z], i) => (i ? g.lineTo(at(x), at(z)) : g.moveTo(at(x), at(z)))); g.closePath(); g.fill(); }
    g.shadowBlur = 0;
    const r = seeded(31);
    for (let i = 0; i < 170; i++) {
      const k = Math.floor(r() * COAST.length), a = COAST[k], b = COAST[(k + 1) % COAST.length];
      let nx = b[1] - a[1], nz = -(b[0] - a[0]); const l = Math.hypot(nx, nz); nx /= l; nz /= l;
      if (landMargin(a[0] + nx, a[1] + nz, 0)) { nx = -nx; nz = -nz; } // point the streak out to sea
      const len = 8 + r() * 22, wdt = 2 + r() * 3, col = r() < 0.6 ? '255,246,216' : '199,199,255';
      g.save(); g.translate(at(a[0]), at(a[1])); g.rotate(Math.atan2(nz, nx) - Math.PI / 2);
      const gr = g.createLinearGradient(0, 0, 0, len);
      gr.addColorStop(0, `rgba(${col},${0.2 + r() * 0.3})`); gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr; g.fillRect(-wdt / 2, 0, wdt, len); g.restore();
    }
  });
  const shore = new THREE.Mesh(new THREE.PlaneGeometry(SPAN, SPAN), new THREE.MeshBasicMaterial({ map: shoreTex, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  shore.rotation.x = -Math.PI / 2; shore.position.y = 0.05; scene.add(shore);
}

// ---------- Labels ----------
const labels = [];
// near: only shown when the camera is close. prio: when two labels collide, the lower one is hidden
// (0 open plots, 1 buildings, 2 landmarks seen from afar, 3 the tower and Cashy).
function addLabel(obj, text, y, { cls = '', icon = '', dot = false, near = true, prio } = {}) {
  const el = document.createElement('div');
  el.className = 'tag3d ' + cls;
  if (icon) { const ic = document.createElement('span'); ic.className = 'ico'; ic.textContent = icon; el.appendChild(ic); }
  if (dot) { const d = document.createElement('span'); d.className = 'dot'; el.appendChild(d); }
  el.appendChild(document.createTextNode(text));
  const lab = new CSS2DObject(el);
  lab.position.set(0, y, 0);
  obj.add(lab);
  el.addEventListener('click', (e) => { e.stopPropagation(); hooks.select(obj); });
  if (prio === undefined) prio = cls.includes('plot') ? 0 : cls.includes('hero') ? 3 : near ? 1 : 2;
  labels.push({ lab, el, owner: obj, near, prio, w: 0, h: 0 });
  labels.sort((a, b) => b.prio - a.prio);
  return lab;
}
// Decide which labels show this frame: by distance, then hide the less important of any two that overlap on screen.
const lv = new THREE.Vector3(), kept = [];
function updateLabels() {
  kept.length = 0;
  const hw = innerWidth / 2, hh = innerHeight / 2;
  for (const pass of [true, false]) for (const l of labels) {
    if (l.el.classList.contains('is-active') !== pass) continue;   // the selected place's label goes first
    let show = !l.near || pass || camera.position.distanceToSquared(l.owner.position) < 62 * 62;
    if (show) {
      l.lab.getWorldPosition(lv).project(camera);
      if (!l.w && l.el.offsetWidth) { l.w = l.el.offsetWidth; l.h = l.el.offsetHeight; }
      const w = (l.w || 110) / 2 + 3, h = (l.h || 24) / 2 + 3, x = lv.x * hw + hw, y = -lv.y * hh + hh;
      for (const k of kept) if (Math.abs(k[0] - x) < k[2] + w && Math.abs(k[1] - y) < k[3] + h) { show = false; break; }
      if (show) kept.push([x, y, w, h]);
    }
    l.lab.visible = show;
  }
}

// ---------- Places registry ----------
const underglowMat = new THREE.MeshBasicMaterial({ map: glowTex, color: 0x8c9cff, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending });
const PLACES = [];
const ROOFS = [];
const BY_KEY = {};
function place(group, x, z, info, key) {
  group.position.set(x, GROUND, z);
  group.userData.info = info;
  scene.add(group);
  PLACES.push(group);
  if (key) {
    BY_KEY[key] = group;
    // landmarks get a soft pool of light around their base
    const r = key === 'tower' ? 7.4 : 6.2;
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(r, r), underglowMat);
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.02; group.add(glow);
  }
  return group;
}
function roof(g, dx, dz, y, r, tall = false) { ROOFS.push({ g, dx, dz, y: y + WALK, r, tall }); }

export { waterTex, lawnMat, scatter, buildScatter, labels, addLabel, updateLabels, PLACES, ROOFS, BY_KEY, place, roof };
