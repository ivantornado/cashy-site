// Landmark: Base Stadium. An oval bowl with tiered seats, a pitch with Base-blue lines,
// four glowing floodlight masts and a big screen that scrolls "CASH IN. NVDA OUT."
import * as THREE from 'three';
import { BLUE, canvasTex, put, tickers } from '../core.js';
import { plainWhite, indigoMat, lightMat, glowMat, glowSprite } from '../materials.js';
import { addLabel, place, roof } from '../world.js';
import { INFO } from '../data.js';
import { SITES } from '../plan.js';

const stadium = new THREE.Group();
const AX = 2.85, AZ = 2.1;   // half-axes of the pitch oval; the stands step outwards from it
const screenTex = canvasTex(1024, 128, (g) => {
  g.fillStyle = '#000033'; g.fillRect(0, 0, 1024, 128);
  g.font = 'bold 82px Arial, sans-serif'; g.textBaseline = 'middle';
  let x = 30;
  for (const [text, col] of [['CASH IN. ', '#ffffff'], ['NVDA', '#a9dd8c'], [' OUT.', '#ffffff']]) { g.fillStyle = col; g.fillText(text, x, 68); x += g.measureText(text).width; }
  g.fillStyle = '#0000ff'; g.fillRect(x + (1024 - x) / 2 - 12, 52, 24, 24);
});
screenTex.wrapS = THREE.RepeatWrapping; screenTex.repeat.x = 0.8;
{
  // tiered stands: a stepped profile turned around the pitch and stretched into an oval
  const tiers = [[1.0, 0.4], [1.14, 0.7], [1.28, 1.0], [1.42, 1.3], [1.62, 1.55]];
  const prof = [[1.0, 0.12], [1.0, 0.4], [1.14, 0.4], [1.14, 0.7], [1.28, 0.7], [1.28, 1.0], [1.42, 1.0], [1.42, 1.3], [1.58, 1.3], [1.58, 1.55], [1.62, 1.55], [1.62, 0]];
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 56), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .6, side: THREE.DoubleSide, flatShading: true }));
  bowl.scale.set(AX, 1, AZ); bowl.castShadow = bowl.receiveShadow = true; stadium.add(bowl);
  const lines = [];
  for (const [r, y] of tiers) for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2, b = ((i + 1) / 64) * Math.PI * 2;
    lines.push(Math.cos(a) * r * AX, y + 0.006, Math.sin(a) * r * AZ, Math.cos(b) * r * AX, y + 0.006, Math.sin(b) * r * AZ);
  }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
  stadium.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: BLUE })));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.022, 6, 80), glowMat); rim.rotation.x = Math.PI / 2; rim.scale.set(AX, AZ, 1.6); put(stadium, rim, 0, 1.58, 0);
  // the pitch
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 48), indigoMat); floor.rotation.x = -Math.PI / 2; floor.scale.set(AX, AZ, 1); put(stadium, floor, 0, 0.12, 0);
  const pitchTex = canvasTex(512, 328, (g) => {
    g.fillStyle = '#e6e6ff'; g.fillRect(0, 0, 512, 328);
    g.strokeStyle = '#0000ff'; g.lineWidth = 6;
    g.strokeRect(12, 12, 488, 304);
    g.beginPath(); g.moveTo(256, 12); g.lineTo(256, 316); g.stroke();
    g.beginPath(); g.arc(256, 164, 52, 0, Math.PI * 2); g.stroke();
    g.strokeRect(12, 84, 76, 160); g.strokeRect(424, 84, 76, 160);
    g.fillStyle = '#0000ff'; g.beginPath(); g.arc(256, 164, 6, 0, Math.PI * 2); g.fill();
  });
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 2.75), new THREE.MeshBasicMaterial({ map: pitchTex }));
  pitch.rotation.x = -Math.PI / 2; put(stadium, pitch, 0, 0.14, 0);
  // four floodlight masts
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * 4.35, z = sz * 3.2;
    put(stadium, new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 4.5, 8), plainWhite), x, 2.25, z);
    const head = put(stadium, new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, 0.1), lightMat), x, 4.6, z);
    head.lookAt(stadium.position.x, 0.5, stadium.position.z);
    put(stadium, glowSprite(2.8, 0.85), x * 0.97, 4.6, z * 0.97);
  }
  // the big screen, above the north stand, facing the pitch and the start camera
  for (const x of [-1.5, 1.5]) put(stadium, new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.9, 0.1), plainWhite), x, 1.45, -3.42);
  put(stadium, new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.06, 0.12), indigoMat), 0, 3.35, -3.42);
  put(stadium, new THREE.Mesh(new THREE.PlaneGeometry(3.36, 0.92), new THREE.MeshBasicMaterial({ map: screenTex })), 0, 3.35, -3.355);
  addLabel(stadium, 'Base Stadium', 5.6);
}
place(stadium, ...SITES.stadium, INFO.stadium, 'stadium');
roof(stadium, 0, 0, 0.16, 0.9);   // Cashy can jump onto the pitch
tickers.push((dt, t) => { screenTex.offset.x = (t * 0.05) % 1; });

export { stadium };
