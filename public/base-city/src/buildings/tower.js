// Landmark: NVDA Tower. The tallest building in the city; its crown is a giant chip with a glowing core.
// On every Payday it throws NVDA stock certificates and a few chips over the streets.
import * as THREE from 'three';
import { GROUND, CASHY_GREEN, canvasTex, put } from '../core.js';
import { plainWhite, glowSprite, block, solid, boxMats } from '../materials.js';
import { addLabel, place, roof } from '../world.js';
import { INFO } from '../data.js';
import { SITES } from '../plan.js';

const GREEN = '#a9dd8c';
const tower = new THREE.Group();
// the tower's own glow colour: Cashy green. It flashes towards white on Payday (see main.js).
const nvdaGlow = new THREE.MeshBasicMaterial({ color: CASHY_GREEN });
const CHIP = 3.6, CHIP_T = 0.55;   // the crown: width and thickness of the chip
let chipTop = 0;
{
  put(tower, block(3.8, 1.0, 3.8, 2), 0, 0.5, 0);
  const segs = [[3.2, 6], [2.8, 5], [2.4, 4], [2.0, 3.2]];
  let y = 1.0;
  for (const [w, h] of segs) {
    put(tower, block(w, h, w, 1), 0, y + h / 2, 0);
    put(tower, new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, 0.16, w + 0.14), nvdaGlow), 0, y + h - 0.02, 0);
    y += h;
  }
  for (const [x, z, sx, sz] of [[0, 1.62, 0.5, 0.08], [0, -1.62, 0.5, 0.08], [1.62, 0, 0.08, 0.5], [-1.62, 0, 0.08, 0.5]]) {
    put(tower, solid(new THREE.BoxGeometry(sx, 6.4, sz), plainWhite), x, 1 + 3.2, z);
  }

  // ---- the crown: a square chip on a short neck ----
  const neck = 0.7;
  put(tower, block(1.3, neck, 1.3, false), 0, y + neck / 2, 0);
  const cy = y + neck + CHIP_T / 2;
  chipTop = cy + CHIP_T / 2;
  // top face: circuit traces running from the core out to the pins
  const topTex = canvasTex(512, 512, (g) => {
    g.fillStyle = '#080d38'; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = GREEN; g.lineWidth = 5; g.lineCap = 'square';
    const N = 8, m = 512 * (0.35 / CHIP), step = (512 - 2 * m) / (N - 1), core = 512 * (1.5 / CHIP) / 2;
    for (let s = 0; s < 4; s++) {
      g.save(); g.translate(256, 256); g.rotate(s * Math.PI / 2); g.translate(-256, -256);
      for (let k = 0; k < N; k++) {
        const px = m + k * step, tx = 256 - core + (k + 0.5) * (2 * core / N), bend = 60 + Math.abs(k - (N - 1) / 2) * 16;
        g.beginPath(); g.moveTo(px, 0); g.lineTo(px, bend); g.lineTo(tx, bend + Math.abs(px - tx)); g.lineTo(tx, 256 - core); g.stroke();
      }
      g.restore();
    }
    g.strokeRect(14, 14, 484, 484);
    g.fillStyle = GREEN; g.beginPath(); g.arc(44, 468, 10, 0, Math.PI * 2); g.fill();   // the pin-1 dot
    g.font = 'bold 30px "Courier New", monospace'; g.textAlign = 'right'; g.fillText('8453', 484, 478);
  });
  const pack = new THREE.MeshStandardMaterial({ color: 0x080d38, roughness: .5 });
  const top = new THREE.MeshBasicMaterial({ map: topTex });
  const chipGeo = new THREE.BoxGeometry(CHIP, CHIP_T, CHIP);
  const chip = new THREE.Mesh(chipGeo, boxMats(chipGeo, pack, top, pack));
  chip.castShadow = true;
  chip.add(new THREE.LineSegments(new THREE.EdgesGeometry(chipGeo), new THREE.LineBasicMaterial({ color: CASHY_GREEN })));
  put(tower, chip, 0, cy, 0);
  // pins: eight on each side, each one a short arm and a leg bent down
  const N = 8, arms = new THREE.InstancedMesh(new THREE.BoxGeometry(0.17, 0.1, 0.42), nvdaGlow, N * 4), legs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.17, 0.42, 0.1), nvdaGlow, N * 4);
  const m4 = new THREE.Matrix4(), rot = new THREE.Matrix4();
  for (let s = 0; s < 4; s++) for (let k = 0; k < N; k++) {
    const along = -CHIP / 2 + 0.35 + k * ((CHIP - 0.7) / (N - 1));
    rot.makeRotationY(s * Math.PI / 2);
    arms.setMatrixAt(s * N + k, m4.copy(rot).multiply(new THREE.Matrix4().makeTranslation(along, cy, CHIP / 2 + 0.2)));
    legs.setMatrixAt(s * N + k, m4.copy(rot).multiply(new THREE.Matrix4().makeTranslation(along, cy - 0.17, CHIP / 2 + 0.37)));
  }
  tower.add(arms, legs);
  // the glowing core
  const core = put(tower, new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 1.5), new THREE.MeshBasicMaterial({ color: 0xeaffdc })), 0, chipTop + 0.09, 0);
  const halo = put(tower, glowSprite(4.4), 0, chipTop + 0.5, 0);
  halo.material.color.set(0xc9f5ae);
  tower.userData.core = core; tower.userData.halo = halo; tower.userData.glow = nvdaGlow;

  // vertical sign
  const signTex = canvasTex(64, 256, (g) => {
    g.fillStyle = '#000033'; g.fillRect(0, 0, 64, 256);
    g.strokeStyle = GREEN; g.lineWidth = 4; g.strokeRect(2, 2, 60, 252);
    g.fillStyle = GREEN; g.font = 'bold 46px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    ['N', 'V', 'D', 'A'].forEach((ch, i) => g.fillText(ch, 32, 38 + i * 60));
  });
  const sm = new THREE.MeshBasicMaterial({ map: signTex });
  put(tower, new THREE.Mesh(new THREE.PlaneGeometry(0.95, 3.8), sm), 0.7, 9.6, 1.41);
  const s2 = put(tower, new THREE.Mesh(new THREE.PlaneGeometry(0.95, 3.8), sm), 1.41, 9.6, -0.7); s2.rotation.y = Math.PI / 2;
  addLabel(tower, 'NVDA Tower', chipTop + 2.6, { dot: true, near: false, prio: 3 });
}
place(tower, ...SITES.tower, INFO.tower, 'tower');
roof(tower, 1.25, 1.25, chipTop, 0.12, true);   // Cashy can stand on a corner of the chip
const TOWER_TOP = new THREE.Vector3(SITES.tower[0], GROUND + chipTop + 0.6, SITES.tower[1]);

export { tower, TOWER_TOP };
