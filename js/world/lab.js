// The workshop hall behind the gate: a long low building with deep eaves, a glowing shoji transom,
// glowing paper panels in some bays and open bays where small printers stand as silhouettes
// against the lit back wall.
import * as THREE from 'three';
import { compose, mergeParts } from './utils.js';

const W = 34;          // hall width
const D = 7;           // hall depth
const H = 3.9;         // wall height above the plinth
const FLOOR = 0.5;     // plinth top
const BAYS = 6;
const BAY_W = W / BAYS;
const CLOSED = [0, 2, 3, 5]; // bays with paper panels; 1 and 4 stand open
const TRANSOM_H = 1.05;
const LOWER_H = H - 0.3 - TRANSOM_H - 0.12;

function miniPrinterGeometry() {
  const b = (w, h, d, x, y, z) => ({ geometry: new THREE.BoxGeometry(w, h, d), matrix: compose(x, y, z) });
  return mergeParts([
    b(1.5, 0.14, 1.2, 0, 0.07, 0),       // base
    b(0.09, 1.9, 0.09, -0.66, 1.0, 0),   // posts
    b(0.09, 1.9, 0.09, 0.66, 1.0, 0),
    b(1.45, 0.1, 0.12, 0, 1.92, 0),      // top beam
    b(1.36, 0.08, 0.1, 0, 1.45, 0.06),   // X rail
    b(0.95, 0.06, 0.85, 0, 0.38, 0.05),  // bed
    b(0.22, 0.26, 0.2, 0.12, 1.25, 0.1), // head
    b(0.46, 0.46, 0.36, 0.12, 0.64, 0.05), // the part being printed
  ]);
}

function roofGeometry() {
  // cross-section (x = depth, y = up) with upturned eave tips, extruded along the hall
  const s = new THREE.Shape();
  s.moveTo(-6.2, 0.28);
  s.lineTo(-4.2, 0.0);
  s.lineTo(0, 1.25);
  s.lineTo(4.2, 0.0);
  s.lineTo(6.2, 0.28);
  s.lineTo(6.2, 0.46);
  s.lineTo(0, 1.6);
  s.lineTo(-6.2, 0.46);
  s.closePath();
  const length = W + 3.4;
  const g = new THREE.ExtrudeGeometry(s, { depth: length, bevelEnabled: false });
  g.translate(0, 0, -length / 2);
  g.rotateY(Math.PI / 2); // depth axis -> world z (front eave towards +z), extrusion -> world x
  return g;
}

export function createLab({ palette }) {
  const group = new THREE.Group();
  group.name = 'lab';
  group.position.set(0, 3.5, -24);

  const frameMat = new THREE.MeshStandardMaterial({ color: palette.char, roughness: 0.85, metalness: 0.1 });
  const inkMat = new THREE.MeshBasicMaterial({ color: palette.ink });

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(W + 2, FLOOR, D + 1.5), frameMat);
  plinth.position.y = FLOOR / 2;
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, H, 0.3), frameMat);
  backWall.position.set(0, FLOOR + H / 2, -D / 2 - 0.15);

  // lit back wall: warm amber low, cooling to a dim vermilion under the ceiling
  const glowH = H - 0.3;
  const glowGeo = new THREE.PlaneGeometry(W, glowH, 1, 4);
  const gp = glowGeo.attributes.position;
  const glowColors = new Float32Array(gp.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < gp.count; i++) {
    const t = (gp.getY(i) + glowH / 2) / glowH;
    c.copy(palette.amber).lerp(palette.vermilion, t * 0.7).lerp(palette.bone, 0.1).multiplyScalar(0.4 * (1 - t * 0.6));
    glowColors.set([c.r, c.g, c.b], i * 3);
  }
  glowGeo.setAttribute('color', new THREE.BufferAttribute(glowColors, 3));
  const glow = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({ vertexColors: true }));
  glow.position.set(0, FLOOR + glowH / 2, -D / 2 + 0.02);

  // paper: the transom across the full front, and the lower panels of the closed bays
  // held back (a touch of cream, about half the light) so the hall glows behind the printer, not over it
  const paperColor = palette.amber.clone().lerp(palette.vermilion, 0.2).lerp(palette.bone, 0.12).multiplyScalar(0.3);
  const paperMat = new THREE.MeshBasicMaterial({ color: paperColor });
  const lowerPaperMat = new THREE.MeshBasicMaterial({ color: paperColor.clone().multiplyScalar(0.7) });
  const transomY = FLOOR + LOWER_H + 0.12 + TRANSOM_H / 2;
  const transom = new THREE.Mesh(new THREE.PlaneGeometry(W, TRANSOM_H), paperMat);
  transom.position.set(0, transomY, D / 2);
  const lowerPanels = new THREE.InstancedMesh(new THREE.PlaneGeometry(BAY_W, LOWER_H), lowerPaperMat, CLOSED.length);
  const bayX = (b) => -W / 2 + BAY_W * (b + 0.5);
  CLOSED.forEach((b, i) => lowerPanels.setMatrixAt(i, compose(bayX(b), FLOOR + LOWER_H / 2, D / 2)));

  // timber: posts, beams and kumiko mullions as one instanced unit box
  const bars = [];
  const bar = (x, y, z, sx, sy, sz) => bars.push([x, y, z, sx, sy, sz]);
  for (let i = 0; i <= BAYS; i++) bar(-W / 2 + i * BAY_W, FLOOR + H / 2, D / 2 + 0.08, 0.34, H, 0.34);
  bar(0, FLOOR + H - 0.1, D / 2 + 0.1, W + 0.6, 0.32, 0.36);                 // head beam
  bar(0, FLOOR + LOWER_H + 0.06, D / 2 + 0.06, W, 0.12, 0.16);              // rail between transom and panels
  const transomVerticals = Math.round(W / 0.42);
  for (let i = 1; i < transomVerticals; i++) bar(-W / 2 + (i * W) / transomVerticals, transomY, D / 2 + 0.03, 0.035, TRANSOM_H, 0.04);
  bar(0, transomY + TRANSOM_H / 6, D / 2 + 0.03, W, 0.035, 0.04);
  bar(0, transomY - TRANSOM_H / 6, D / 2 + 0.03, W, 0.035, 0.04);
  for (const b of CLOSED) {
    for (let k = 1; k < 6; k++) bar(bayX(b) - BAY_W / 2 + (k * BAY_W) / 6, FLOOR + LOWER_H / 2, D / 2 + 0.03, 0.04, LOWER_H, 0.04);
    for (let k = 1; k < 4; k++) bar(bayX(b), FLOOR + (k * LOWER_H) / 4, D / 2 + 0.03, BAY_W, 0.04, 0.04);
  }
  const timber = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), inkMat, bars.length);
  const m = new THREE.Matrix4();
  bars.forEach(([x, y, z, sx, sy, sz], i) => timber.setMatrixAt(i, compose(x, y, z, 0, 0, 0, sx, sy, sz, 'XYZ', m)));

  const roof = new THREE.Mesh(roofGeometry(), frameMat);
  roof.position.y = FLOOR + H;
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(W + 3.4, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: palette.vermilion.clone().multiplyScalar(0.46) }));
  fascia.position.set(0, FLOOR + H + 0.37, 6.2);

  // small printers in the open bays, dark against the glow, each with a lit nozzle
  const spots = [];
  for (const b of [1, 4]) for (const dx of [-1.3, 1.3]) spots.push([bayX(b) + dx, FLOOR, 0.4 + (dx > 0 ? -0.5 : 0)]);
  const minis = new THREE.InstancedMesh(miniPrinterGeometry(), inkMat, spots.length);
  const glints = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.05, 8, 6),
    new THREE.MeshBasicMaterial({ color: palette.amber.clone().multiplyScalar(2.4) }),
    spots.length,
  );
  spots.forEach(([x, y, z], i) => {
    minis.setMatrixAt(i, compose(x, y, z, 0, (i % 2 ? -0.25 : 0.2), 0, 1, 1, 1, 'XYZ', m));
    glints.setMatrixAt(i, compose(x + 0.12, y + 1.1, z + 0.1));
  });

  group.add(plinth, backWall, glow, transom, lowerPanels, timber, roof, fascia, minis, glints);

  // everything that glows dims together with the shot's `lights`
  const glowing = [glow.material, paperMat, lowerPaperMat, glints.material].map((material) => [material, material.color.clone()]);
  let lastLights = -1;
  return {
    group,
    update(state) {
      if (Math.abs(state.lights - lastLights) < 1e-3) return;
      lastLights = state.lights;
      for (const [material, base] of glowing) material.color.copy(base).multiplyScalar(state.lights);
    },
  };
}
