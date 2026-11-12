// Camera modes: follow, fly-through, keyboard flight, tweens.
import * as THREE from 'three';
import { reduceMotion, renderer, PLAT, camera, controls, app, hooks, HOME_POS, HOME_TGT } from './core.js';
import { BOUNDS, COAST } from './plan.js';

// ---------- The start view ----------
// The start view is also the maximum zoom-out. It is fitted to the window: on a wide screen the whole island fills the
// width, on a tall one the 3D core does. The tower's label sits just under the top panels and the Payday toast.
const HOME_DIR = new THREE.Vector3(58, 42, 58).normalize(), TOWER_LABEL_Y = 25;
const probe = new THREE.PerspectiveCamera(), pv = new THREE.Vector3();
const CORE = Array.from({ length: 24 }, (_, i) => [Math.cos(i / 24 * Math.PI * 2) * 23, Math.sin(i / 24 * Math.PI * 2) * 23]);   // the 3D core, roughly
function fitHome() {
  const W = innerWidth, H = innerHeight, portrait = W < H, pts = portrait ? CORE : COAST;
  const topPx = document.getElementById('toast').offsetTop + (portrait ? 96 : 62);
  const top = 1 - 2 * topPx / H, side = portrait ? 1 : 0.97;
  const bottom = portrait ? 1 - 2 * (document.querySelector('.dock').getBoundingClientRect().top - 10) / H : -1;
  probe.fov = camera.fov; probe.aspect = W / H; probe.near = 0.1; probe.far = 700; probe.updateProjectionMatrix();
  const aim = (ty, d) => { probe.position.copy(HOME_DIR).multiplyScalar(d); probe.position.y += ty; probe.lookAt(0, ty, 0); probe.updateMatrixWorld(); };
  let d = 40, ty = 6;
  for (; d < 400; d += 1) {
    let lo = -30, hi = 70;   // raise the target until the tower's label drops to `top`
    for (let i = 0; i < 20; i++) { ty = (lo + hi) / 2; aim(ty, d); if (pv.set(0, TOWER_LABEL_Y, 0).project(probe).y > top) lo = ty; else hi = ty; }
    let fits = true;
    for (const [x, z] of pts) { pv.set(x, 0.7, z).project(probe); if (Math.abs(pv.x) > side || pv.y < bottom) { fits = false; break; } }
    if (fits) break;
  }
  HOME_TGT.set(0, ty, 0); HOME_POS.copy(HOME_DIR).multiplyScalar(d).add(HOME_TGT);
  app.homeDist = d;
  if (!app.introActive) controls.maxDistance = d;
}
fitHome();
camera.position.copy(HOME_POS); controls.target.copy(HOME_TGT);

// ---------- Camera modes ----------
const followBtn = document.getElementById('follow'), tourBtn = document.getElementById('tour');
const tourCurve = new THREE.CatmullRomCurve3([
  [-15, 9, -15], [15, 9, -15], [15, 6, 3], [3, 4, 3], [3, 4, -3], [-3, 3.5, -3], [-3, 4, 9], [-15, 7, 9],
].map(([x, y, z]) => new THREE.Vector3(x, y + PLAT, z)), true, 'centripetal');
function setFollow(on) {
  app.following = on; followBtn.setAttribute('aria-pressed', String(on));
  if (on) setTour(false);
}
function setTour(on) {
  if (app.touring && !on) controls.target.copy(tourCurve.getPointAt((app.tourU + 0.02) % 1));
  app.touring = on; tourBtn.setAttribute('aria-pressed', String(on));
  controls.enabled = !on && !app.introActive;
  if (on) { app.following = false; followBtn.setAttribute('aria-pressed', 'false'); }
}
followBtn.addEventListener('click', () => setFollow(!app.following));
tourBtn.addEventListener('click', () => setTour(!app.touring));
renderer.domElement.addEventListener('pointerdown', () => { if (app.touring) setTour(false); });

const keys = new Set();
addEventListener('keydown', (e) => {
  if (e.target && e.target.closest && e.target.closest('button, a')) return;
  const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'r', 'f', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
    keys.add(k); e.preventDefault();
    if (app.touring) setTour(false);
    if (app.following) setFollow(false);
  }
  if (k === 'escape') hooks.escape();
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), move = new THREE.Vector3();
function keyboardFly(dt) {
  if (!keys.size) return;
  camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
  right.crossVectors(fwd, camera.up).normalize();
  move.set(0, 0, 0);
  if (keys.has('w') || keys.has('arrowup')) move.add(fwd);
  if (keys.has('s') || keys.has('arrowdown')) move.sub(fwd);
  if (keys.has('d') || keys.has('arrowright')) move.add(right);
  if (keys.has('a') || keys.has('arrowleft')) move.sub(right);
  if (keys.has('r')) move.y += 1;
  if (keys.has('f')) move.y -= 1;
  if (move.lengthSq() === 0) return;
  move.normalize().multiplyScalar((6 + camera.position.distanceTo(controls.target) * 0.6) * dt);
  camera.position.add(move); controls.target.add(move);
}
const shift = new THREE.Vector3();
function clampView() {
  const tgt = controls.target;
  if (!app.following) {
    // the further out the camera is, the closer its target must stay to the centre of the start view,
    // so at full zoom-out the city cannot be dragged out of the frame. Eased, so it never jumps.
    const k = 1 - Math.min(1, camera.position.distanceTo(tgt) / app.homeDist);
    const maxOff = 1 + k * 62, dx = tgt.x - HOME_TGT.x, dz = tgt.z - HOME_TGT.z, off = Math.hypot(dx, dz);
    if (off > maxOff) { const s = (maxOff / off - 1) * 0.2; shift.set(dx * s, 0, dz * s); tgt.add(shift); camera.position.add(shift); }
  }
  tgt.x = THREE.MathUtils.clamp(tgt.x, BOUNDS.minX, BOUNDS.maxX);
  tgt.z = THREE.MathUtils.clamp(tgt.z, BOUNDS.minZ, BOUNDS.maxZ);
  tgt.y = THREE.MathUtils.clamp(tgt.y, 0.8, 30);
  if (camera.position.y < PLAT + 0.6) camera.position.y = PLAT + 0.6;
}
function tweenTo(toPos, toTgt, dur, ease = 'inout', done) {
  if (app.flyTween && app.flyTween.done) app.flyTween.done(); // never drop a pending callback (it re-enables the controls after the entrance)
  app.flyTween = { t: 0, dur: reduceMotion ? 0.01 : dur, fromPos: camera.position.clone(), fromTgt: controls.target.clone(), toPos, toTgt, ease, done };
}
function flyTo(g) {
  setFollow(false); setTour(false);
  const box = new THREE.Box3().setFromObject(g);
  const center = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
  const dist = Math.max(9, Math.max(size.x, size.y, size.z) * 2.1);
  const dir = camera.position.clone().sub(controls.target).normalize();
  dir.y = 0; if (dir.lengthSq() < 0.01) dir.set(1, 0, 1); dir.normalize().multiplyScalar(0.57); dir.y = 0.82;
  tweenTo(center.clone().add(dir.multiplyScalar(dist)), center, 1.4);
}
function updateFly(dt) {
  if (!app.flyTween) return;
  app.flyTween.t = Math.min(1, app.flyTween.t + dt / app.flyTween.dur);
  const k = app.flyTween.t;
  const e = app.flyTween.ease === 'out' ? 1 - Math.pow(1 - k, 4) : (k < .5 ? 4 * k ** 3 : 1 - Math.pow(-2 * k + 2, 3) / 2);
  camera.position.lerpVectors(app.flyTween.fromPos, app.flyTween.toPos, e);
  controls.target.lerpVectors(app.flyTween.fromTgt, app.flyTween.toTgt, e);
  if (k >= 1) { const d = app.flyTween.done; app.flyTween = null; if (d) d(); }
}

export { fitHome, tourCurve, setFollow, setTour, keyboardFly, clampView, tweenTo, flyTo, updateFly };
