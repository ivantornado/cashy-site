// Renderer, scene, camera, controls, lights, world constants and small helpers.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const host = document.getElementById('scene');

// stagger the intro letters
document.querySelectorAll('.intro-title .word span').forEach((s, i) => { s.style.animationDelay = (0.25 + i * 0.06) + 's'; });

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (e) {
  document.getElementById('intro').hidden = true;
  host.innerHTML = '<div class="fallback">Base City needs WebGL. Open this page in a recent browser on a device with graphics enabled.</div>';
  throw e;
}
// phones and tablets render at most 1.5 device pixels per CSS pixel; that keeps the frame rate up
const mobile = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 720;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.tabIndex = 0;
host.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.className = 'labels';
host.appendChild(labelRenderer.domElement);

// ---------- World constants ----------
const BLUE = 0x0000ff, INDIGO = 0x000033;
const NAVY = 0x0e1b50;         // night sky and fog
const CASHY_GREEN = 0xa9dd8c;  // the CASHY wordmark green: NVDA and Cashy accents only
const PLAT = 0.6;            // island top
const WALK = 0.1;            // sidewalk height above the road
const GROUND = PLAT + WALK;   // street level: buildings, roads and walkers all stand on it

const scene = new THREE.Scene();
scene.background = new THREE.Color(NAVY);
scene.fog = new THREE.Fog(NAVY, 120, 290);

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 700);
// the start view: where the camera lands after the entrance. camera.js fits both to the window (fitHome).
const HOME_POS = new THREE.Vector3(58, 42, 58), HOME_TGT = new THREE.Vector3(0, 6, 0);
camera.position.copy(HOME_POS);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(HOME_TGT);
controls.enableDamping = true;
controls.enablePan = true;
controls.screenSpacePanning = false;
controls.zoomToCursor = true;
controls.minDistance = 2.5;
controls.maxDistance = 230;
controls.maxPolarAngle = Math.PI * 0.495;

// night: a cool sky fill and a moon. No other real lights; windows and lamps are emissive.
scene.add(new THREE.HemisphereLight(0xb4c0ff, 0x1c2a80, 1.0));
const sun = new THREE.DirectionalLight(0xdfe6ff, 1.25);
sun.position.set(30, 60, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -56, right: 56, top: 56, bottom: -56, near: 1, far: 190 });
sun.shadow.bias = -0.0006;
scene.add(sun);

// ---------- Helpers ----------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function rnd(n) { return Math.floor(Math.random() * n); }
function signTex(text, { w = 256, h = 64, bg = '#0000ff', fg = '#ffffff', font = 'bold 40px Arial, sans-serif' } = {}) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
  });
}
function put(parent, obj, x = 0, y = 0, z = 0) { obj.position.set(x, y, z); parent.add(obj); return obj; }

// Shared state that more than one module changes, and late-bound callbacks (set in ui.js).
const app = { following: false, touring: false, tourU: 0, introActive: false, flyTween: null, flash: 0, homeDist: 100 };
const hooks = { select() {}, escape() {} };
// per-frame animations registered by buildings: (dt, t) => {}. Not run when the visitor prefers reduced motion.
const tickers = [];

export { reduceMotion, renderer, labelRenderer, BLUE, INDIGO, NAVY, CASHY_GREEN, PLAT, WALK, GROUND, scene, sun, camera, HOME_POS, HOME_TGT, controls, canvasTex, seeded, rnd, signTex, put, app, hooks, tickers };
