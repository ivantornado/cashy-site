// Landmark: iPod Store.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BLUE, canvasTex, put } from '../core.js';
import { plainWhite, indigoMat, edgeWhite, lightMat, solid } from '../materials.js';
import { addLabel, place, roof } from '../world.js';
import { INFO } from '../data.js';
import { SITES } from '../plan.js';

// ---------- Landmark: iPod Store ----------
const ipod = new THREE.Group();
function faceTex(wink) {
  return canvasTex(160, 128, (g, w, h) => {
    g.fillStyle = '#0000ff'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffffff'; g.fillStyle = '#ffffff'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.arc(52, 50, 11, 0, Math.PI * 2); g.fill();
    if (wink) { g.beginPath(); g.moveTo(96, 50); g.lineTo(120, 50); g.stroke(); }
    else { g.beginPath(); g.arc(108, 50, 11, 0, Math.PI * 2); g.fill(); }
    g.beginPath(); g.arc(80, 70, 30, Math.PI * 0.18, Math.PI * 0.82); g.stroke();
  });
}
{
  put(ipod, solid(new THREE.CylinderGeometry(2.1, 2.2, 0.5, 48), indigoMat, false), 0, 0.25, 0);
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.035, 6, 72), lightMat); rimRing.rotation.x = Math.PI / 2; put(ipod, rimRing, 0, 0.5, 0);
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.3, 4.2, 0.72, 5, 0.3), plainWhite); body.castShadow = true;
  const pod = new THREE.Group(); pod.add(body);
  const faces = [faceTex(false), faceTex(true)];
  const screenMat = new THREE.MeshBasicMaterial({ map: faces[0] });
  put(pod, new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.44), screenMat), 0, 1.0, 0.365);
  put(pod, new THREE.Mesh(new THREE.RingGeometry(0.3, 0.74, 48), new THREE.MeshStandardMaterial({ color: 0xdfe3ff, roughness: .4 })), 0, -0.85, 0.365);
  put(pod, new THREE.Mesh(new THREE.RingGeometry(0.73, 0.765, 48), new THREE.MeshBasicMaterial({ color: BLUE })), 0, -0.85, 0.367);
  put(pod, new THREE.Mesh(new THREE.RingGeometry(0.28, 0.305, 32), new THREE.MeshBasicMaterial({ color: BLUE })), 0, -0.85, 0.367);
  pod.position.set(0, 0.5 + 1.85, -0.15); pod.rotation.x = -0.07;
  ipod.add(pod);
  ipod.userData.screen = screenMat; ipod.userData.faces = faces;
  // earbuds
  for (const side of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.6 * side, 4.4, -0.2), new THREE.Vector3(1.3 * side, 4.9, 0.1), new THREE.Vector3(1.75 * side, 3.4, 0.5),
      new THREE.Vector3(1.5 * side, 1.6, 1.0), new THREE.Vector3(1.25 * side, 0.72, 1.25),
    ]);
    const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, 0.035, 6), plainWhite); cable.castShadow = true; ipod.add(cable);
    const bud = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), plainWhite); bud.castShadow = true; put(ipod, bud, 1.25 * side, 0.66, 1.25);
  }
  // glass cube entrance
  const cube = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, roughness: .1 }));
  cube.add(new THREE.LineSegments(new THREE.EdgesGeometry(cube.geometry), edgeWhite)); put(ipod, cube, 0, 0.95, 1.35);
  ipod.rotation.y = Math.PI / 4;
  addLabel(ipod, 'iPod Store', 6.0, { icon: '↗', near: false });
}
place(ipod, ...SITES.ipod, INFO.ipod, 'ipod');
roof(ipod, 0, -0.15, 4.5, 0.1);

export { ipod };
