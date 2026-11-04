import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";

/*
 * Base City in 3D. Based on the proof of concept by Cashy's friend (single HTML file, three.js), keeping its
 * flat Base-blue look, rebuilt as a module: tidy shutdown, scoped keyboard, copy from content/base-city.json.
 * Everything is drawn in code, no image files.
 */

export type SceneContent = {
  arcadeSign: string;
  labels: { plot: string; project: string };
  info: Record<string, { name: string }>;
};

export type SceneHooks = {
  /** A building, plot or Cashy was picked, or null when the card should close. */
  onSelect(key: string | null): void;
  onFollow(on: boolean): void;
  onTour(on: boolean): void;
  onSpin(on: boolean): void;
  /** The visitor pressed the demo button. Numbers are made up. */
  onPayday(payday: { amount: number; wallets: number }): void;
};

export type BaseCityScene = {
  setStage(stage: number): void;
  runPayday(): void;
  setFollow(on: boolean): void;
  setTour(on: boolean): void;
  setSpin(on: boolean): void;
  flyToSelected(): void;
  close(): void;
  dispose(): void;
};

// The friend's flat look: Base-blue sky and ground, white buildings with pale windows, blue outlines.
// Their blue is #0000ff; the site's main blue is #024ff6. Change BLUE to switch the city to the site's blue.
const BLUE = 0x0000ff;
const COL = {
  sky: BLUE,
  ground: 0x0606ff,
  platform: 0x2121ff,
  platformEdge: 0x8080ff,
  street: 0x3b3bff,
  gridMain: 0x5c5cff,
  gridFine: 0x4646ff,
  roof: 0xe6e6ff,
  edge: BLUE,
  light: 0xffffff,
  glow: 0x8c8cff,
  beacon: 0xffffff,
  ghost: 0xffffff,
  lawn: 0x4d4dff,
  tree: 0xffffff,
  plot: 0xffffff,
};

const PLAT = 0.6; // platform top
const HALF = 25; // half size of the city platform
const STREETS = [-21, -15, -9, -3, 3, 9, 15, 21];
const N = STREETS.length;
const BOT_COUNT: Record<number, number> = { 1: 16, 2: 32, 3: 54 };

type Roof = { g: THREE.Group; dx: number; dz: number; y: number; r: number; tall: boolean };
type Bot = { g: THREE.Group; ai: number; aj: number; bi: number; bj: number; t: number; speed: number; off: number; ph: number };
type Cert = { m: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>; v: THREE.Vector3; spin: THREE.Vector3; landed: boolean; life: number; ph: number };
type Label = { lab: CSS2DObject; el: HTMLElement; owner: THREE.Object3D };
type JumpNext = { kind: "street" } | { kind: "roof"; r: Roof };

/** Small deterministic random, so the city looks the same every visit. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Facade tile: white wall, pale windows and a thin blue line, as in the original. */
function facadeTexture() {
  const t = canvasTex(64, 64, (g) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = "#dcdcff";
    for (let x = 5; x < 64; x += 16) g.fillRect(x, 16, 10, 34);
    g.fillStyle = "rgba(0,0,255,0.35)";
    g.fillRect(0, 0, 64, 2);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function createBaseCity(host: HTMLElement, content: SceneContent, hooks: SceneHooks): BaseCityScene {
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;

  // Throws when WebGL is missing: the page shows its fallback message.
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  let width = Math.max(1, host.clientWidth);
  let height = Math.max(1, host.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.touchAction = "none";
  renderer.domElement.style.outline = "none";
  host.appendChild(renderer.domElement);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(width, height);
  labelRenderer.domElement.className = "city-labels";
  host.appendChild(labelRenderer.domElement);

  const cleanups: (() => void)[] = [];
  const on = <T extends EventTarget>(target: T, type: string, fn: (e: never) => void, options?: AddEventListenerOptions) => {
    target.addEventListener(type, fn as EventListener, options);
    cleanups.push(() => target.removeEventListener(type, fn as EventListener, options));
  };

  // ---------- Scene, camera, light ----------
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COL.sky);
  scene.fog = new THREE.Fog(COL.sky, 110, 260);

  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 600);
  const aspect0 = width / height;
  // Tall frames pull back to fit the whole city; wide frames come in closer so it fills the view.
  camera.position.set(60, 44, 60).multiplyScalar(aspect0 < 1 ? 1 + (1 - aspect0) * 1.9 : aspect0 > 1.5 ? 0.78 : 1);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 6, 0);
  controls.enableDamping = true;
  controls.screenSpacePanning = false;
  controls.zoomToCursor = true;
  controls.minDistance = 2.5;
  controls.maxDistance = 220;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.autoRotateSpeed = 0.45;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2aff, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(30, 60, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 160 });
  sun.shadow.bias = -0.0006;
  scene.add(sun);

  // ---------- Ground and streets ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.MeshStandardMaterial({ color: COL.ground, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const platform = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2, PLAT, HALF * 2), new THREE.MeshStandardMaterial({ color: COL.platform, roughness: 0.9 }));
  platform.position.y = PLAT / 2;
  platform.receiveShadow = true;
  platform.add(new THREE.LineSegments(new THREE.EdgesGeometry(platform.geometry), new THREE.LineBasicMaterial({ color: COL.platformEdge })));
  scene.add(platform);

  const streetMat = new THREE.MeshStandardMaterial({ color: COL.street, roughness: 1 });
  for (const s of STREETS) {
    const a = new THREE.Mesh(new THREE.PlaneGeometry(1.8, HALF * 2), streetMat);
    a.rotation.x = -Math.PI / 2;
    a.position.set(s, PLAT + 0.005, 0);
    a.receiveShadow = true;
    scene.add(a);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, 1.8), streetMat);
    b.rotation.x = -Math.PI / 2;
    b.position.set(0, PLAT + 0.006, s);
    b.receiveShadow = true;
    scene.add(b);
  }
  const grid = new THREE.GridHelper(HALF * 2, HALF * 2, COL.gridMain, COL.gridFine);
  grid.position.y = PLAT + 0.012;
  scene.add(grid);

  // ---------- Materials and helpers ----------
  const facade = facadeTexture();
  const sideCache = new Map<string, THREE.MeshStandardMaterial>();
  function sideMat(u: number, v: number) {
    const a = Math.max(1, Math.round(u));
    const b = Math.max(1, Math.round(v));
    const key = `${a}x${b}`;
    let mat = sideCache.get(key);
    if (!mat) {
      const map = facade.clone();
      map.needsUpdate = true;
      map.repeat.set(a, b);
      mat = new THREE.MeshStandardMaterial({ map, roughness: 0.55 });
      sideCache.set(key, mat);
    }
    return mat;
  }
  const topMat = new THREE.MeshStandardMaterial({ color: COL.roof, roughness: 0.6 });
  const plainLight = new THREE.MeshStandardMaterial({ color: COL.light, roughness: 0.5 });
  const edgeMat = new THREE.LineBasicMaterial({ color: COL.edge });
  const glowMat = new THREE.MeshBasicMaterial({ color: COL.glow });
  const ghostMat = new THREE.MeshBasicMaterial({ color: COL.ghost, transparent: true, opacity: 0.1, depthWrite: false });
  const ghostEdge = new THREE.LineBasicMaterial({ color: COL.ghost, transparent: true, opacity: 0.45 });

  function block(w: number, h: number, d: number, windows = true) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mx = windows ? sideMat(d / 1.4, h / 1.1) : plainLight;
    const mz = windows ? sideMat(w / 1.4, h / 1.1) : plainLight;
    const m = new THREE.Mesh(geo, [mx, mx, topMat, topMat, mz, mz]);
    m.castShadow = true;
    m.receiveShadow = true;
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
    return m;
  }
  function ghostBlock(w: number, h: number, d: number) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Mesh(geo, ghostMat);
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), ghostEdge));
    return m;
  }

  // ---------- Labels ----------
  const labels: Label[] = [];
  function addLabel(obj: THREE.Object3D, text: string, y: number, cls = "") {
    const el = document.createElement("div");
    el.className = `city-tag ${cls}`.trim();
    el.textContent = text;
    const lab = new CSS2DObject(el);
    lab.position.set(0, y, 0);
    obj.add(lab);
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      select(obj as THREE.Group);
    });
    labels.push({ lab, el, owner: obj });
    return lab;
  }

  // ---------- Places ----------
  const PLACES: THREE.Group[] = [];
  const ROOFS: Roof[] = []; // rooftops Cashy can land on
  function place(group: THREE.Group, x: number, z: number, info: string, stages: number[]) {
    group.position.set(x, PLAT, z);
    group.userData.info = info;
    group.userData.stages = stages;
    group.userData.grow = 1;
    scene.add(group);
    PLACES.push(group);
    return group;
  }
  function roof(g: THREE.Group, dx: number, dz: number, y: number, r: number, tall = false) {
    ROOFS.push({ g, dx, dz, y, r, tall });
  }
  const nameOf = (key: string) => content.info[key].name;

  // MSTR Tower
  const tower = new THREE.Group();
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), new THREE.MeshBasicMaterial({ color: COL.beacon }));
  {
    const main = block(4, 14, 4);
    main.position.y = 7;
    tower.add(main);
    const band = new THREE.Mesh(new THREE.BoxGeometry(4.15, 0.35, 4.15), glowMat);
    band.position.y = 14.1;
    tower.add(band);
    const mid = block(3, 4, 3);
    mid.position.y = 16.2;
    tower.add(mid);
    const top = block(1.8, 1.4, 1.8, false);
    top.position.y = 18.9;
    tower.add(top);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.2, 8), plainLight);
    ant.position.y = 21.2;
    tower.add(ant);
    beacon.position.y = 22.9;
    tower.add(beacon);
    addLabel(tower, nameOf("tower"), 24.6);
  }
  place(tower, 0, 0, "tower", [1, 2, 3]);
  roof(tower, 1.15, 1.15, 18.2, 0.12, true);
  const TOWER_TOP = new THREE.Vector3(0, PLAT + 19.8, 0);

  // Feel.cash Plaza
  const plaza = new THREE.Group();
  {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 0.25, 48), topMat);
    disc.position.y = 0.125;
    disc.receiveShadow = true;
    plaza.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.06, 8, 64), glowMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.27;
    plaza.add(ring);
    addLabel(plaza, nameOf("plaza"), 0.4, "city-tag--small").position.set(0, 0.4, 2.9);
  }
  place(plaza, 6, 6, "plaza", [1, 2, 3]);

  // Printer Factory
  const printer = new THREE.Group();
  {
    const hall = block(4.4, 3, 3.6);
    hall.position.y = 1.5;
    printer.add(hall);
    for (const [x, z] of [
      [-1.1, -0.8],
      [0.2, -0.8],
    ]) {
      const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 2.2, 16), plainLight);
      ch.position.set(x, 4.1, z);
      ch.castShadow = true;
      printer.add(ch);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.05, 6, 20), glowMat);
      lip.rotation.x = Math.PI / 2;
      lip.position.set(x, 5.2, z);
      printer.add(lip);
    }
    addLabel(printer, nameOf("printer"), 6.2, "city-tag--minor");
  }
  place(printer, -6, 0, "printer", [2, 3]);
  roof(printer, 0.8, 0.8, 3, 0.6);

  // Cashy Arcade: its sign now says Cashy Tower.
  const arcade = new THREE.Group();
  const signMat = new THREE.MeshBasicMaterial({
    map: canvasTex(256, 64, (g, w, h) => {
      g.fillStyle = "#0000ff";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#ffffff";
      g.font = "bold 30px Arial, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(content.arcadeSign, w / 2, h / 2 + 2);
    }),
    transparent: true,
  });
  {
    const hall = block(4, 4.6, 4);
    hall.position.y = 2.3;
    arcade.add(hall);
    for (const [rot, x, z] of [
      [0, 0, 2.02],
      [Math.PI / 2, 2.02, 0],
    ]) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), signMat);
      s.rotation.y = rot;
      s.position.set(x, 3.7, z);
      arcade.add(s);
    }
    addLabel(arcade, nameOf("arcade"), 6);
  }
  place(arcade, 0, -6, "arcade", [2, 3]);
  roof(arcade, 0, 0, 4.6, 1);

  // iPod store
  const ipod = new THREE.Group();
  {
    const plinth = block(3.6, 0.4, 3.6, false);
    plinth.position.y = 0.2;
    ipod.add(plinth);
    const body = block(2.4, 4.2, 1.1, false);
    body.position.y = 2.5;
    ipod.add(body);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.4), new THREE.MeshBasicMaterial({ color: 0x5c5cff }));
    screen.position.set(0, 3.35, 0.56);
    ipod.add(screen);
    const wheel = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.75, 40), new THREE.MeshStandardMaterial({ color: 0xe6e6ff, side: THREE.DoubleSide }));
    wheel.position.set(0, 1.75, 0.56);
    ipod.add(wheel);
    const rim = new THREE.Mesh(new THREE.RingGeometry(0.73, 0.77, 40), new THREE.MeshBasicMaterial({ color: BLUE, side: THREE.DoubleSide }));
    rim.position.set(0, 1.75, 0.565);
    ipod.add(rim);
    ipod.rotation.y = Math.PI / 4;
    addLabel(ipod, nameOf("ipod"), 5.4, "city-tag--minor");
  }
  place(ipod, 6, 0, "ipod", [2, 3]);
  roof(ipod, 0, 0, 4.6, 0.2);

  // Delivery Guy depot
  const depot = new THREE.Group();
  {
    const hall = block(4.4, 2.3, 3.2);
    hall.position.set(0, 1.15, -0.5);
    depot.add(hall);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0xc7c7ff });
    for (const x of [-1.1, 1.1]) {
      const door = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), doorMat);
      door.position.set(x, 0.78, 1.11);
      depot.add(door);
      const van = block(0.9, 0.7, 1.5, false);
      van.position.set(x, 0.38, 2.1);
      depot.add(van);
      const cab = block(0.9, 0.35, 0.5, false);
      cab.position.set(x, 0.92, 2.5);
      depot.add(cab);
    }
    addLabel(depot, nameOf("depot"), 3.6, "city-tag--minor");
  }
  place(depot, 0, 6, "depot", [2, 3]);
  roof(depot, 0, -0.5, 2.3, 1);

  // Bank
  const bank = new THREE.Group();
  {
    const plinth = block(4.8, 0.4, 4.2, false);
    plinth.position.y = 0.2;
    bank.add(plinth);
    const hall = block(4, 3, 3);
    hall.position.set(0, 1.9, -0.4);
    bank.add(hall);
    for (let i = 0; i < 5; i++) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 2.8, 14), plainLight);
      col.position.set(-1.8 + i * 0.9, 1.8, 1.55);
      col.castShadow = true;
      bank.add(col);
    }
    const roofSlab = block(4.8, 0.45, 4.2, false);
    roofSlab.position.y = 3.6;
    bank.add(roofSlab);
    addLabel(bank, nameOf("bank"), 4.9, "city-tag--minor");
  }
  place(bank, -6, -6, "bank", [3]);
  roof(bank, 0, 0, 3.83, 1.2);

  // Open plots and the first Base projects
  const plotLine = new THREE.LineDashedMaterial({ color: COL.plot, dashSize: 0.45, gapSize: 0.3 });
  const plotHit = new THREE.MeshBasicMaterial({ visible: false });
  function plotOutline() {
    const g = new THREE.Group();
    const pts = [
      [-2.2, -2.2],
      [2.2, -2.2],
      [2.2, 2.2],
      [-2.2, 2.2],
      [-2.2, -2.2],
    ].map(([x, z]) => new THREE.Vector3(x, 0.03, z));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), plotLine);
    line.computeLineDistances();
    g.add(line);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.2, 4.4), plotHit);
    hit.position.y = 0.1;
    g.add(hit);
    return g;
  }
  [
    { x: -6, z: 0, st: [1] },
    { x: 0, z: -6, st: [1] },
    { x: 6, z: 0, st: [1] },
    { x: 0, z: 6, st: [1] },
    { x: -6, z: -6, st: [1, 2] },
    { x: -6, z: 6, st: [1, 2], label: true },
    { x: 6, z: -6, st: [1, 2] },
  ].forEach((p) => {
    const g = plotOutline();
    if (p.label) addLabel(g, content.labels.plot, 0.7, "city-tag--plot city-tag--small");
    place(g, p.x, p.z, "plot", p.st);
  });
  [
    { x: -6, z: 6, s: 3 },
    { x: 6, z: -6, s: 5 },
  ].forEach((p) => {
    const g = new THREE.Group();
    const h1 = 5 + ((p.s * 37) % 6);
    const a = block(2.4, h1, 2.4);
    a.position.set(-0.6, h1 / 2, -0.4);
    g.add(a);
    const h2 = 2.5 + ((p.s * 13) % 4);
    const b = block(1.8, h2, 1.8);
    b.position.set(1.2, h2 / 2, 1.1);
    g.add(b);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.25, 2.5), glowMat);
    cap.position.set(-0.6, h1 + 0.12, -0.4);
    g.add(cap);
    addLabel(g, content.labels.project, h1 + 1.2, "city-tag--small");
    place(g, p.x, p.z, "project", [3]);
    roof(g, -0.6, -0.4, h1 + 0.25, 0.7);
    roof(g, 1.2, 1.1, h2, 0.5);
  });

  // Outer districts: reserved buildings for future integrations, parks and open plots
  const rand = seeded(8453);
  const treeMat = new THREE.MeshStandardMaterial({ color: COL.tree, roughness: 0.7 });
  const parkMat = new THREE.MeshStandardMaterial({ color: COL.lawn, roughness: 1 });
  const outerPlotLabels = new Set(["18,-6", "-12,18"]);
  for (const cx of [-18, -12, -6, 0, 6, 12, 18]) {
    for (const cz of [-18, -12, -6, 0, 6, 12, 18]) {
      if (Math.abs(cx) <= 6 && Math.abs(cz) <= 6) continue;
      const r = rand();
      if (r < 0.22) {
        const g = new THREE.Group();
        const lawn = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.16, 4.4), parkMat);
        lawn.position.y = 0.08;
        lawn.receiveShadow = true;
        g.add(lawn);
        const trees = 3 + Math.floor(rand() * 3);
        for (let k = 0; k < trees; k++) {
          const t = new THREE.Group();
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 6), treeMat);
          trunk.position.y = 0.4;
          t.add(trunk);
          const crown = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.1, 10), treeMat);
          crown.position.y = 1.1;
          crown.castShadow = true;
          t.add(crown);
          t.position.set((rand() - 0.5) * 3.2, 0, (rand() - 0.5) * 3.2);
          g.add(t);
        }
        place(g, cx, cz, "park", [1, 2, 3]);
      } else if (r < 0.4) {
        const g = plotOutline();
        if (outerPlotLabels.has(`${cx},${cz}`)) addLabel(g, content.labels.plot, 0.7, "city-tag--plot city-tag--small");
        place(g, cx, cz, "plot", [1, 2, 3]);
      } else {
        const dist = Math.max(Math.abs(cx), Math.abs(cz));
        const w = 2.6 + rand() * 1.4;
        const d = 2.6 + rand() * 1.4;
        const h = (dist >= 18 ? 2.5 : 3) + rand() * (dist >= 18 ? 4 : 5);
        const ox = (rand() - 0.5) * (4.4 - w) * 0.8;
        const oz = (rand() - 0.5) * (4.4 - d) * 0.8;
        const second = rand() < 0.45;
        const w2 = 1.4 + rand() * 0.6;
        const h2 = 1.5 + rand() * 2.5;
        const ghost = new THREE.Group();
        const gb = ghostBlock(w, h, d);
        gb.position.set(ox, h / 2, oz);
        ghost.add(gb);
        place(ghost, cx, cz, "reserved", [1, 2]);
        const solid = new THREE.Group();
        const sb = block(w, h, d);
        sb.position.set(ox, h / 2, oz);
        solid.add(sb);
        if (second) {
          const sx = -Math.sign(ox || 1) * 1.3;
          const sz = -Math.sign(oz || 1) * 1.3;
          const s2 = block(w2, h2, w2);
          s2.position.set(sx, h2 / 2, sz);
          solid.add(s2);
        }
        place(solid, cx, cz, "project", [3]);
        roof(solid, ox, oz, h, Math.min(w, d) / 2 - 0.5);
      }
    }
  }

  // ---------- Walking bots ----------
  const botMat = new THREE.MeshStandardMaterial({ color: COL.light, roughness: 0.45 });
  const botGeo = new THREE.CapsuleGeometry(0.15, 0.34, 4, 8);
  const headGeo = new THREE.SphereGeometry(0.14, 12, 10);
  const bots: Bot[] = [];
  const rnd = (n: number) => Math.floor(Math.random() * n);
  function neighbours(i: number, j: number): [number, number][] {
    return ([
      [i + 1, j],
      [i - 1, j],
      [i, j + 1],
      [i, j - 1],
    ] as [number, number][]).filter(([a, b]) => a >= 0 && a < N && b >= 0 && b < N);
  }
  function nextLeg(b: Bot) {
    const opts = neighbours(b.bi, b.bj).filter(([a, c]) => !(a === b.ai && c === b.aj));
    const [ni, nj] = opts[rnd(opts.length)];
    b.ai = b.bi;
    b.aj = b.bj;
    b.bi = ni;
    b.bj = nj;
    b.t = 0;
  }
  for (let k = 0; k < BOT_COUNT[3]; k++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(botGeo, botMat);
    body.position.y = 0.32;
    body.castShadow = true;
    const head = new THREE.Mesh(headGeo, botMat);
    head.position.y = 0.72;
    head.castShadow = true;
    g.add(body, head);
    scene.add(g);
    const b: Bot = { g, ai: rnd(N), aj: rnd(N), bi: 0, bj: 0, t: Math.random(), speed: 0.8 + Math.random() * 0.7, off: (Math.random() - 0.5) * 1.1, ph: Math.random() * 6 };
    const n = neighbours(b.ai, b.aj)[0];
    b.bi = n[0];
    b.bj = n[1];
    bots.push(b);
  }
  function legPos(b: Bot, out: THREE.Vector3) {
    const x0 = STREETS[b.ai];
    const z0 = STREETS[b.aj];
    const x1 = STREETS[b.bi];
    const z1 = STREETS[b.bj];
    let x = x0 + (x1 - x0) * b.t;
    let z = z0 + (z1 - z0) * b.t;
    if (z0 === z1) z += b.off;
    else x += b.off;
    out.set(x, PLAT, z);
    return Math.atan2(x1 - x0, z1 - z0);
  }
  const tmp = new THREE.Vector3();
  function updateBots(dt: number, t: number) {
    for (const b of bots) {
      if (!b.g.visible) continue;
      b.t += (b.speed * dt) / 6;
      if (b.t >= 1) nextLeg(b);
      const yaw = legPos(b, tmp);
      b.g.position.set(tmp.x, PLAT + Math.abs(Math.sin(t * 8 * b.speed + b.ph)) * 0.06, tmp.z);
      b.g.rotation.y = yaw;
    }
  }

  // ---------- Cashy: the walking, jumping mascot ----------
  function makeCashy() {
    const root = new THREE.Group();
    const green = new THREE.MeshStandardMaterial({ color: 0x7fbf5f, roughness: 0.6 });
    const greenHi = new THREE.MeshStandardMaterial({ color: 0xaad98c, roughness: 0.6 });
    const greenDark = new THREE.MeshStandardMaterial({ color: 0x4f8f3a, roughness: 0.7 });
    const hoodie = new THREE.MeshStandardMaterial({ color: 0x1d4bff, roughness: 0.75 });
    const hoodieDark = new THREE.MeshStandardMaterial({ color: 0x1236cc, roughness: 0.8 });
    const stripe = new THREE.MeshStandardMaterial({ color: 0xf2cf1d, roughness: 0.6 });
    const ink = new THREE.MeshStandardMaterial({ color: 0x0b0b2a, roughness: 0.4 });
    const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const shadowed = <M extends THREE.Mesh>(m: M) => {
      m.castShadow = true;
      return m;
    };

    const legs = [-0.17, 0.17].map((x) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.62, 0);
      const leg = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.56, 10), green));
      leg.position.y = -0.28;
      pivot.add(leg);
      const foot = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.3), greenDark));
      foot.position.set(0, -0.58, 0.05);
      pivot.add(foot);
      root.add(pivot);
      return pivot;
    });
    const torso = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.64, 0.44), hoodie));
    torso.position.y = 0.95;
    root.add(torso);
    const shirt = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.56), hoodieDark);
    shirt.position.set(0, 0.95, 0.222);
    root.add(shirt);
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.02), hoodieDark);
    pocket.position.set(0, 0.76, 0.225);
    root.add(pocket);
    const hem = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.06, 0.46), hoodieDark);
    hem.position.y = 0.65;
    root.add(hem);
    const hood = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.22, 0.26), hoodie));
    hood.position.set(0, 1.3, -0.12);
    root.add(hood);
    for (const x of [-0.09, 0.09]) {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 6), plainLight);
      s.position.set(x, 1.1, 0.235);
      root.add(s);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), plainLight);
      tip.position.set(x, 0.95, 0.235);
      root.add(tip);
    }
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.013, 6, 24, Math.PI), plainLight);
    chain.rotation.z = Math.PI;
    chain.position.set(0, 1.22, 0.235);
    root.add(chain);
    const dollarTex = canvasTex(64, 64, (g) => {
      g.fillStyle = "#e6f2ff";
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = "#0000ff";
      g.font = "bold 52px Arial, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("$", 32, 35);
    });
    const pendant = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.15), new THREE.MeshBasicMaterial({ map: dollarTex }));
    pendant.position.set(0, 1.04, 0.24);
    root.add(pendant);
    const arms = [-1, 1].map((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.44, 1.2, 0);
      const sleeve = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.46, 10), hoodie));
      sleeve.position.y = -0.23;
      pivot.add(sleeve);
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 0.06), stripe);
      st.position.set(side * 0.095, -0.23, 0);
      pivot.add(st);
      const st2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 0.06), stripe);
      st2.position.set(side * 0.095, -0.23, 0.07);
      pivot.add(st2);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.06, 10), hoodieDark);
      cuff.position.y = -0.47;
      pivot.add(cuff);
      const hand = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), green));
      hand.position.y = -0.55;
      pivot.add(hand);
      root.add(pivot);
      return pivot;
    });
    // banknote head
    const head = new THREE.Group();
    head.position.y = 1.72;
    head.rotation.z = 0.1;
    root.add(head);
    head.add(shadowed(new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.86, 0.1), green)));
    head.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.71, 0.102), greenHi));
    head.add(new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.61, 0.104), green));
    const numTex = canvasTex(128, 32, (g) => {
      g.clearRect(0, 0, 128, 32);
      g.fillStyle = "#4f8f3a";
      g.font = "bold 22px Arial, sans-serif";
      g.textBaseline = "middle";
      g.fillText("8453", 4, 17);
    });
    const num = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.07), new THREE.MeshBasicMaterial({ map: numTex, transparent: true }));
    num.position.set(-0.27, 0.25, 0.054);
    head.add(num);
    for (const x of [-0.18, 0.18]) {
      const ew = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), eyeWhite);
      ew.scale.set(1.15, 0.85, 0.35);
      ew.position.set(x, 0.02, 0.06);
      head.add(ew);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), ink);
      pupil.scale.set(1, 1, 0.5);
      pupil.position.set(x + 0.045, 0, 0.092);
      head.add(pupil);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.035, 0.03), ink);
      lid.position.set(x, 0.09, 0.085);
      lid.rotation.z = x < 0 ? -0.18 : 0.18;
      head.add(lid);
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.02), ink);
      brow.position.set(x, 0.19, 0.06);
      brow.rotation.z = x < 0 ? -0.35 : 0.35;
      head.add(brow);
    }
    const smirk = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.014, 6, 16, Math.PI * 0.7), ink);
    smirk.rotation.z = Math.PI * 1.2;
    smirk.position.set(0.05, -0.17, 0.06);
    head.add(smirk);
    root.scale.setScalar(1.35);
    return { root, legs, arms, head };
  }
  const cashyRig = makeCashy();
  const cashy = cashyRig.root;
  cashy.userData.info = "cashy";
  cashy.userData.stages = [1, 2, 3];
  cashy.userData.grow = 1;
  scene.add(cashy);
  PLACES.push(cashy);
  addLabel(cashy, nameOf("cashy"), 2.75, "city-tag--hero");

  const C = {
    state: "walk" as "walk" | "jump" | "roof",
    ai: 4, aj: 4, bi: 4, bj: 5, t: 0.2, walkLeft: 4,
    p0: new THREE.Vector3(), p1: new THREE.Vector3(),
    u: 0, dur: 1, arc: 2,
    next: null as JumpNext | null,
    onRoof: null as Roof | null,
    hops: 0, idle: 0, ph: 0,
  };
  function roofWorld(r: Roof, out: THREE.Vector3) {
    const g = r.g;
    const c = Math.cos(g.rotation.y);
    const s = Math.sin(g.rotation.y);
    const jx = (Math.random() - 0.5) * 2 * r.r;
    const jz = (Math.random() - 0.5) * 2 * r.r;
    out.set(g.position.x + (r.dx + jx) * c + (r.dz + jz) * s, PLAT + r.y, g.position.z - (r.dx + jx) * s + (r.dz + jz) * c);
    return out;
  }
  function nearestNode(p: THREE.Vector3): [number, number] {
    let best: [number, number] = [0, 0];
    let bd = Infinity;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const d = (STREETS[i] - p.x) ** 2 + (STREETS[j] - p.z) ** 2;
        if (d < bd) {
          bd = d;
          best = [i, j];
        }
      }
    }
    return best;
  }
  function roofChoices(from: THREE.Vector3, maxD: number, allowTall: boolean, maxDy = 9) {
    return ROOFS.filter((r) => {
      if (!r.g.visible || r === C.onRoof) return false;
      if (r.tall && !allowTall) return false;
      if (!r.tall && Math.abs(PLAT + r.y - from.y) > maxDy) return false;
      const d = Math.hypot(r.g.position.x + r.dx - from.x, r.g.position.z + r.dz - from.z);
      return d > 2 && d < maxD;
    });
  }
  function startJump(target: THREE.Vector3, next: JumpNext) {
    C.p0.copy(cashy.position);
    C.p1.copy(target);
    const d = Math.hypot(target.x - C.p0.x, target.z - C.p0.z);
    const dy = Math.abs(target.y - C.p0.y);
    C.dur = 0.75 + d * 0.06 + dy * 0.035;
    C.arc = 1.6 + d * 0.22;
    C.u = 0;
    C.state = "jump";
    C.next = next;
    cashy.rotation.y = Math.atan2(target.x - C.p0.x, target.z - C.p0.z);
  }
  function jumpDown() {
    const [i, j] = nearestNode(cashy.position);
    const opts = neighbours(i, j);
    const n = opts[rnd(opts.length)];
    C.ai = i;
    C.aj = j;
    C.bi = n[0];
    C.bj = n[1];
    C.t = 0;
    startJump(new THREE.Vector3(STREETS[i], PLAT, STREETS[j]), { kind: "street" });
  }
  function pose(walkAmt: number, jumpAmt: number, wave: boolean, t: number) {
    const sw = Math.sin(C.ph) * 0.55 * walkAmt;
    cashyRig.legs[0].rotation.x = sw - 0.5 * jumpAmt;
    cashyRig.legs[1].rotation.x = -sw + 0.3 * jumpAmt;
    cashyRig.arms[0].rotation.x = -sw * 0.9;
    cashyRig.arms[1].rotation.x = sw * 0.9;
    cashyRig.arms[0].rotation.z = -2.4 * jumpAmt;
    cashyRig.arms[1].rotation.z = 2.4 * jumpAmt + (wave ? 2.5 + Math.sin(t * 9) * 0.35 : 0);
    cashyRig.head.rotation.x = -0.15 * jumpAmt;
  }
  function updateCashy(dt: number, t: number) {
    if (C.state === "walk") {
      C.t += (2.3 * dt) / 6;
      if (C.t >= 1) {
        const opts = neighbours(C.bi, C.bj).filter(([a, c]) => !(a === C.ai && c === C.aj));
        const [ni, nj] = opts[rnd(opts.length)];
        C.ai = C.bi;
        C.aj = C.bj;
        C.bi = ni;
        C.bj = nj;
        C.t = 0;
      }
      const x0 = STREETS[C.ai];
      const z0 = STREETS[C.aj];
      const x1 = STREETS[C.bi];
      const z1 = STREETS[C.bj];
      cashy.position.set(x0 + (x1 - x0) * C.t, PLAT + Math.abs(Math.sin(C.ph)) * 0.08, z0 + (z1 - z0) * C.t);
      cashy.rotation.y = Math.atan2(x1 - x0, z1 - z0);
      C.ph += dt * 9;
      pose(1, 0, false, t);
      C.walkLeft -= dt;
      if (C.walkLeft <= 0) {
        const opts = roofChoices(cashy.position, 9, Math.random() < 0.12);
        if (opts.length) {
          const r = opts[rnd(opts.length)];
          C.hops = 0;
          startJump(roofWorld(r, new THREE.Vector3()), { kind: "roof", r });
        }
        C.walkLeft = 6 + Math.random() * 6;
      }
    } else if (C.state === "jump") {
      C.u = Math.min(1, C.u + dt / C.dur);
      const u = C.u;
      cashy.position.lerpVectors(C.p0, C.p1, u);
      cashy.position.y += 4 * C.arc * u * (1 - u);
      pose(0, Math.sin(Math.PI * u), false, t);
      if (u >= 1 && C.next) {
        if (C.next.kind === "roof") {
          C.state = "roof";
          C.onRoof = C.next.r;
          C.hops++;
          C.idle = 0.8 + Math.random() * 1.4;
        } else {
          C.state = "walk";
          C.onRoof = null;
          C.walkLeft = 5 + Math.random() * 6;
        }
      }
    } else if (C.onRoof) {
      C.idle -= dt;
      pose(0, 0, C.onRoof.tall || C.hops === 1, t);
      if (!C.onRoof.g.visible) {
        jumpDown();
        return;
      }
      if (C.idle <= 0) {
        const opts = C.hops < 4 && Math.random() < 0.7 ? roofChoices(cashy.position, 10, false, 6) : [];
        if (opts.length) {
          const r = opts[rnd(opts.length)];
          startJump(roofWorld(r, new THREE.Vector3()), { kind: "roof", r });
        } else jumpDown();
      }
    }
  }
  cashy.position.set(STREETS[4], PLAT, STREETS[4]);

  // ---------- Payday: stock certificates thrown from the tower ----------
  const certTex = canvasTex(160, 96, (g, w, h) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#0000ff";
    g.lineWidth = 6;
    g.strokeRect(5, 5, w - 10, h - 10);
    g.lineWidth = 2;
    g.strokeRect(14, 14, w - 28, h - 28);
    g.fillStyle = "#0000ff";
    g.font = "bold 34px Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("MSTR", w / 2, h / 2 - 4);
    g.font = "bold 11px Arial, sans-serif";
    g.fillText("STOCK", w / 2, h / 2 + 22);
  });
  const certGeo = new THREE.PlaneGeometry(0.95, 0.57);
  const certs: Cert[] = [];
  for (let k = 0; k < 90; k++) {
    const m = new THREE.Mesh(certGeo, new THREE.MeshStandardMaterial({ map: certTex, side: THREE.DoubleSide, transparent: true, roughness: 0.6 }));
    m.castShadow = true;
    m.visible = false;
    scene.add(m);
    certs.push({ m, v: new THREE.Vector3(), spin: new THREE.Vector3(), landed: false, life: 0, ph: 0 });
  }
  function throwStocks(n: number) {
    let made = 0;
    for (const c of certs) {
      if (c.m.visible) continue;
      const a = Math.random() * Math.PI * 2;
      const hs = 1.8 + Math.random() * 3.6;
      c.m.position.copy(TOWER_TOP).add(new THREE.Vector3((Math.random() - 0.5) * 1.4, 0, (Math.random() - 0.5) * 1.4));
      c.v.set(Math.cos(a) * hs, 3.5 + Math.random() * 4.5, Math.sin(a) * hs);
      c.spin.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
      c.landed = false;
      c.life = 0;
      c.ph = Math.random() * 6;
      c.m.material.opacity = 1;
      c.m.visible = true;
      if (++made >= n) break;
    }
  }
  function updateStocks(dt: number, t: number) {
    for (const c of certs) {
      if (!c.m.visible) continue;
      if (!c.landed) {
        c.v.y -= 6 * dt;
        if (c.v.y < -2) c.v.y = -2;
        const damp = Math.exp(-0.55 * dt);
        c.v.x *= damp;
        c.v.z *= damp;
        c.m.position.addScaledVector(c.v, dt);
        c.m.position.x += Math.sin(t * 3 + c.ph) * 0.012;
        c.m.rotation.x += c.spin.x * dt;
        c.m.rotation.y += c.spin.y * dt;
        c.m.rotation.z += c.spin.z * dt;
        if (c.m.position.y <= PLAT + 0.04) {
          c.landed = true;
          c.m.position.y = PLAT + 0.04 + Math.random() * 0.01;
          c.m.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI);
        }
      } else {
        c.life += dt;
        if (c.life > 3) {
          c.m.material.opacity = Math.max(0, 1 - (c.life - 3) / 1.5);
          if (c.m.material.opacity === 0) c.m.visible = false;
        }
      }
    }
  }

  // ---------- Stages ----------
  let selected: THREE.Group | null = null;
  function setStage(n: number) {
    for (const g of PLACES) {
      const show = (g.userData.stages as number[]).includes(n);
      if (show && !g.visible) {
        g.userData.grow = 0;
        g.scale.y = 0.01;
      }
      g.visible = show;
    }
    for (const l of labels) l.lab.visible = l.owner.visible;
    bots.forEach((b, i) => {
      b.g.visible = i < BOT_COUNT[n];
    });
    if (selected && !selected.visible) close();
  }
  function updateGrowth(dt: number) {
    for (const g of PLACES) {
      if (g.userData.grow < 1) {
        g.userData.grow = Math.min(1, g.userData.grow + dt * (reduceMotion ? 10 : 1.4));
        const e = 1 - Math.pow(1 - g.userData.grow, 3);
        g.scale.y = Math.max(0.01, e) * (g === cashy ? 1.35 : 1);
      }
    }
  }

  // ---------- Payday button ----------
  let flash = 0;
  function runPayday() {
    hooks.onPayday({ amount: 0.0021 + Math.random() * 0.004, wallets: 120 + Math.floor(Math.random() * 180) + 140 });
    throwStocks(reduceMotion ? 12 : 40);
    flash = 1;
  }

  // ---------- Camera modes: orbit, follow Cashy, fly-through, keyboard flight ----------
  let following = false;
  let touring = false;
  let tourU = 0;
  const tourCurve = new THREE.CatmullRomCurve3(
    [
      [-15, 9, -15], [15, 9, -15], [15, 6, 3], [3, 4, 3], [3, 4, -3], [-3, 3.5, -3], [-3, 4, 9], [-15, 7, 9],
    ].map(([x, y, z]) => new THREE.Vector3(x, y + PLAT, z)),
    true,
    "centripetal",
  );
  function setFollow(on: boolean) {
    following = on;
    hooks.onFollow(on);
    if (on) {
      setTour(false);
      setSpin(false);
    }
  }
  function setTour(on: boolean) {
    if (touring && !on) controls.target.copy(tourCurve.getPointAt((tourU + 0.02) % 1)); // hand the view back to the orbit controls
    touring = on;
    hooks.onTour(on);
    controls.enabled = !on;
    if (on) {
      following = false;
      hooks.onFollow(false);
    }
  }
  function setSpin(on: boolean) {
    controls.autoRotate = on;
    hooks.onSpin(on);
    if (on) {
      setFollow(false);
      setTour(false);
    }
  }
  on(renderer.domElement, "pointerdown", () => {
    if (touring) setTour(false);
  });

  // Keys only steer the city while it has focus, so they never get in the way of the rest of the page.
  const keys = new Set<string>();
  const flightKeys = ["w", "a", "s", "d", "r", "f", "arrowup", "arrowdown", "arrowleft", "arrowright"];
  on(renderer.domElement, "keydown", (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (flightKeys.includes(k)) {
      keys.add(k);
      e.preventDefault();
      if (touring) setTour(false);
      if (following) setFollow(false);
    }
    if (k === "escape") close();
  });
  on(renderer.domElement, "keyup", (e: KeyboardEvent) => keys.delete(e.key.toLowerCase()));
  on(renderer.domElement, "blur", () => keys.clear());
  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  const move = new THREE.Vector3();
  function keyboardFly(dt: number) {
    if (!keys.size) return;
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    right.crossVectors(fwd, camera.up).normalize();
    move.set(0, 0, 0);
    if (keys.has("w") || keys.has("arrowup")) move.add(fwd);
    if (keys.has("s") || keys.has("arrowdown")) move.sub(fwd);
    if (keys.has("d") || keys.has("arrowright")) move.add(right);
    if (keys.has("a") || keys.has("arrowleft")) move.sub(right);
    if (keys.has("r")) move.y += 1;
    if (keys.has("f")) move.y -= 1;
    if (move.lengthSq() === 0) return;
    const speed = 6 + camera.position.distanceTo(controls.target) * 0.6;
    move.normalize().multiplyScalar(speed * dt);
    camera.position.add(move);
    controls.target.add(move);
  }
  function clampView() {
    const tgt = controls.target;
    tgt.x = THREE.MathUtils.clamp(tgt.x, -HALF - 4, HALF + 4);
    tgt.z = THREE.MathUtils.clamp(tgt.z, -HALF - 4, HALF + 4);
    tgt.y = THREE.MathUtils.clamp(tgt.y, 0.8, 30);
    if (camera.position.y < PLAT + 0.6) camera.position.y = PLAT + 0.6;
  }

  // Smooth "fly to" for the info card
  type Tween = { t: number; dur: number; fromPos: THREE.Vector3; fromTgt: THREE.Vector3; toPos: THREE.Vector3; toTgt: THREE.Vector3 };
  let flyTween: Tween | null = null;
  function flyTo(g: THREE.Group) {
    setFollow(false);
    setTour(false);
    setSpin(false);
    const box = new THREE.Box3().setFromObject(g);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const dist = Math.max(8, Math.max(size.x, size.y, size.z) * 2.2);
    const dir = camera.position.clone().sub(controls.target).normalize();
    if (dir.y < 0.25) {
      dir.y = 0.35;
      dir.normalize();
    }
    flyTween = {
      t: 0,
      dur: reduceMotion ? 0.01 : 1.4,
      fromPos: camera.position.clone(),
      fromTgt: controls.target.clone(),
      toTgt: center,
      toPos: center.clone().add(dir.multiplyScalar(dist)),
    };
  }
  function updateFly(dt: number) {
    if (!flyTween) return;
    flyTween.t = Math.min(1, flyTween.t + dt / flyTween.dur);
    const e = flyTween.t < 0.5 ? 4 * flyTween.t ** 3 : 1 - Math.pow(-2 * flyTween.t + 2, 3) / 2;
    camera.position.lerpVectors(flyTween.fromPos, flyTween.toPos, e);
    controls.target.lerpVectors(flyTween.fromTgt, flyTween.toTgt, e);
    if (flyTween.t >= 1) flyTween = null;
  }

  // ---------- Selection ----------
  function select(g: THREE.Group) {
    selected = g;
    hooks.onSelect(g.userData.info as string);
    for (const l of labels) l.el.classList.toggle("is-active", l.owner === g);
  }
  function close() {
    selected = null;
    hooks.onSelect(null);
    for (const l of labels) l.el.classList.remove("is-active");
  }

  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  let downAt: [number, number] | null = null;
  on(renderer.domElement, "pointerdown", (e: PointerEvent) => {
    downAt = [e.clientX, e.clientY];
    flyTween = null;
  });
  on(renderer.domElement, "pointerup", (e: PointerEvent) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
    const box = renderer.domElement.getBoundingClientRect();
    ptr.set(((e.clientX - box.left) / box.width) * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hits = ray.intersectObjects(
      PLACES.filter((g) => g.visible),
      true,
    );
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o && !o.userData.info) o = o.parent;
      if (o) {
        select(o as THREE.Group);
        return;
      }
    }
    close();
  });

  // ---------- Size, visibility and the loop ----------
  const resize = new ResizeObserver(() => {
    width = Math.max(1, host.clientWidth);
    height = Math.max(1, host.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    labelRenderer.setSize(width, height);
  });
  resize.observe(host);
  let visible = true;
  const watch = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  });
  watch.observe(host);

  let nextAuto = 6;
  let raf = 0;
  let disposed = false;
  const clock = new THREE.Clock();
  const followTarget = new THREE.Vector3();
  const delta = new THREE.Vector3();
  function tick() {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible) return; // off screen: no work at all
    const t = clock.elapsedTime;
    updateBots(dt, t);
    updateCashy(dt, t);
    updateStocks(dt, t);
    updateGrowth(dt);

    flash = Math.max(0, flash - dt * 0.8);
    beacon.scale.setScalar(1 + flash * 1.6 + (reduceMotion ? 0 : 0.15 * Math.sin(t * 3)));
    glowMat.color.setRGB(0.55 + 0.45 * flash, 0.55 + 0.45 * flash, 1);
    signMat.opacity = reduceMotion ? 1 : Math.sin(t * 5) > -0.9 ? 1 : 0.5;

    // The tower throws a few certificates now and then so the city feels alive. No numbers: those are for the demo button.
    if (!reduceMotion && t > nextAuto) {
      throwStocks(40);
      flash = 1;
      nextAuto = t + 14;
    }

    if (touring) {
      tourU = (tourU + dt / 70) % 1;
      camera.position.copy(tourCurve.getPointAt(tourU));
      camera.lookAt(tourCurve.getPointAt((tourU + 0.02) % 1));
    } else {
      if (following) {
        followTarget.copy(cashy.position);
        followTarget.y += 2;
        delta.subVectors(followTarget, controls.target).multiplyScalar(Math.min(1, dt * 4));
        controls.target.add(delta);
        camera.position.add(delta);
      }
      keyboardFly(dt);
      updateFly(dt);
      clampView();
      controls.update();
    }
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  }

  setStage(3);
  tick();

  function dispose() {
    disposed = true;
    cancelAnimationFrame(raf);
    resize.disconnect();
    watch.disconnect();
    cleanups.forEach((fn) => fn());
    controls.dispose();
    // Free every texture, material and shape on the graphics card.
    const freed = new Set<unknown>();
    const free = (item: { dispose(): void } | undefined) => {
      if (item && !freed.has(item)) {
        freed.add(item);
        item.dispose();
      }
    };
    scene.traverse((obj) => {
      const o = obj as THREE.Mesh;
      free(o.geometry);
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) {
        for (const value of Object.values(m)) if (value instanceof THREE.Texture) free(value);
        free(m);
      }
    });
    free(facade);
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    labelRenderer.domElement.remove();
  }

  return {
    setStage,
    runPayday,
    setFollow,
    setTour,
    setSpin,
    flyToSelected: () => selected && flyTo(selected),
    close,
    dispose,
  };
}
