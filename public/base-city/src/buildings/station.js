// Landmark: Monorail Station. An elevated platform on the monorail loop, reached by a glass lift.
// The train stops here for 2 seconds on every lap (see monorail.js).
import * as THREE from 'three';
import { signTex, put } from '../core.js';
import { plainWhite, lightMat, edgeWhite, solid } from '../materials.js';
import { addLabel, place, roof } from '../world.js';
import { INFO } from '../data.js';
import { SITES, RAIL_Y } from '../plan.js';

// The group sits on the street under the rail. Locally the rail runs along x at z = 0; the platform is on the north side.
const station = new THREE.Group();
const DECK = RAIL_Y + 0.12, PZ = -1.02, LEN = 4.4;
{
  put(station, solid(new THREE.BoxGeometry(LEN, 0.16, 1.24), plainWhite), 0, DECK - 0.08, PZ);
  put(station, new THREE.Mesh(new THREE.BoxGeometry(LEN, 0.03, 0.1), new THREE.MeshBasicMaterial({ color: 0x0000ff })), 0, DECK + 0.016, PZ + 0.5);   // platform edge line
  // two columns down to the small plaza north of the street, and a glass lift between them
  for (const x of [-1.7, 1.7]) put(station, solid(new THREE.CylinderGeometry(0.13, 0.16, DECK - 0.16, 10), plainWhite, false), x, (DECK - 0.16) / 2, PZ - 0.1);
  const liftGeo = new THREE.BoxGeometry(0.74, DECK + 1.0, 0.74);
  const lift = new THREE.Mesh(liftGeo, new THREE.MeshStandardMaterial({ color: 0xc7c7ff, transparent: true, opacity: 0.3, roughness: .1 }));
  lift.add(new THREE.LineSegments(new THREE.EdgesGeometry(liftGeo), edgeWhite));
  put(station, lift, 0, (DECK + 1.0) / 2, PZ - 0.34);
  put(station, new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.6), lightMat), 0, 0.5, PZ - 0.34);   // the lift car, waiting at street level
  // canopy on slender posts, with a light strip and the name board
  for (const x of [-1.9, -0.65, 0.65, 1.9]) put(station, new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.5, 6), plainWhite), x, DECK + 0.75, PZ - 0.5);
  put(station, solid(new THREE.BoxGeometry(LEN + 0.3, 0.09, 1.5), plainWhite), 0, DECK + 1.54, PZ);
  put(station, new THREE.Mesh(new THREE.BoxGeometry(LEN, 0.04, 0.12), lightMat), 0, DECK + 1.47, PZ + 0.2);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.36), new THREE.MeshBasicMaterial({ map: signTex('BASE CITY STATION', { w: 420, h: 58, font: 'bold 34px Arial, sans-serif' }) }));
  put(station, board, 0, DECK + 1.82, PZ + 0.74);
  put(station, new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.44, 0.05), plainWhite), 0, DECK + 1.82, PZ + 0.71);
  // a bench and two waiting bots
  put(station, solid(new THREE.BoxGeometry(1.0, 0.12, 0.28), plainWhite), -1.2, DECK + 0.3, PZ - 0.36);
  for (const x of [0.9, 1.35]) {
    put(station, new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.3, 4, 8), plainWhite), x, DECK + 0.28, PZ - 0.1);
    put(station, new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), plainWhite), x, DECK + 0.64, PZ - 0.1);
  }
  addLabel(station, 'Monorail Station', DECK + 3.0);
}
place(station, ...SITES.station, INFO.station, 'station');
roof(station, 0, PZ, DECK + 1.59, 0.5);

export { station };
