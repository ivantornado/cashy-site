// Landmark: Bank.
import * as THREE from 'three';
import { signTex, put } from '../core.js';
import { topMat, plainWhite, block, solid } from '../materials.js';
import { addLabel, place, roof } from '../world.js';
import { INFO } from '../data.js';
import { SITES } from '../plan.js';

// ---------- Landmark: Bank (a small temple) ----------
const bank = new THREE.Group();
{
  [[4.2, 0], [3.95, 0.18], [3.7, 0.36]].forEach(([w, y]) => put(bank, block(w, 0.18, w * 0.86, false), 0, y + 0.09, 0));
  put(bank, block(2.5, 2.4, 2.0, 2), 0, 0.54 + 1.2, 0);
  const colGeo = new THREE.CylinderGeometry(0.12, 0.14, 2.4, 12), capGeo = new THREE.BoxGeometry(0.34, 0.1, 0.34);
  const cols = [];
  for (let i = 0; i < 6; i++) { cols.push([-1.6 + i * 0.64, 1.38], [-1.6 + i * 0.64, -1.38]); }
  for (let i = 1; i < 4; i++) { cols.push([-1.6, -1.38 + i * 0.69], [1.6, -1.38 + i * 0.69]); }
  for (const [x, z] of cols) {
    const c = new THREE.Mesh(colGeo, plainWhite); c.castShadow = true; put(bank, c, x, 0.54 + 1.2, z);
    put(bank, new THREE.Mesh(capGeo, plainWhite), x, 0.54 + 2.45, z);
  }
  put(bank, block(3.7, 0.34, 3.2, false), 0, 0.54 + 2.4 + 0.27, 0);
  const tri = new THREE.Shape(); tri.moveTo(-1.85, 0); tri.lineTo(1.85, 0); tri.lineTo(0, 0.95); tri.closePath();
  const ped = new THREE.ExtrudeGeometry(tri, { depth: 3.2, bevelEnabled: false }); ped.translate(0, 0, -1.6);
  put(bank, solid(ped, [topMat, plainWhite]), 0, 0.54 + 2.4 + 0.44, 0);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.26), new THREE.MeshBasicMaterial({ map: signTex('BANK', { w: 256, h: 44, bg: '#ffffff', fg: '#0000ff', font: 'bold 34px Georgia, serif' }) }));
  put(bank, sign, 0, 0.54 + 2.4 + 0.27, 1.61);
  addLabel(bank, 'Bank', 5.6);
}
place(bank, ...SITES.bank, INFO.bank, 'bank');
roof(bank, 0, 0, 4.33, 0.05);
