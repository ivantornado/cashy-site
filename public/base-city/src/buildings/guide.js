// Landmark: City Guide tower.
import * as THREE from 'three';
import { canvasTex, put } from '../core.js';
import { topMat, glassMat, lightMat } from '../materials.js';
import { addLabel, place, roof } from '../world.js';
import { INFO } from '../data.js';
import { SITES } from '../plan.js';

// ---------- Landmark: City Guide tower ----------
const guideTower = new THREE.Group();
{
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.0, 0.14, 40), topMat); base.receiveShadow = true; put(guideTower, base, 0, 0.07, 0);
  const pts = [[0.95, 0.14], [0.7, 0.5], [0.36, 1.3], [0.27, 6.6], [0.5, 7.2], [1.7, 7.8], [1.8, 8.3], [1.25, 8.9], [0.5, 9.2], [0.12, 9.6], [0.05, 11.6]].map(([r, y]) => new THREE.Vector2(r, y));
  const needle = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .5, side: THREE.DoubleSide })); needle.castShadow = true; guideTower.add(needle);
  put(guideTower, new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.74, 0.34, 40, 1, true), glassMat), 0, 8.06, 0);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.05, 8, 72), lightMat); ring.rotation.x = Math.PI / 2; put(guideTower, ring, 0, 8.05, 0);
  const iTex = canvasTex(128, 128, (g) => {
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0000ff'; g.font = 'bold 86px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('i', 64, 70);
  });
  const iSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: iTex, transparent: true }));
  iSprite.scale.setScalar(1.9); put(guideTower, iSprite, 0, 13.1, 0);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.6, 14, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide }));
  beam.geometry.translate(0, -7, 0); beam.rotation.z = Math.PI / 2 + 0.25;
  const beamPivot = new THREE.Group(); beamPivot.add(beam); put(guideTower, beamPivot, 0, 8.6, 0);
  guideTower.userData.beam = beamPivot; guideTower.userData.sign = iSprite;
  addLabel(guideTower, 'City Guide', 14.6, { icon: 'i', near: false });
}
place(guideTower, ...SITES.guide, INFO.guide, 'guide');
roof(guideTower, 0.8, 0, 9.05, 0.02);

export { guideTower };
