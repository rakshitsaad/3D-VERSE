// Shared helpers for offline subjects (dev-only).
import * as THREE from 'three';
import { palette } from '../../js/world/palette.js';
import { compose, mergeParts, mulberry32 } from '../../js/world/utils.js';

export { THREE, palette, compose, mergeParts, mulberry32 };

// Cutout stage: a long lens looking along -z. The plane z = 0 spans `worldWidth` units across the frame
// with y = 0 on the bottom edge (100 px per unit for a 2400 px, 24-unit cutout). Root everything below
// y = 0 so subjects are anchored to the bottom edge at any depth.
export function cutoutStage({ aspect }, { worldWidth = 24, fov = 18 } = {}) {
  const scene = new THREE.Scene();
  const height = worldWidth / aspect;
  const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 400);
  const distance = height / 2 / Math.tan(THREE.MathUtils.degToRad(fov / 2));
  camera.position.set(0, height / 2, distance);
  camera.lookAt(0, height / 2, 0);
  return { scene, camera, W: worldWidth, H: height };
}

// Night lighting for foreground pieces: mostly silhouette, a warm low key from the front-left (the
// lanterns), a cold rim from behind (the moon), a little sky fill.
// The key is amber softened towards bone: a saturated amber key turns dark materials brown.
export function cutoutLights(scene, { key = 0.55, rim = 2.6, fill = 0.35 } = {}) {
  const hemi = new THREE.HemisphereLight(palette.cold, palette.ink, fill);
  const rimLight = new THREE.DirectionalLight(palette.cold, rim);
  rimLight.position.set(5, 7, -9);
  const keyLight = new THREE.DirectionalLight(palette.amber.clone().lerp(palette.bone, 0.6), key);
  keyLight.position.set(-7, 2.5, 8);
  scene.add(hemi, rimLight, keyLight);
  return { hemi, rimLight, keyLight };
}

// A flat ribbon that always faces the camera, following points in the xy plane (z kept per point),
// tapering from w0 to w1. Per-vertex colours from colorAt(t).
export function ribbon(points, w0, w1, colorAt) {
  const pos = [], col = [], idx = [];
  const c = new THREE.Color();
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    let tx = b.x - a.x, ty = b.y - a.y;
    const len = Math.hypot(tx, ty) || 1;
    tx /= len; ty /= len;
    const t = i / (points.length - 1);
    const w = (w0 + (w1 - w0) * t) / 2;
    pos.push(p.x - ty * w, p.y + tx * w, p.z, p.x + ty * w, p.y - tx * w, p.z);
    colorAt(t, c);
    col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    if (i > 0) {
      const k = (i - 1) * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

// Concatenate indexed/non-indexed geometries that share attributes (position + color [+ normal]).
export function concat(geometries) {
  const parts = geometries.map((g) => (g.index ? g.toNonIndexed() : g));
  const names = Object.keys(parts[0].attributes);
  const out = new THREE.BufferGeometry();
  for (const name of names) {
    const size = parts[0].attributes[name].itemSize;
    const total = parts.reduce((n, g) => n + g.attributes[name].count * size, 0);
    const arr = new Float32Array(total);
    let o = 0;
    for (const g of parts) { arr.set(g.attributes[name].array, o); o += g.attributes[name].array.length; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  return out;
}

// Thick "wireframe": a thin cylinder along every edge of `geometry` (WireframeGeometry edges).
export function wireTubes(geometry, radius, material) {
  const wire = new THREE.WireframeGeometry(geometry);
  const p = wire.attributes.position;
  const count = p.count / 2;
  const mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(radius, radius, 1, 4, 1, true), material, count);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), mid = new THREE.Vector3(), dir = new THREE.Vector3();
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), s = new THREE.Vector3(), m = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    a.fromBufferAttribute(p, i * 2);
    b.fromBufferAttribute(p, i * 2 + 1);
    dir.subVectors(b, a);
    const len = dir.length();
    mid.addVectors(a, b).multiplyScalar(0.5);
    q.setFromUnitVectors(up, dir.normalize());
    mesh.setMatrixAt(i, m.compose(mid, q, s.set(1, len, 1)));
  }
  wire.dispose();
  return mesh;
}

// A soft round glow that writes alpha (works on transparent cutouts, unlike bloom).
export function halo(color, size, strength = 0.7, falloff = 2.2) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uColor: { value: color }, uStrength: { value: strength }, uFalloff: { value: falloff } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 uColor; uniform float uStrength, uFalloff; varying vec2 vUv;
        void main(){ float r = length(vUv - 0.5) * 2.0; float a = pow(max(0.0, 1.0 - r), uFalloff) * uStrength; gl_FragColor = vec4(uColor, a); }`,
    }),
  );
  mesh.renderOrder = 10;
  return mesh;
}

// The world's low-poly pine (cone tiers + trunk), trunk extended below ground for bottom anchoring.
export function pineGeometry() {
  const tiers = [[1.7, 2.6, 2.1], [1.3, 2.3, 3.5], [0.9, 2.0, 4.8], [0.5, 1.5, 5.9]];
  return mergeParts([
    ...tiers.map(([r, h, y], i) => ({ geometry: new THREE.ConeGeometry(r, h, 6, 1), matrix: compose(0, y, 0, 0, i * 0.5, 0) })),
    { geometry: new THREE.CylinderGeometry(0.12, 0.2, 4.2, 5), matrix: compose(0, -0.5, 0) },
  ]);
}

// Simple 1D value noise for silhouettes.
export function noise1(x, seed = 0) {
  const h = (i) => { const s = Math.sin((i + seed * 101.7) * 127.1) * 43758.5453; return s - Math.floor(s); };
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return h(i) * (1 - u) + h(i + 1) * u;
}
