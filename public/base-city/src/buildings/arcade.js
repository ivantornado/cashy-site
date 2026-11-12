// Landmark: Cashy Arcade.
import * as THREE from 'three';
import { BLUE, signTex, put } from '../core.js';
import { plainWhite, solid } from '../materials.js';
import { addLabel, place, roof } from '../world.js';
import { INFO } from '../data.js';
import { SITES } from '../plan.js';

// ---------- Landmark: Cashy Arcade (an arcade cabinet) ----------
const arcade = new THREE.Group();
const arcadeCanvas = document.createElement('canvas'); arcadeCanvas.width = 96; arcadeCanvas.height = 64;
const arcadeCtx = arcadeCanvas.getContext('2d');
const arcadeTex = new THREE.CanvasTexture(arcadeCanvas); arcadeTex.colorSpace = THREE.SRGBColorSpace; arcadeTex.magFilter = THREE.NearestFilter;
const arcadeBills = Array.from({ length: 7 }, () => ({ x: Math.random() * 90, y: Math.random() * 60, v: 10 + Math.random() * 18 }));
function drawArcade(dt, t) {
  const g = arcadeCtx;
  g.fillStyle = '#0000ff'; g.fillRect(0, 0, 96, 64);
  g.fillStyle = '#ffffff';
  for (const b of arcadeBills) { b.y += b.v * dt; if (b.y > 66) { b.y = -6; b.x = Math.random() * 90; } g.fillRect(Math.round(b.x), Math.round(b.y), 7, 4); }
  const px = 48 + Math.sin(t * 2.2) * 30; g.fillRect(Math.round(px - 9), 57, 18, 4);
  g.fillRect(4, 4, 14, 2); g.fillRect(4, 8, 9, 2);
  arcadeTex.needsUpdate = true;
}
{
  const sh = new THREE.Shape();
  [[-1.3, 0], [1.15, 0], [1.15, 2.2], [1.35, 2.25], [0.6, 2.7], [0.25, 4.6], [0.95, 4.75], [0.95, 5.6], [-1.3, 5.6]].forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
  sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 3.2, bevelEnabled: false });
  geo.rotateY(-Math.PI / 2); geo.translate(1.6, 0, 0);
  arcade.add(solid(geo, plainWhite));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.75), new THREE.MeshBasicMaterial({ map: arcadeTex }));
  scr.rotation.x = -0.182; put(arcade, scr, 0, 3.66, 0.47);
  const marq = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.62), new THREE.MeshBasicMaterial({ map: signTex('ARCADE', { w: 256, h: 56, font: 'bold 38px Arial, sans-serif' }) }));
  put(arcade, marq, 0, 5.17, 0.96); arcade.userData.marquee = marq.material;
  const deck = new THREE.Group(); deck.position.set(0, 2.5, 0.97); deck.rotation.x = 0.54;
  put(deck, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.34, 8), plainWhite), -0.8, 0.17, 0);
  put(deck, new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), new THREE.MeshBasicMaterial({ color: BLUE })), -0.8, 0.38, 0);
  for (const x of [0.25, 0.6, 0.95]) put(deck, new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 14), new THREE.MeshBasicMaterial({ color: BLUE })), x, 0.04, 0);
  arcade.add(deck);
  for (const x of [-1.61, 1.61]) { const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshBasicMaterial({ color: BLUE, side: THREE.DoubleSide })); stripe.rotation.y = Math.PI / 2; put(arcade, stripe, x, 1.3, -0.1); }
  arcade.rotation.y = Math.PI / 4;
  addLabel(arcade, 'Cashy Arcade', 6.9);
}
place(arcade, ...SITES.arcade, INFO.arcade, 'arcade');
roof(arcade, 0, -0.3, 5.6, 0.4);

export { drawArcade };
