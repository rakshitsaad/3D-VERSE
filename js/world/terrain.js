// The ground: a dark low-poly valley that lifts to a plateau behind the stairs and rises into hills
// towards the moon, plus the terraced path of printed slabs and the printer's plinth.
import * as THREE from 'three';
import { fbm2, mulberry32, patchMaterial, smoothstep, clamp } from './utils.js';

export const PLATEAU = 3.5;

export function heightAt(x, z) {
  const ax = Math.abs(x);
  let h = PLATEAU * smoothstep(3, -6, z);                       // valley floor -> plateau
  const wall = Math.max(0, ax - 10);
  h += wall * wall * 0.011 * (0.7 + 0.6 * fbm2(x * 0.04, z * 0.04, 3)); // valley walls
  const far = Math.max(0, -z - 34);
  h += far * (0.07 + 0.18 * fbm2(x * 0.025, z * 0.025, 9));     // hills behind the hall
  const rough = Math.min(1, smoothstep(6, 16, ax) + smoothstep(-30, -50, z));
  h += (fbm2(x * 0.15, z * 0.15, 5) - 0.5) * 1.6 * rough;       // low-poly roughness off the path
  return h;
}

// Slab layout: eleven printed terraces from the valley floor up to the plinth under the gate.
export const SLABS = Array.from({ length: 11 }, (_, i) => ({
  x: 0, z: 14 - i * 1.8, w: 8.6 - i * 0.26, d: 2.0, top: 0.32 * (i + 1),
}));
const PLINTH = { x: 0, z: -6.9, w: 11, d: 7.6, top: 3.6 };

export function createTerrain({ palette, quality }) {
  const group = new THREE.Group();
  group.name = 'terrain';

  // ground mesh, vertices jittered so the facets read as hand-cut low-poly
  const [segX, segZ] = quality.terrain;
  const width = 240, depth = 170;
  let geo = new THREE.PlaneGeometry(width, depth, segX, segZ);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, -45);
  const pos = geo.attributes.position;
  const rng = mulberry32(11);
  for (let i = 0; i < pos.count; i++) {
    const ix = i % (segX + 1), iz = Math.floor(i / (segX + 1));
    let x = pos.getX(i), z = pos.getZ(i);
    if (ix > 0 && ix < segX && iz > 0 && iz < segZ) {
      x += (rng() - 0.5) * (width / segX) * 0.7;
      z += (rng() - 0.5) * (depth / segZ) * 0.7;
    }
    pos.setXYZ(i, x, heightAt(x, z), z);
  }
  geo = geo.toNonIndexed();
  geo.computeVertexNormals();

  // per-face colour: ink in the hollows, steel on slopes and crests
  const p = geo.attributes.position, n = geo.attributes.normal;
  const colors = new Float32Array(p.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i += 3) {
    const h = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3;
    const slope = 1 - n.getY(i);
    c.copy(palette.ink).lerp(palette.steel, clamp(0.3 + slope * 2.4 + h * 0.012));
    for (let k = 0; k < 3; k++) colors.set([c.r, c.g, c.b], (i + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));

  // printed slabs: risers show layer lines, treads show a diagonal infill hatch
  const slabMat = patchMaterial(new THREE.MeshStandardMaterial({ color: palette.steel, roughness: 0.9, metalness: 0 }), {
    key: 'printed-slab',
    color: /* glsl */ `
      float riser = 1.0 - step(0.5, abs(vWNormal.y));
      float layerY = vWPos.y / 0.09;
      float lw = fwidth(layerY);
      float groove = 1.0 - smoothstep(0.0, 0.16 + lw, 0.5 - abs(fract(layerY) - 0.5));
      groove *= 1.0 - smoothstep(0.3, 0.6, lw);
      diffuseColor.rgb *= 1.0 - 0.38 * groove * riser;
      float tread = step(0.5, vWNormal.y);
      float hy = (vWPos.x + vWPos.z) / 0.4;
      float hw = fwidth(hy);
      float hatch = 1.0 - smoothstep(0.0, 0.12 + hw, 0.5 - abs(fract(hy) - 0.5));
      hatch *= 1.0 - smoothstep(0.3, 0.6, hw);
      diffuseColor.rgb *= 1.0 - 0.18 * hatch * tread;`,
  });
  const blocks = [...SLABS, PLINTH];
  const slabs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), slabMat, blocks.length);
  const edges = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: palette.bone.clone().multiplyScalar(0.3) }),
    blocks.length,
  );
  const m = new THREE.Matrix4();
  blocks.forEach((b, i) => {
    const bottom = -1.2;
    m.makeScale(b.w, b.top - bottom, b.d).setPosition(b.x, (b.top + bottom) / 2, b.z);
    slabs.setMatrixAt(i, m);
    // a fine lit edge along each tread's front lip
    m.makeScale(b.w, 0.025, 0.025).setPosition(b.x, b.top, b.z + b.d / 2);
    edges.setMatrixAt(i, m);
  });

  group.add(ground, slabs, edges);
  return { group, heightAt };
}
