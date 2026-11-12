// Walking bots and cars. They move along the road graph (plan.js), as two instanced meshes each.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BLUE, GROUND, scene, rnd } from './core.js';
import { plainWhite } from './materials.js';
import { nodes, edges, edgePos, ROAD } from './plan.js';

// An agent travels along edge `e` in direction `dir` (1: a to b, -1: b to a), `s` units from where it entered.
// `off` is its distance to the right of the centre line, in its own direction of travel.
function spawn(off, speed) {
  const e = rnd(edges.length);
  return { e, dir: Math.random() < 0.5 ? 1 : -1, s: Math.random() * edges[e].len, off, speed, ph: Math.random() * 6 };
}
function advance(a, dist) {
  a.s += dist;
  while (a.s >= edges[a.e].len) {
    const e = edges[a.e];
    a.s -= e.len;
    const at = a.dir > 0 ? e.b : e.a;
    const opts = nodes[at].edges.filter((k) => k !== a.e);
    if (opts.length) { a.e = opts[rnd(opts.length)]; a.dir = edges[a.e].a === at ? 1 : -1; }
    else a.dir = -a.dir; // a road to nowhere: turn around
  }
}
// world position (x, z) of an agent; returns its heading
function agentPos(a, out) {
  const e = edges[a.e], wide = (e.width - ROAD) / 2 * Math.sign(a.off);
  if (a.dir > 0) return edgePos(e, a.s, a.off + wide, out);
  return edgePos(e, e.len - a.s, -(a.off + wide), out) + Math.PI;
}

const MAX_BOTS = 70, MAX_CARS = 16;
const botMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .45 });
const botBody = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.15, 0.34, 4, 8), botMat, MAX_BOTS);
const botHead = new THREE.InstancedMesh(new THREE.SphereGeometry(0.14, 12, 10), botMat, MAX_BOTS);
const carGeo = new RoundedBoxGeometry(0.46, 0.3, 0.95, 2, 0.1); carGeo.translate(0, 0.22, 0);
const glassGeo = new THREE.BoxGeometry(0.38, 0.14, 0.42); glassGeo.translate(0, 0.42, -0.05);
const carBody = new THREE.InstancedMesh(carGeo, plainWhite, MAX_CARS);
const carGlass = new THREE.InstancedMesh(glassGeo, new THREE.MeshBasicMaterial({ color: BLUE }), MAX_CARS);
for (const m of [botBody, botHead, carBody, carGlass]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; scene.add(m); }

const bots = Array.from({ length: MAX_BOTS }, () => spawn((Math.random() < .5 ? -1 : 1) * (0.92 + Math.random() * 0.3), 0.8 + Math.random() * 0.7));
const cars = Array.from({ length: MAX_CARS }, () => spawn(0.36, 4 + Math.random() * 2.5));

const tmp = new THREE.Vector3();
const m4 = new THREE.Matrix4();
function updateTraffic(dt, t) {
  for (let i = 0; i < botBody.count; i++) {
    const b = bots[i];
    advance(b, b.speed * dt);
    agentPos(b, tmp);
    const y = GROUND + Math.abs(Math.sin(t * 8 * b.speed + b.ph)) * 0.06;
    botBody.setMatrixAt(i, m4.makeTranslation(tmp.x, y + 0.32, tmp.z));
    botHead.setMatrixAt(i, m4.makeTranslation(tmp.x, y + 0.72, tmp.z));
  }
  for (let i = 0; i < carBody.count; i++) {
    const c = cars[i];
    advance(c, c.speed * dt);
    const yaw = agentPos(c, tmp);
    m4.makeRotationY(yaw).setPosition(tmp.x, GROUND + 0.02, tmp.z);
    carBody.setMatrixAt(i, m4); carGlass.setMatrixAt(i, m4);
  }
  botBody.instanceMatrix.needsUpdate = botHead.instanceMatrix.needsUpdate = true;
  carBody.instanceMatrix.needsUpdate = carGlass.instanceMatrix.needsUpdate = true;
}

export { spawn, advance, agentPos, tmp, updateTraffic };
