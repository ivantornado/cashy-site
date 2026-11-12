// Cards, City Guide, Payday counter, entrance and picking.
import * as THREE from 'three';
import { reduceMotion, renderer, camera, HOME_POS, HOME_TGT, controls, app, hooks } from './core.js';
import { labels, PLACES, BY_KEY } from './world.js';
import { guideTower } from './buildings/guide.js';
import { cashy } from './cashy.js';
import { throwStocks } from './payday.js';
import { setFollow, setTour, tweenTo, flyTo } from './camera.js';

// ---------- Selection and the City Guide ----------
const info = document.getElementById('info'), guide = document.getElementById('guide'), guideBtn = document.getElementById('guide-btn');
function closeInfo() {
  info.hidden = true;
  for (const l of labels) l.el.classList.remove('is-active');
}
function setGuide(on) { guide.hidden = !on; guideBtn.setAttribute('aria-expanded', String(on)); }
// Open a place's card. Every field of its text is optional: no link means no button.
function select(g) {
  if (g === guideTower) { closeInfo(); setGuide(true); flyTo(g); return; }
  if (innerWidth < 720) setGuide(false);
  const d = g.userData.info || {};
  document.getElementById('info-name').textContent = d.name || '';
  const tag = document.getElementById('info-tag');
  tag.textContent = d.tag || ''; tag.style.visibility = d.tag ? '' : 'hidden';
  document.getElementById('info-text').textContent = d.text || '';
  document.getElementById('info-with-wrap').hidden = !d.withCashy;
  document.getElementById('info-with').textContent = d.withCashy || '';
  const link = document.getElementById('info-link'), play = document.getElementById('info-play');
  link.hidden = !d.link; if (d.link) { link.href = d.link; link.textContent = (d.linkLabel || 'Visit website') + ' ↗'; }
  play.hidden = !d.play; if (d.play) play.href = d.play;
  document.getElementById('info-actions').hidden = !d.link && !d.play;
  info.hidden = false;
  for (const l of labels) l.el.classList.toggle('is-active', l.owner === g);
}
document.getElementById('info-close').addEventListener('click', closeInfo);
guideBtn.addEventListener('click', () => { if (guide.hidden && innerWidth < 720) closeInfo(); setGuide(guide.hidden); });
document.getElementById('guide-close').addEventListener('click', () => setGuide(false));
// the guide list: clicking a place moves the camera to it and opens its card
const GUIDE_ITEMS = [['tower', 'Cashy × NVDA'], ['feel', 'Partner'], ['ipod', 'Partner'], ['pet', 'Future neighbour'], ['factory', 'Roadmap'], ['arcade', 'Roadmap'], ['bank', 'Roadmap'],
  ['stadium', 'Leisure'], ['datacentre', 'Industrial'], ['station', 'Transport'], ['pier', 'Harbour'], ['cashy', 'Mascot']];
{
  const ul = document.getElementById('guide-list'); ul.textContent = '';
  for (const [key, kind] of GUIDE_ITEMS) {
    const g = BY_KEY[key]; if (!g) continue;
    const li = document.createElement('li'), b = document.createElement('button'), s = document.createElement('span');
    b.type = 'button'; b.textContent = (g.userData.info || {}).name || key; s.textContent = kind;
    b.appendChild(s);
    b.addEventListener('click', () => { select(g); if (g === cashy) setFollow(true); else flyTo(g); });
    li.appendChild(b); ul.appendChild(li);
  }
}

// ---------- Payday counter (demo data) ----------
let nvda = 0, paydays = 0;
const nvdaEl = document.getElementById('nvda'), paydaysEl = document.getElementById('paydays'), toast = document.getElementById('toast');
let toastTimer;
function runPayday() {
  const amount = 0.0021 + Math.random() * 0.004;
  const wallets = 400 + Math.floor(Math.random() * 180);
  nvda += amount; paydays += 1;
  nvdaEl.textContent = nvda.toFixed(4);
  paydaysEl.textContent = `${paydays} Payday${paydays === 1 ? '' : 's'} · demo data`;
  toast.textContent = `Payday: ${amount.toFixed(4)} NVDA printed for ${wallets} wallets`;
  toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  throwStocks(reduceMotion ? 12 : 40);
  app.flash = 1;
}
document.getElementById('payday').addEventListener('click', runPayday);

// ---------- Entrance ----------
const intro = document.getElementById('intro');
let introTimers = [], replay = false;
function endIntro() {
  introTimers.forEach(clearTimeout); introTimers = [];
  intro.classList.add('out');
  introTimers.push(setTimeout(() => { intro.hidden = true; }, 900));
  // glide down from above the city. The zoom limit is lifted for the glide and set again when it lands.
  controls.maxDistance = Infinity;
  camera.position.set(HOME_POS.x * 0.35, 150, HOME_POS.z * 0.35 + 0.1);
  controls.target.set(0, 0, 0);
  tweenTo(HOME_POS.clone(), HOME_TGT.clone(), 2.6, 'out', () => { app.introActive = false; controls.enabled = !app.touring; controls.maxDistance = app.homeDist; });
}
function playIntro() {
  setFollow(false); setTour(false); setGuide(false); closeInfo();
  if (reduceMotion) { intro.hidden = true; return; }
  app.introActive = true; controls.enabled = false;
  intro.hidden = false; intro.classList.remove('out');
  // restart the CSS animations
  intro.querySelectorAll('.intro-eyebrow, .intro-title .word span, .intro-bar i, .intro-skip').forEach((el) => { el.style.animationName = 'none'; void el.offsetWidth; el.style.animationName = ''; });
  // The entrance lasts 2.3 s from page load. On a slow device, building the city can take longer than that,
  // so the first time it still stays up for a moment after the city is ready instead of vanishing at once.
  introTimers.push(setTimeout(endIntro, replay ? 2300 : Math.max(700, 2300 - performance.now())));
  replay = true;
}
document.getElementById('intro-skip').addEventListener('click', endIntro);
document.getElementById('replay').addEventListener('click', playIntro);

// ---------- Picking: tap a building or the ground ----------
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let downAt = null;
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; if (!app.introActive) app.flyTween = null; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (app.introActive || !downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
  ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects(PLACES, true);
  for (const h of hits) {
    let o = h.object;
    while (o && !o.userData.info) o = o.parent;
    if (o) { select(o); return; }
  }
  closeInfo();
});

hooks.select = select;
hooks.escape = () => { closeInfo(); setGuide(false); };

export { runPayday, playIntro };
