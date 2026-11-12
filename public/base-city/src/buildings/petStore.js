// Landmark: Pet Store. A small, cute shop: a paw-print sign, a striped awning, a window display with a pet bed
// and toys, and a little pet that walks around the shop. A future neighbour, so it carries no name or link yet.
import * as THREE from 'three';
import { BLUE, canvasTex, put, tickers } from '../core.js';
import { plainWhite, indigoMat, block, solid } from '../materials.js';
import { addLabel, place, roof } from '../world.js';
import { INFO } from '../data.js';
import { SITES } from '../plan.js';

const pet = new THREE.Group();
const W = 3.0, D = 2.3, H = 1.7, ZC = -0.35, F = ZC + D / 2;   // F: the front wall
const blueMat = new THREE.MeshStandardMaterial({ color: BLUE, roughness: .5 });
const dog = new THREE.Group();
let tail;
{
  put(pet, block(W, H, D, false), 0, H / 2, ZC);
  put(pet, solid(new THREE.BoxGeometry(W + 0.24, 0.16, D + 0.24), plainWhite), 0, H + 0.08, ZC);
  // striped awning with a valance
  const stripes = canvasTex(128, 32, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#0000ff'; g.fillRect(i * 16, 0, 16, 32); } });
  const awnMat = new THREE.MeshStandardMaterial({ map: stripes, side: THREE.DoubleSide, roughness: .7 });
  const awning = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.1, 0.95), awnMat); awning.rotation.x = -Math.PI / 2 + 0.42; awning.castShadow = true;
  put(pet, awning, 0, 1.3, F + 0.42);
  put(pet, new THREE.Mesh(new THREE.PlaneGeometry(W + 0.1, 0.16), awnMat), 0, 1.04, F + 0.85);
  // shop window with a display ledge: a pet bed, a ball and a bone
  const pane = new THREE.PlaneGeometry(1.5, 0.8);
  const win = new THREE.Mesh(pane, indigoMat); win.add(new THREE.LineSegments(new THREE.EdgesGeometry(pane), new THREE.LineBasicMaterial({ color: 0xffffff })));
  put(pet, win, -0.55, 0.78, F + 0.012);
  put(pet, solid(new THREE.BoxGeometry(1.6, 0.06, 0.34), plainWhite), -0.55, 0.36, F + 0.17);
  const bed = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.075, 8, 20), blueMat); bed.rotation.x = Math.PI / 2; put(pet, bed, -0.9, 0.46, F + 0.17);
  const cushion = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), plainWhite); cushion.scale.y = 0.35; put(pet, cushion, -0.9, 0.45, F + 0.17);
  put(pet, new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), blueMat), -0.42, 0.48, F + 0.17);
  const bone = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.2, 4, 8), plainWhite); bone.rotation.z = Math.PI / 2; put(pet, bone, -0.08, 0.43, F + 0.2);
  for (const x of [-0.2, 0.04]) for (const z of [-0.035, 0.035]) put(pet, new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), plainWhite), x, 0.43, F + 0.2 + z);
  // door
  put(pet, new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.12), new THREE.MeshBasicMaterial({ color: BLUE })), 0.85, 0.56, F + 0.012);
  put(pet, new THREE.Mesh(new THREE.CircleGeometry(0.13, 20), plainWhite), 0.85, 0.82, F + 0.016);
  // the paw-print sign on the roof
  const pawTex = canvasTex(128, 128, (g) => {
    g.clearRect(0, 0, 128, 128);
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#0000ff'; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 57, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#0000ff';
    g.beginPath(); g.ellipse(64, 80, 22, 18, 0, 0, Math.PI * 2); g.fill();
    for (const [x, y] of [[34, 56], [52, 38], [76, 38], [94, 56]]) { g.beginPath(); g.ellipse(x, y, 9, 11, 0, 0, Math.PI * 2); g.fill(); }
  });
  put(pet, new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), plainWhite), 0, H + 0.4, 0.3);
  put(pet, new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: pawTex, alphaTest: 0.5, side: THREE.DoubleSide })), 0, H + 1.25, 0.3);

  // the little pet: a white dog with a blue collar
  const sh = (m) => m;
  const body = sh(new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.24, 4, 10), plainWhite)); body.rotation.x = Math.PI / 2; put(dog, body, 0, 0.24, 0);
  put(dog, sh(new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 12), plainWhite)), 0, 0.36, 0.25);
  put(dog, new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), plainWhite), 0, 0.33, 0.36);
  put(dog, new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), indigoMat), 0, 0.34, 0.405);
  for (const x of [-0.05, 0.05]) put(dog, new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), indigoMat), x, 0.4, 0.345);
  for (const x of [-0.08, 0.08]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.11, 8), plainWhite); ear.rotation.z = -x * 4; put(dog, ear, x, 0.48, 0.23); }
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 6, 16), blueMat); put(dog, collar, 0, 0.3, 0.17);
  for (const x of [-0.07, 0.07]) for (const z of [-0.12, 0.13]) put(dog, new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 6), plainWhite), x, 0.08, z);
  tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.028, 0.2, 6), plainWhite); tail.geometry.translate(0, 0.1, 0); tail.rotation.x = -0.6; put(dog, tail, 0, 0.3, -0.22);
  pet.add(dog);

  pet.rotation.y = Math.PI / 4;
  addLabel(pet, 'Pet Store', 4.3);
}
place(pet, ...SITES.pet, INFO.pet, 'pet');
roof(pet, 0, ZC, H + 0.16, 0.5);
// the pet walks a circle around the shop
function walk(t) {
  const a = t * 0.32, R = 2.25;
  dog.position.set(Math.sin(a) * R, Math.abs(Math.sin(t * 9)) * 0.03, Math.cos(a) * R - 0.15);
  dog.rotation.y = a + Math.PI / 2;
  tail.rotation.z = Math.sin(t * 12) * 0.5;
}
walk(0);
tickers.push((dt, t) => walk(t));

export { pet };
