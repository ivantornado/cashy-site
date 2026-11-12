// Landmark: AI Data Centre. A low, long hall with server-rack stripes, spinning cooling fans on the roof
// and green status lights. Where the chips from the factory go to work.
import * as THREE from 'three';
import { CASHY_GREEN, canvasTex, seeded, signTex, put, tickers } from '../core.js';
import { plainWhite, indigoMat, glowTex, solid, boxMats } from '../materials.js';
import { addLabel, place, roof } from '../world.js';
import { INFO } from '../data.js';
import { SITES } from '../plan.js';

const dc = new THREE.Group();
const W = 3.2, L = 8.6, H = 1.7, Y0 = 0.18;   // the hall stands on a low plinth
const fans = [], leds = [];
{
  // one texture tile is two rack bays; the second canvas holds only the lights, as the emissive map
  const draw = (lightsOnly) => (g) => {
    const r = seeded(21);
    g.fillStyle = lightsOnly ? '#000000' : '#0b1040'; g.fillRect(0, 0, 128, 128);
    for (let c = 0; c < 2; c++) {
      const x = c * 64 + 6;
      if (!lightsOnly) { g.fillStyle = '#141c66'; g.fillRect(x, 8, 52, 112); g.fillStyle = '#060a2a'; for (let y = 16; y < 116; y += 10) g.fillRect(x + 4, y, 44, 2); }
      for (let y = 12; y < 116; y += 10) {
        const v = r();
        g.fillStyle = v < 0.5 ? '#a9dd8c' : v < 0.65 ? '#c7c7ff' : (lightsOnly ? '#000000' : '#141c66');
        g.fillRect(x + 40, y, 5, 3);
        if (r() < 0.3) { g.fillStyle = '#a9dd8c'; g.fillRect(x + 8, y, 3, 3); }
      }
    }
  };
  const rackMat = (u) => {
    const map = canvasTex(128, 128, draw(false)), glow = canvasTex(128, 128, draw(true));
    for (const t of [map, glow]) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = u; }
    return new THREE.MeshStandardMaterial({ map, emissiveMap: glow, emissive: 0xffffff, emissiveIntensity: 1.1, roughness: .5 });
  };
  const long = rackMat(L / 1.7), short = rackMat(W / 1.7);
  const hallGeo = new THREE.BoxGeometry(W, H, L);
  const hall = new THREE.Mesh(hallGeo, boxMats(hallGeo, long, plainWhite, short));
  hall.castShadow = hall.receiveShadow = true; put(dc, hall, 0, Y0 + H / 2, 0);
  put(dc, solid(new THREE.BoxGeometry(W + 0.14, Y0, L + 0.14), plainWhite), 0, Y0 / 2, 0);
  put(dc, solid(new THREE.BoxGeometry(W + 0.22, 0.16, L + 0.22), plainWhite), 0, Y0 + H + 0.08, 0);
  const TOP = Y0 + H + 0.16;
  // cooling fans on the roof
  const bladeTex = canvasTex(128, 128, (g) => {
    g.clearRect(0, 0, 128, 128); g.fillStyle = '#dfe5ff';
    for (let k = 0; k < 4; k++) { g.save(); g.translate(64, 64); g.rotate(k * Math.PI / 2); g.beginPath(); g.ellipse(30, 8, 30, 12, 0.35, 0, Math.PI * 2); g.fill(); g.restore(); }
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(64, 64, 12, 0, Math.PI * 2); g.fill();
  });
  const bladeMat = new THREE.MeshBasicMaterial({ map: bladeTex, alphaTest: 0.5, side: THREE.DoubleSide });
  const ringGeo = new THREE.CylinderGeometry(0.56, 0.62, 0.24, 20, 1, true), discGeo = new THREE.CircleGeometry(0.56, 20), bladeGeo = new THREE.PlaneGeometry(1.04, 1.04);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .5, side: THREE.DoubleSide });
  for (let k = 0; k < 5; k++) {
    const z = -3.3 + k * 1.65;
    put(dc, new THREE.Mesh(ringGeo, ringMat), -0.2, TOP + 0.12, z);
    const disc = new THREE.Mesh(discGeo, indigoMat); disc.rotation.x = -Math.PI / 2; put(dc, disc, -0.2, TOP + 0.02, z);
    const blades = new THREE.Mesh(bladeGeo, bladeMat); blades.rotation.x = -Math.PI / 2; put(dc, blades, -0.2, TOP + 0.17, z);
    fans.push(blades);
  }
  // green status lights that blink, in two groups out of step, on the two walls the start camera sees
  const r = seeded(5), pts = [[], []];
  for (let i = 0; i < 44; i++) {
    const y = Y0 + 0.25 + r() * (H - 0.45);
    if (i % 3) pts[i % 2].push(W / 2 + 0.03, y, (r() - 0.5) * (L - 0.6));
    else pts[i % 2].push((r() - 0.5) * (W - 0.5), y, L / 2 + 0.03);
  }
  for (const list of pts) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(list, 3));
    const mat = new THREE.PointsMaterial({ map: glowTex, color: CASHY_GREEN, size: 0.42, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    dc.add(new THREE.Points(geo, mat)); leds.push(mat);
  }
  // name boards
  const board = new THREE.MeshBasicMaterial({ map: signTex('AI DATA CENTRE', { w: 384, h: 64, font: 'bold 36px Arial, sans-serif' }) });
  put(dc, new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.42), board), 0, Y0 + H - 0.32, L / 2 + 0.012);
  const side = put(dc, new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.42), board), W / 2 + 0.012, Y0 + H - 0.32, L / 2 - 1.6); side.rotation.y = Math.PI / 2;
  addLabel(dc, 'AI Data Centre', 3.7);
  roof(dc, 1.05, 0.8, TOP, 0.18);
}
place(dc, ...SITES.datacentre, INFO.datacentre, 'datacentre');
tickers.push((dt, t) => {
  fans.forEach((f, k) => { f.rotation.z += dt * (7 + k); });
  leds.forEach((m, k) => { m.opacity = 0.35 + 0.65 * THREE.MathUtils.smoothstep(Math.sin(t * 2.4 + k * Math.PI), -0.3, 0.3); });
});

export { dc };
