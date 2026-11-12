// Entry point: the render loop.
import * as THREE from 'three';
import { reduceMotion, renderer, labelRenderer, scene, sun, camera, controls, app, tickers, CASHY_GREEN } from './core.js';
import { WIN, glowMat } from './materials.js';
import { waterTex, updateLabels, buildScatter } from './world.js';
import './data.js';
import { tower } from './buildings/tower.js';
import { tickerTex } from './buildings/feel.js';
import { ipod } from './buildings/ipod.js';
import { guideTower } from './buildings/guide.js';
import { updateFactory } from './buildings/chipFactory.js';
import { drawArcade } from './buildings/arcade.js';
import './buildings/bank.js';
import './buildings/generic.js';
import './buildings/stadium.js';
import './buildings/petStore.js';
import './buildings/dataCentre.js';
import './buildings/station.js';
import './buildings/pier.js';
import { updateOutskirts } from './outskirts.js';
import { updateTrain } from './monorail.js';
import { updateTraffic } from './traffic.js';
import { cashy, updateCashy } from './cashy.js';
import { updateStocks } from './payday.js';
import { fitHome, tourCurve, keyboardFly, clampView, updateFly } from './camera.js';
import { runPayday, playIntro } from './ui.js';

// ---------- Loop ----------
let nextAuto = 7, winkAt = 4, arcadeAcc = 0;
const clock = new THREE.Clock();
const WHITE = new THREE.Color(0xffffff);
const followTarget = new THREE.Vector3(), delta = new THREE.Vector3();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  updateTraffic(dt, t);
  updateCashy(dt, t);
  updateStocks(dt, t);
  updateOutskirts(t, reduceMotion);
  if (!reduceMotion) {
    updateTrain(dt);
    WIN.time.value = t;
    updateFactory(dt, t);
    for (const f of tickers) f(dt, t);
    waterTex.offset.x = t * 0.004; waterTex.offset.y = t * 0.0025;
    tickerTex.offset.x = (t * 0.035) % 1;
    guideTower.userData.beam.rotation.y = t * 0.5;
    guideTower.userData.sign.position.y = 13.1 + Math.sin(t * 1.6) * 0.18;
    arcadeAcc += dt; if (arcadeAcc > 0.08) { drawArcade(arcadeAcc, t); arcadeAcc = 0; }
    if (t > winkAt) { ipod.userData.screen.map = ipod.userData.faces[1]; if (t > winkAt + 0.35) { ipod.userData.screen.map = ipod.userData.faces[0]; winkAt = t + 3 + Math.random() * 4; } }
  }
  app.flash = Math.max(0, app.flash - dt * 0.8);
  // the tower's chip: the core pulses, and everything green on the tower flashes white on Payday
  tower.userData.core.scale.setScalar(1 + app.flash * 0.3 + (reduceMotion ? 0 : 0.04 * Math.sin(t * 3)));
  tower.userData.halo.scale.setScalar(4.4 + app.flash * 6);
  tower.userData.glow.color.set(CASHY_GREEN).lerp(WHITE, app.flash * 0.85);
  glowMat.color.setRGB(0.55 + 0.45 * app.flash, 0.55 + 0.45 * app.flash, 1);

  if (!reduceMotion && !app.introActive && t > nextAuto) { runPayday(); nextAuto = t + 14; }

  if (app.touring) {
    app.tourU = (app.tourU + dt / 70) % 1;
    camera.position.copy(tourCurve.getPointAt(app.tourU));
    camera.lookAt(tourCurve.getPointAt((app.tourU + 0.02) % 1));
  } else {
    if (app.following) {
      followTarget.copy(cashy.position); followTarget.y += 2;
      delta.subVectors(followTarget, controls.target).multiplyScalar(Math.min(1, dt * 4));
      controls.target.add(delta); camera.position.add(delta);
    }
    keyboardFly(dt);
    updateFly(dt);
    if (!app.introActive) clampView();
    controls.update();
  }
  updateLabels();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  requestAnimationFrame(tick);
}
drawArcade(0.1, 0);
buildScatter();
// Shadows are drawn once: only things that never move cast them, so the shadow map does not need a second pass every frame.
sun.shadow.autoUpdate = false; sun.shadow.needsUpdate = true;
playIntro();
tick();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight); labelRenderer.setSize(innerWidth, innerHeight);
  fitHome();   // the start view and the zoom limit follow the window
});
