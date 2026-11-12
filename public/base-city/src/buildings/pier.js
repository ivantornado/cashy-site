// Landmark: Harbour Pier. A wooden pier that runs from the belt road out into the bay, with two small boats that bob.
import * as THREE from 'three';
import { GROUND, BLUE, canvasTex, put, tickers } from '../core.js';
import { plainWhite, indigoMat, solid, boxMats } from '../materials.js';
import { addLabel, place, roof, scatter } from '../world.js';
import { INFO } from '../data.js';
import { SITES } from '../plan.js';

// The group starts on land beside the road; local +z runs out to sea (south-east).
const pier = new THREE.Group();
const YAW = Math.PI / 4, LEN = 12.6, HEAD = 11.7;
const boats = [];
{
  const planks = canvasTex(64, 64, (g) => {
    g.fillStyle = '#eef0ff'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = 'rgba(0,0,255,0.45)'; for (let y = 0; y < 64; y += 16) g.fillRect(0, y, 64, 2);
    g.fillStyle = 'rgba(0,0,255,0.2)'; g.fillRect(20, 0, 1.5, 16); g.fillRect(44, 16, 1.5, 16); g.fillRect(12, 32, 1.5, 16); g.fillRect(36, 48, 1.5, 16);
  });
  planks.wrapS = planks.wrapT = THREE.RepeatWrapping;
  const deckMat = (u, v) => { const t = planks.clone(); t.needsUpdate = true; t.repeat.set(u, v); return new THREE.MeshStandardMaterial({ map: t, roughness: .8 }); };
  const deck = (w, len, mat) => { const geo = new THREE.BoxGeometry(w, 0.12, len), m = new THREE.Mesh(geo, boxMats(geo, plainWhite, mat, plainWhite)); m.castShadow = m.receiveShadow = true; return m; };
  put(pier, deck(1.3, LEN, deckMat(1, LEN / 1.6)), 0, -0.02, LEN / 2 - 0.5);
  put(pier, deck(3.4, 1.4, deckMat(2.6, 0.9)), 0, -0.02, HEAD);
  // piles down into the water
  const piles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 8), indigoMat, 18), m4 = new THREE.Matrix4();
  let n = 0;
  for (let z = 3.2; z < HEAD - 0.5; z += 1.5) for (const x of [-0.6, 0.6]) piles.setMatrixAt(n++, m4.makeTranslation(x, -0.5, z));
  for (const x of [-1.6, 1.6]) for (const z of [HEAD - 0.6, HEAD + 0.6]) piles.setMatrixAt(n++, m4.makeTranslation(x, -0.5, z));
  piles.count = n; pier.add(piles);
  // mooring posts on the pier head
  for (const x of [-1.5, 1.5]) put(pier, new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.3, 8), plainWhite), x, 0.19, HEAD);

  // two small boats
  const hullShape = new THREE.Shape();
  [[-0.34, -0.75], [0.34, -0.75], [0.4, 0.2], [0, 1.0], [-0.4, 0.2]].forEach(([x, y], i) => (i ? hullShape.lineTo(x, y) : hullShape.moveTo(x, y)));
  hullShape.closePath();
  const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: 0.32, bevelEnabled: false }); hullGeo.rotateX(-Math.PI / 2);   // bow points to -z
  const stripe = new THREE.MeshBasicMaterial({ color: BLUE });
  function boat(sail) {
    const b = new THREE.Group();
    b.add(solid(hullGeo, plainWhite));
    put(b, new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.9), indigoMat), 0, 0.325, 0.1);
    if (sail) {
      put(b, new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 1.7, 6), plainWhite), 0, 1.15, -0.15);
      const tri = new THREE.Shape(); tri.moveTo(0, 0); tri.lineTo(0, 1.35); tri.lineTo(0.75, 0); tri.closePath();
      const s = new THREE.Mesh(new THREE.ShapeGeometry(tri), new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: .7 }));
      s.rotation.y = -Math.PI / 2; s.castShadow = true; put(b, s, 0, 0.5, -0.1);
      put(b, new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.3), stripe), 0, 1.95, -0.02);   // a small flag
    } else {
      put(b, solid(new THREE.BoxGeometry(0.44, 0.3, 0.5), plainWhite), 0, 0.47, 0.25);
      put(b, new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.1, 0.4), stripe), 0, 0.5, 0.25);
    }
    return b;
  }
  const WATER = -GROUND - 0.06;   // hull floor, a little below the water line
  for (const [sail, x, z, yaw] of [[true, 1.35, 7.6, 0.2], [false, -1.3, 9.2, Math.PI - 0.3]]) {
    const b = boat(sail); b.rotation.y = yaw; put(pier, b, x, WATER, z);
    boats.push({ b, y: WATER, ph: boats.length * 2.1 });
  }
  pier.rotation.y = YAW;
  addLabel(pier, 'Harbour Pier', 2.6).position.z = 8;
}
place(pier, ...SITES.pier, INFO.pier, 'pier');
roof(pier, 0, HEAD, 0.05, 0.5);   // Cashy can hop out to the pier head
// lamps along the pier (world coordinates)
for (const [x, z] of [[0.52, 4.5], [-0.52, 8], [1.4, HEAD + 0.4]]) {
  scatter.lamps.push([SITES.pier[0] + x * Math.cos(YAW) + z * Math.sin(YAW), SITES.pier[1] - x * Math.sin(YAW) + z * Math.cos(YAW)]);
}
tickers.push((dt, t) => {
  for (const o of boats) {
    o.b.position.y = o.y + Math.sin(t * 1.3 + o.ph) * 0.06;
    o.b.rotation.z = Math.sin(t * 1.1 + o.ph) * 0.07;
    o.b.rotation.x = Math.sin(t * 0.9 + o.ph * 1.7) * 0.04;
  }
});

export { pier };
