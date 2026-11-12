// Landmark: Feel.cash Exchange.
import * as THREE from 'three';
import { canvasTex, signTex, put } from '../core.js';
import { topMat, indigoMat, glassMat, glowMat, block, drum, solid } from '../materials.js';
import { addLabel, place, roof } from '../world.js';
import { INFO } from '../data.js';
import { SITES } from '../plan.js';

// ---------- Landmark: Feel.cash Exchange ----------
const feel = new THREE.Group();
const tickerTex = canvasTex(2048, 64, (g, w, h) => {
  g.fillStyle = '#000033'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffffff'; g.font = '500 34px "Courier New", monospace'; g.textBaseline = 'middle';
  const items = ['AAPL ▲', 'NVDA ▲', '$CASHY ▲', 'TSLA ▼', '$IPOD ▲', 'WHERE STOCKS MEET INTERNET CULTURE'];
  let x = 20; for (const it of items) { g.fillText(it, x, h / 2 + 2); x += g.measureText(it).width + 54; g.fillRect(x - 30, h / 2 - 3, 6, 6); }
});
tickerTex.wrapS = THREE.RepeatWrapping;
{
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.3, 0.14, 48), topMat); disc.receiveShadow = true; put(feel, disc, 0, 0.07, 0);
  put(feel, solid(new THREE.CylinderGeometry(1.75, 1.85, 1.1, 40), indigoMat, false), 0, 0.14 + 0.55, 0);
  put(feel, new THREE.Mesh(new THREE.CylinderGeometry(1.86, 1.86, 0.46, 48, 1, true), new THREE.MeshBasicMaterial({ map: tickerTex })), 0, 0.9, 0);
  put(feel, drum(1.5, 1.5, 1.2, 1, 40), 0, 1.24 + 0.6, 0);
  put(feel, new THREE.Mesh(new THREE.CylinderGeometry(1.56, 1.56, 0.1, 40), glowMat), 0, 2.44, 0);
  // twin towers: a stock and the coin paired with it
  put(feel, block(0.95, 5.6, 0.95, 1), -0.62, 2.44 + 2.8, 0);
  put(feel, block(0.95, 4.5, 0.95, 0), 0.62, 2.44 + 2.25, 0);
  put(feel, solid(new THREE.BoxGeometry(0.5, 0.32, 0.5), glassMat), 0, 5.6, 0);
  put(feel, new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 1.0), glowMat), -0.62, 8.06, 0);
  put(feel, new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 1.0), glowMat), 0.62, 6.96, 0);
  const wordTex = signTex('feel.cash', { w: 320, h: 72, bg: '#000033', font: '600 46px Arial, sans-serif' });
  const word = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.52), new THREE.MeshBasicMaterial({ map: wordTex, side: THREE.DoubleSide }));
  put(feel, word, 0, 2.86, 1.2);
  feel.rotation.y = Math.PI / 4;
  addLabel(feel, 'Feel.cash', 9.3, { icon: '↗', near: false });
}
place(feel, ...SITES.feel, INFO.feel, 'feel');
roof(feel, -0.62, 0, 8.1, 0.05);

export { tickerTex };
