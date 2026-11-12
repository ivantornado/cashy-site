// Cashy: the walking, roof-jumping mascot.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BLUE, PLAT, GROUND, scene, canvasTex, rnd, put } from './core.js';
import { addLabel, PLACES, ROOFS, BY_KEY } from './world.js';
import { INFO } from './data.js';
import { advance, agentPos, tmp } from './traffic.js';
import { nodes, edges, nearestNode } from './plan.js';

// ---------- Cashy: the walking, jumping mascot ----------
const CASHY_SCALE = 1.35;
function makeCashy() {
  const root = new THREE.Group();
  const green = new THREE.MeshStandardMaterial({ color: 0x7fbf5f, roughness: .6 });
  const greenHi = new THREE.MeshStandardMaterial({ color: 0xaad98c, roughness: .6 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x0c0c12, roughness: .32, metalness: .15 });
  const denim = new THREE.MeshStandardMaterial({ color: 0x12121a, roughness: .85 });
  const shirt = new THREE.MeshStandardMaterial({ color: BLUE, roughness: .7 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xdfe5ff, roughness: .3, metalness: .4 });
  const lens = new THREE.MeshStandardMaterial({ color: 0x05050a, roughness: .12, metalness: .5 });
  const ink = new THREE.MeshStandardMaterial({ color: 0x0b0b2a, roughness: .4 });
  const sh = (m) => m;   // moving things cast no shadow (the shadow map is drawn once)
  // legs: black jeans and black boots
  const legs = [-0.17, 0.17].map((x) => {
    const pivot = new THREE.Group(); pivot.position.set(x, 0.62, 0);
    put(pivot, sh(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 10), denim)), 0, -0.25, 0);
    put(pivot, sh(new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.2, 0.34, 2, 0.05), leather)), 0, -0.5, 0.04);
    put(pivot, new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.04, 0.36), ink), 0, -0.6, 0.04);
    root.add(pivot); return pivot;
  });
  // Base-blue t-shirt, with the Feel.cash logo in the middle
  put(root, sh(new THREE.Mesh(new RoundedBoxGeometry(0.66, 0.62, 0.4, 3, 0.1), shirt)), 0, 0.95, 0);
  const logo = new THREE.TextureLoader().load(new URL('../assets/feelcash-logo.png', import.meta.url).href);
  logo.colorSpace = THREE.SRGBColorSpace;
  put(root, new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshBasicMaterial({ map: logo })), 0, 0.99, 0.204);
  // black leather jacket, open at the front: a back, two front panels, lapels, zips and a collar
  put(root, sh(new THREE.Mesh(new RoundedBoxGeometry(0.76, 0.66, 0.14, 2, 0.05), leather)), 0, 0.95, -0.17);
  for (const s of [-1, 1]) {
    put(root, sh(new THREE.Mesh(new RoundedBoxGeometry(0.25, 0.66, 0.46, 2, 0.06), leather)), s * 0.265, 0.95, 0);
    const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.26, 0.03), leather); lapel.rotation.z = s * 0.5; put(root, lapel, s * 0.175, 1.15, 0.236);
    put(root, new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.46, 0.012), steel), s * 0.142, 0.88, 0.232);
  }
  put(root, sh(new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.12, 0.2, 2, 0.04), leather)), 0, 1.3, -0.1);
  // the "8453" patch on the chest
  const patchTex = canvasTex(96, 48, (g) => {
    g.fillStyle = '#f2f4f8'; g.fillRect(0, 0, 96, 48);
    g.strokeStyle = '#0c0c12'; g.lineWidth = 4; g.strokeRect(3, 3, 90, 42);
    g.fillStyle = '#0c0c12'; g.font = 'bold 30px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('8453', 48, 26);
  });
  const patch = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.085), new THREE.MeshBasicMaterial({ map: patchTex })); patch.rotation.z = 0.12;
  put(root, patch, 0.272, 0.93, 0.2325);
  // arms: leather sleeves, green hands
  const arms = [-1, 1].map((side) => {
    const pivot = new THREE.Group(); pivot.position.set(side * 0.44, 1.2, 0);
    put(pivot, sh(new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.095, 0.46, 10), leather)), 0, -0.23, 0);
    put(pivot, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 10), steel), 0, -0.46, 0);
    put(pivot, sh(new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), green)), 0, -0.55, 0);
    root.add(pivot); return pivot;
  });
  // the head: a green banknote with "8453", black sunglasses and a cheeky grin
  const head = new THREE.Group(); head.position.y = 1.72; head.rotation.z = 0.1; root.add(head);
  head.add(sh(new THREE.Mesh(new RoundedBoxGeometry(1.05, 0.86, 0.1, 2, 0.04), green)));
  head.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.71, 0.102), greenHi));
  head.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.61, 0.104), green));
  const numTex = canvasTex(128, 32, (g) => { g.clearRect(0, 0, 128, 32); g.fillStyle = '#4f8f3a'; g.font = 'bold 22px Arial, sans-serif'; g.textBaseline = 'middle'; g.fillText('8453', 4, 17); });
  put(head, new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.07), new THREE.MeshBasicMaterial({ map: numTex, transparent: true })), -0.27, 0.25, 0.054);
  for (const x of [-0.18, 0.18]) {
    put(head, new THREE.Mesh(new RoundedBoxGeometry(0.31, 0.17, 0.045, 2, 0.02), lens), x, 0.02, 0.075);
    const glint = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.018, 0.01), steel); glint.rotation.z = 0.6; put(head, glint, x - 0.06, 0.05, 0.1);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.02), ink); brow.rotation.z = x < 0 ? -0.35 : 0.35; put(head, brow, x, 0.19, 0.06);
  }
  put(head, new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.03), lens), 0, 0.06, 0.075);
  const smirk = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.014, 6, 16, Math.PI * 0.7), ink); smirk.rotation.z = Math.PI * 1.2; put(head, smirk, 0.05, -0.17, 0.06);
  root.scale.setScalar(CASHY_SCALE);
  return { root, legs, arms, head };
}
const cashyRig = makeCashy();
const cashy = cashyRig.root;
cashy.userData.info = INFO.cashy;
scene.add(cashy); PLACES.push(cashy); BY_KEY.cashy = cashy;
addLabel(cashy, 'Cashy', 2.75, { cls: 'hero', dot: true, near: false });

const C = { state: 'walk', e: nodes[nearestNode({ x: 3, z: 9 })].edges[0], dir: 1, s: 1, off: 1.02, walkLeft: 4, p0: new THREE.Vector3(), p1: new THREE.Vector3(), u: 0, dur: 1, arc: 2, next: null, onRoof: null, hops: 0, idle: 0, ph: 0 };
function roofWorld(r, out) {
  const g = r.g, c = Math.cos(g.rotation.y), s = Math.sin(g.rotation.y);
  const jx = r.dx + (Math.random() - .5) * 2 * r.r, jz = r.dz + (Math.random() - .5) * 2 * r.r;
  return out.set(g.position.x + jx * c + jz * s, PLAT + r.y, g.position.z - jx * s + jz * c);
}
function roofChoices(from, maxD, allowTall, maxDy = 9) {
  return ROOFS.filter((r) => {
    if (!r.g.visible || r === C.onRoof) return false;
    if (r.tall && !allowTall) return false;
    if (!r.tall && Math.abs(PLAT + r.y - from.y) > maxDy) return false;
    const d = Math.hypot(r.g.position.x + r.dx - from.x, r.g.position.z + r.dz - from.z);
    return d > 2 && d < maxD;
  });
}
function startJump(target, next) {
  C.p0.copy(cashy.position); C.p1.copy(target);
  const d = Math.hypot(target.x - C.p0.x, target.z - C.p0.z), dy = Math.abs(target.y - C.p0.y);
  C.dur = 0.75 + d * 0.06 + dy * 0.035; C.arc = 1.6 + d * 0.22; C.u = 0; C.state = 'jump'; C.next = next;
  cashy.rotation.y = Math.atan2(target.x - C.p0.x, target.z - C.p0.z);
}
function jumpDown() {
  const n = nearestNode(cashy.position), opts = nodes[n].edges;
  C.e = opts[rnd(opts.length)]; C.dir = edges[C.e].a === n ? 1 : -1; C.s = 0;
  agentPos(C, tmp);
  startJump(new THREE.Vector3(tmp.x, GROUND, tmp.z), { kind: 'street' });
}
function pose(walkAmt, jumpAmt, wave, t) {
  const sw = Math.sin(C.ph) * 0.55 * walkAmt;
  cashyRig.legs[0].rotation.x = sw - 0.5 * jumpAmt;
  cashyRig.legs[1].rotation.x = -sw + 0.3 * jumpAmt;
  cashyRig.arms[0].rotation.x = -sw * 0.9; cashyRig.arms[1].rotation.x = sw * 0.9;
  cashyRig.arms[0].rotation.z = -2.4 * jumpAmt;
  cashyRig.arms[1].rotation.z = 2.4 * jumpAmt + (wave ? 2.5 + Math.sin(t * 9) * 0.35 : 0);
  cashyRig.head.rotation.x = -0.15 * jumpAmt;
}
function updateCashy(dt, t) {
  if (C.state === 'walk') {
    advance(C, 2.3 * dt);
    const yaw = agentPos(C, tmp);
    cashy.position.set(tmp.x, GROUND + Math.abs(Math.sin(C.ph)) * 0.08, tmp.z);
    cashy.rotation.y = yaw;
    C.ph += dt * 9; pose(1, 0, false, t);
    C.walkLeft -= dt;
    if (C.walkLeft <= 0) {
      const opts = roofChoices(cashy.position, 9, Math.random() < 0.12);
      if (opts.length) { const r = opts[rnd(opts.length)]; C.hops = 0; startJump(roofWorld(r, new THREE.Vector3()), { kind: 'roof', r }); }
      C.walkLeft = 6 + Math.random() * 6;
    }
  } else if (C.state === 'jump') {
    C.u = Math.min(1, C.u + dt / C.dur);
    cashy.position.lerpVectors(C.p0, C.p1, C.u);
    cashy.position.y += 4 * C.arc * C.u * (1 - C.u);
    pose(0, Math.sin(Math.PI * C.u), false, t);
    if (C.u >= 1) {
      if (C.next.kind === 'roof') { C.state = 'roof'; C.onRoof = C.next.r; C.hops++; C.idle = 0.8 + Math.random() * 1.4; }
      else { C.state = 'walk'; C.onRoof = null; C.walkLeft = 5 + Math.random() * 6; }
    }
  } else {
    C.idle -= dt;
    pose(0, 0, C.onRoof.tall || C.hops === 1, t);
    if (!C.onRoof.g.visible) { jumpDown(); return; }
    if (C.idle <= 0) {
      const opts = C.hops < 4 && Math.random() < 0.7 ? roofChoices(cashy.position, 10, false, 6) : [];
      if (opts.length) { const r = opts[rnd(opts.length)]; startJump(roofWorld(r, new THREE.Vector3()), { kind: 'roof', r }); }
      else jumpDown();
    }
  }
}
agentPos(C, tmp); cashy.position.set(tmp.x, GROUND, tmp.z);

export { CASHY_SCALE, cashy, updateCashy };
