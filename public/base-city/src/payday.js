// Payday: NVDA stock certificates thrown from the tower, with a few chips that fall and bounce.
import * as THREE from 'three';
import { scene, canvasTex } from './core.js';
import { chipMesh } from './materials.js';
import { groundY } from './plan.js';
import { TOWER_TOP } from './buildings/tower.js';

const certTex = canvasTex(160, 96, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#0000ff'; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10);
  g.lineWidth = 2; g.strokeRect(14, 14, w - 28, h - 28);
  g.fillStyle = '#0000ff'; g.font = 'bold 34px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('NVDA', w / 2, h / 2 - 4);
  g.font = 'bold 11px Arial, sans-serif'; g.fillText('STOCK', w / 2, h / 2 + 22);
  g.fillStyle = '#a9dd8c'; g.beginPath(); g.arc(w - 30, h - 28, 7, 0, Math.PI * 2); g.fill();   // a green seal
});
const certGeo = new THREE.PlaneGeometry(0.95, 0.57);
const certs = [];
for (let k = 0; k < 90; k++) {
  const m = new THREE.Mesh(certGeo, new THREE.MeshStandardMaterial({ map: certTex, side: THREE.DoubleSide, transparent: true, roughness: .6 }));
  m.visible = false; scene.add(m);
  certs.push({ m, v: new THREE.Vector3(), spin: new THREE.Vector3(), landed: false, life: 0, ph: 0 });
}
const CHIP_SIZE = 0.55;
const chips = [];
for (let k = 0; k < 16; k++) {
  const m = chipMesh(CHIP_SIZE); m.visible = false; scene.add(m);
  chips.push({ m, v: new THREE.Vector3(), spin: new THREE.Vector3(), bounces: 0, rest: false, life: 0 });
}
function launch(o, speed, lift) {
  const a = Math.random() * Math.PI * 2, hs = speed * (0.5 + Math.random());
  o.m.position.copy(TOWER_TOP).add(new THREE.Vector3((Math.random() - .5) * 1.2, 0, (Math.random() - .5) * 1.2));
  o.v.set(Math.cos(a) * hs, lift * (0.7 + Math.random() * 0.9), Math.sin(a) * hs);
  o.spin.set((Math.random() - .5) * 6, (Math.random() - .5) * 6, (Math.random() - .5) * 6);
  o.life = 0; o.m.visible = true;
}
function throwStocks(n) {
  let made = 0;
  for (const c of certs) {
    if (c.m.visible) continue;
    launch(c, 3.6, 5);
    c.landed = false; c.ph = Math.random() * 6; c.m.material.opacity = 1;
    if (++made >= n) break;
  }
  made = 0;
  for (const c of chips) {
    if (c.m.visible) continue;
    launch(c, 4.2, 4);
    c.bounces = 0; c.rest = false; c.m.scale.setScalar(CHIP_SIZE);
    if (++made >= Math.round(n / 5)) break;
  }
}
function updateStocks(dt, t) {
  // certificates flutter down and fade on the ground
  for (const c of certs) {
    if (!c.m.visible) continue;
    if (!c.landed) {
      c.v.y -= 6 * dt; if (c.v.y < -2) c.v.y = -2;
      const damp = Math.exp(-0.55 * dt); c.v.x *= damp; c.v.z *= damp;
      c.m.position.addScaledVector(c.v, dt);
      c.m.position.x += Math.sin(t * 3 + c.ph) * 0.012;
      c.m.rotation.x += c.spin.x * dt; c.m.rotation.y += c.spin.y * dt; c.m.rotation.z += c.spin.z * dt;
      const gy = groundY(c.m.position.x, c.m.position.z) + 0.04;
      if (c.m.position.y <= gy) { c.landed = true; c.m.position.y = gy + Math.random() * 0.01; c.m.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI); }
    } else {
      c.life += dt;
      if (c.life > 3) { c.m.material.opacity = Math.max(0, 1 - (c.life - 3) / 1.5); if (c.m.material.opacity === 0) c.m.visible = false; }
    }
  }
  // chips fall fast, bounce a few times, lie flat, then shrink away
  for (const c of chips) {
    if (!c.m.visible) continue;
    if (!c.rest) {
      c.v.y -= 12 * dt;
      c.m.position.addScaledVector(c.v, dt);
      c.m.rotation.x += c.spin.x * dt; c.m.rotation.y += c.spin.y * dt; c.m.rotation.z += c.spin.z * dt;
      const gy = groundY(c.m.position.x, c.m.position.z) + 0.07;
      if (c.m.position.y <= gy && c.v.y < 0) {
        c.m.position.y = gy;
        if (Math.abs(c.v.y) < 1.4 || ++c.bounces > 3) { c.rest = true; c.life = 0; c.m.rotation.set(0, Math.random() * Math.PI, 0); }
        else { c.v.y *= -0.5; c.v.x *= 0.7; c.v.z *= 0.7; c.spin.multiplyScalar(0.6); }
      }
    } else {
      c.life += dt;
      if (c.life > 2.5) { const s = Math.max(0, 1 - (c.life - 2.5) / 0.6); c.m.scale.setScalar(CHIP_SIZE * s); if (s === 0) c.m.visible = false; }
    }
  }
}

export { throwStocks, updateStocks };
