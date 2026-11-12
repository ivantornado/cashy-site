// Monorail loop and train.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BLUE, PLAT, GROUND, scene, put } from './core.js';
import { SITES, RAIL_Y } from './plan.js';
import { plainWhite, glowSprite } from './materials.js';

// ---------- Monorail around the core ----------
const railY = GROUND + RAIL_Y;
const railCurve = new THREE.CatmullRomCurve3(
  [[-9, -9], [-9, 0], [-9, 9], [0, 9], [9, 9], [9, 0], [9, -9], [0, -9]].map(([x, z]) => new THREE.Vector3(x, railY, z)), true, 'catmullrom', 0.35);
{
  const railMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x7f8cff, emissiveIntensity: 0.6, roughness: .5 }); // the rail glows softly
  const rail = new THREE.Mesh(new THREE.TubeGeometry(railCurve, 240, 0.11, 6, true), railMat); rail.castShadow = true; scene.add(rail);
  const pylonGeo = new THREE.CylinderGeometry(0.07, 0.1, railY - PLAT, 6);
  const count = 28, pyl = new THREE.InstancedMesh(pylonGeo, plainWhite, count), m4 = new THREE.Matrix4();
  for (let i = 0; i < count; i++) { const p = railCurve.getPointAt(i / count); pyl.setMatrixAt(i, m4.makeTranslation(p.x, PLAT + (railY - PLAT) / 2, p.z)); }
  pyl.castShadow = true; scene.add(pyl);
}
const train = [0, 1, 2].map((k) => {
  const car = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.6, 1.7, 3, 0.16), plainWhite); car.add(body);
  put(car, new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.2, 1.3), new THREE.MeshBasicMaterial({ color: BLUE })), 0, 0.08, 0);
  if (k === 0) put(car, glowSprite(0.9, 0.8), 0, 0, 0.9);
  scene.add(car); return car;
});
// the station: the middle car stops beside the platform for 2 seconds on every lap
const CAR_GAP = 0.0265;
let stopU = 0;
{ let bd = Infinity; for (let i = 0; i < 800; i++) { const p = railCurve.getPointAt(i / 800), d = (p.x - SITES.station[0]) ** 2 + (p.z - SITES.station[1]) ** 2; if (d < bd) { bd = d; stopU = i / 800; } } }
stopU = (stopU + CAR_GAP) % 1;   // where the lead car is when the middle car is at the platform
let trainU = (stopU + 0.35) % 1, dwell = 0;
const tPos = new THREE.Vector3(), tTan = new THREE.Vector3();
function updateTrain(dt) {
  if (dwell > 0) dwell -= dt;
  else {
    let d = stopU - trainU; d -= Math.round(d);   // distance to the stop, in laps (-0.5 to 0.5)
    const step = (dt / 46) * Math.min(1, 0.12 + Math.abs(d) / 0.03);   // slow down into the station and pull away gently
    if (d > 0 && d <= step) { trainU = stopU; dwell = 2; } else trainU = (trainU + step) % 1;
  }
  train.forEach((car, k) => {
    const u = (trainU - k * CAR_GAP + 1) % 1;
    railCurve.getPointAt(u, tPos); railCurve.getTangentAt(u, tTan);
    car.position.set(tPos.x, tPos.y + 0.42, tPos.z);
    car.rotation.y = Math.atan2(tTan.x, tTan.z);
  });
}

export { updateTrain };
