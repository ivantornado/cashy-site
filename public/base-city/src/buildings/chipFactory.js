// Landmark: Chip Factory. A clean-room factory: a flat white building with a glass sawtooth roof,
// a conveyor of chips coming out of the front, a tall wafer-shaped sign, and chips floating up from the vents.
import * as THREE from 'three';
import { CASHY_GREEN, canvasTex, seeded, signTex, put } from '../core.js';
import { plainWhite, indigoMat, chipMesh, block, solid } from '../materials.js';
import { addLabel, place, roof } from '../world.js';
import { INFO } from '../data.js';
import { SITES } from '../plan.js';

const factory = new THREE.Group();
const W = 3.9, D = 2.5, H = 1.7, ZC = -0.75, FRONT = ZC + D / 2;   // the hall, set back to leave room for the conveyor
const BELT_X = -1.0, BELT_LEN = 1.3, BELT_Y = 0.62;
const VENTS = [[-1.35, ZC - 0.75], [-0.55, ZC - 0.75]], VENT_TOP = H + 2.0;
const beltChips = [], floating = [];
{
  put(factory, block(W, H, D, 2), 0, H / 2, ZC);
  // glass sawtooth roof, lit from inside
  const glassLit = new THREE.MeshStandardMaterial({ color: 0xaab6ff, emissive: 0x6f7fe0, emissiveIntensity: 0.55, roughness: .15 });
  const sh = new THREE.Shape(); const teeth = 4, s = W / teeth;
  sh.moveTo(0, 0); for (let i = 0; i < teeth; i++) { sh.lineTo(i * s, 0.8); sh.lineTo((i + 1) * s, 0); } sh.closePath();
  const saw = new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: false }); saw.translate(-W / 2, 0, ZC - D / 2);
  put(factory, solid(saw, [plainWhite, glassLit]), 0, H, 0);
  // vents
  const greenGlow = new THREE.MeshBasicMaterial({ color: CASHY_GREEN });
  for (const [x, z] of VENTS) {
    put(factory, solid(new THREE.CylinderGeometry(0.24, 0.3, VENT_TOP - H, 16), plainWhite, false), x, H + (VENT_TOP - H) / 2, z);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.045, 6, 20), greenGlow); lip.rotation.x = Math.PI / 2; put(factory, lip, x, VENT_TOP, z);
  }
  // conveyor: out of a hatch in the front wall, into a crate
  put(factory, new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), indigoMat), BELT_X, BELT_Y + 0.2, FRONT + 0.012);
  put(factory, solid(new THREE.BoxGeometry(0.8, 0.1, BELT_LEN), plainWhite), BELT_X, BELT_Y - 0.08, FRONT + BELT_LEN / 2);
  put(factory, new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, BELT_LEN), indigoMat), BELT_X, BELT_Y - 0.015, FRONT + BELT_LEN / 2);
  for (const x of [-0.34, 0.34]) put(factory, new THREE.Mesh(new THREE.BoxGeometry(0.06, BELT_Y - 0.1, 0.06), plainWhite), BELT_X + x, (BELT_Y - 0.1) / 2, FRONT + BELT_LEN - 0.08);
  put(factory, solid(new THREE.BoxGeometry(0.95, 0.4, 0.45), indigoMat), BELT_X, 0.2, FRONT + BELT_LEN + 0.2);
  for (let k = 0; k < 4; k++) beltChips.push(put(factory, chipMesh(0.34), BELT_X, BELT_Y + 0.035, FRONT));
  // the wafer sign: a silicon wafer on a tall mast
  const waferTex = canvasTex(256, 256, (g) => {
    const r = seeded(11);
    g.clearRect(0, 0, 256, 256);
    g.save(); g.beginPath(); g.arc(128, 128, 122, Math.PI * 0.62, Math.PI * 0.38); g.closePath(); g.clip();   // a disc with the flat at the bottom
    const gr = g.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, '#f4f6ff'); gr.addColorStop(0.5, '#c7c7ff'); gr.addColorStop(1, '#e9ffe0');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    for (let x = 16; x < 240; x += 28) for (let y = 16; y < 240; y += 28) {
      const v = r();
      g.fillStyle = v < 0.22 ? '#a9dd8c' : v < 0.34 ? '#0000ff' : 'rgba(0,0,255,0.10)';
      g.fillRect(x + 2, y + 2, 24, 24);
    }
    g.restore();
    g.beginPath(); g.arc(128, 128, 120, Math.PI * 0.62, Math.PI * 0.38); g.closePath();
    g.lineWidth = 6; g.strokeStyle = '#a9dd8c'; g.stroke();
  });
  const MAST = [1.55, FRONT + 0.75];
  put(factory, new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 4.6, 8), plainWhite), MAST[0], 2.3, MAST[1]);
  const wafer = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 2.1), new THREE.MeshBasicMaterial({ map: waferTex, alphaTest: 0.5, side: THREE.DoubleSide }));
  put(factory, wafer, MAST[0], 5.3, MAST[1]);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.4), new THREE.MeshBasicMaterial({ map: signTex('CHIPS', { w: 256, h: 68, font: 'bold 42px Arial, sans-serif' }) }));
  put(factory, board, 0.75, 1.0, FRONT + 0.012);
  // chips that float up from the vents
  for (let k = 0; k < 6; k++) { const m = chipMesh(0.3); m.visible = false; factory.add(m); floating.push({ m, life: 9, ph: 0 }); }
  factory.rotation.y = Math.PI / 4;
  addLabel(factory, 'Chip Factory', 7.0);
}
place(factory, ...SITES.factory, INFO.factory, 'factory');
roof(factory, 0.08, ZC, H + 0.8, 0.06);

let ventTimer = 0;
function updateFactory(dt, t) {
  // the belt: chips ride out of the hatch and drop into the crate
  beltChips.forEach((c, k) => {
    const u = (t * 0.22 + k / beltChips.length) % 1;
    c.position.z = FRONT + 0.1 + u * (BELT_LEN - 0.05);
    c.position.y = BELT_Y + 0.035 - Math.max(0, u - 0.9) * 2.5;
    c.rotation.x = Math.max(0, u - 0.9) * 9;
  });
  // the vents
  ventTimer -= dt;
  if (ventTimer <= 0) {
    const p = floating.find((q) => !q.m.visible);
    if (p) { const v = VENTS[Math.random() < .5 ? 0 : 1]; p.m.position.set(v[0], VENT_TOP + 0.1, v[1]); p.life = 0; p.ph = Math.random() * 6; p.m.visible = true; }
    ventTimer = 0.9;
  }
  for (const p of floating) {
    if (!p.m.visible) continue;
    p.life += dt; p.m.position.y += dt * 1.1; p.m.position.x += Math.sin(t * 2 + p.ph) * 0.006;
    p.m.rotation.y += dt * 2; p.m.rotation.x = Math.sin(p.life * 4 + p.ph) * 0.6;
    p.m.scale.setScalar(0.3 * Math.min(1, p.life * 4, Math.max(0, (3.2 - p.life) / 0.8)));
    if (p.life > 3.2) p.m.visible = false;
  }
}

export { factory, updateFactory };
