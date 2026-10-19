// Shared helpers for the world modules: maths, seeded randomness, noise, geometry building and shader patching.
import * as THREE from 'three';

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export function smoothstep(e0, e1, x) {
  const t = clamp((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

// Critically damped follow (Unity's SmoothDamp): eases in and out with no overshoot and no velocity
// jump when the target moves. `s` is { value, velocity }; maxSpeed caps travel per second.
export function smoothDamp(s, target, smoothTime, maxSpeed, dt) {
  if (dt <= 0) return s.value;
  const omega = 2 / smoothTime;
  const x = omega * dt;
  const decay = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const maxChange = maxSpeed * smoothTime;
  const change = clamp(s.value - target, -maxChange, maxChange);
  const goal = s.value - change;
  const temp = (s.velocity + omega * change) * dt;
  let value = goal + (change + temp) * decay;
  let velocity = (s.velocity - omega * temp) * decay;
  if ((target - s.value > 0) === (value > target)) { value = target; velocity = 0; } // never overshoot
  s.value = value;
  s.velocity = velocity;
  return value;
}

// deterministic random stream, so the world is laid out the same on every load
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x, y, seed) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(seed + 1, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function noise2(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm2(x, y, seed = 0, octaves = 4) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2(x * freq, y * freq, seed + i * 17);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

// GLSL counterparts for shaders
export const GLSL_NOISE = /* glsl */ `
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
               mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; }
    return s / 0.9375;
  }
`;

const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

// position / euler rotation / scale -> Matrix4
export function compose(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx, order = 'XYZ', out = new THREE.Matrix4()) {
  return out.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, order)), _s.set(sx, sy, sz));
}

// Merges parts [{ geometry, matrix?, color? }] into one flat-shaded, non-indexed geometry.
// `color` is a THREE.Color or a function (cx, cy, cz) => Color evaluated per face centroid,
// which gives crisp low-poly colour regions (ear tips, tail tip...).
export function mergeParts(parts) {
  const withColor = parts.some((part) => part.color);
  const pos = [], nor = [], col = [];
  const white = new THREE.Color(1, 1, 1);
  for (const { geometry, matrix, color } of parts) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    if (matrix) g.applyMatrix4(matrix);
    g.computeVertexNormals();
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i += 3) {
      let faceColor = color || white;
      if (typeof color === 'function') {
        faceColor = color(
          (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3,
          (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3,
          (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3,
        );
      }
      for (let k = i; k < i + 3; k++) {
        pos.push(p.getX(k), p.getY(k), p.getZ(k));
        nor.push(n.getX(k), n.getY(k), n.getZ(k));
        if (withColor) col.push(faceColor.r, faceColor.g, faceColor.b);
      }
    }
    g.dispose();
    geometry.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  if (withColor) out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

// A T-slot aluminium extrusion profile (four slots + centre bore), bevelled, centred, running along Z.
export function tSlotGeometry(length, size = 0.5) {
  const h = size / 2, w = size * 0.28, d = size * 0.18;
  const pts = [
    [-h, -h], [-w / 2, -h], [-w / 2, -h + d], [w / 2, -h + d], [w / 2, -h],
    [h, -h], [h, -w / 2], [h - d, -w / 2], [h - d, w / 2], [h, w / 2],
    [h, h], [w / 2, h], [w / 2, h - d], [-w / 2, h - d], [-w / 2, h],
    [-h, h], [-h, w / 2], [-h + d, w / 2], [-h + d, -w / 2], [-h, -w / 2],
  ];
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts.slice(1)) shape.lineTo(x, y);
  shape.closePath();
  const bore = new THREE.Path();
  bore.absarc(0, 0, size * 0.11, 0, Math.PI * 2, true);
  shape.holes.push(bore);

  const bevel = size * 0.035;
  const depth = Math.max(0.01, length - bevel * 2);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.6, bevelSegments: 1, curveSegments: 6,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

// Injects code into a built-in material's shaders while keeping its lighting, fog and instancing.
// Gives every patched material world-space varyings vWPos / vWNormal.
export function patchMaterial(material, {
  key, uniforms = {}, header = '', beginVertex = '', vertex = '', discard = '', color = '', emissive = '', normals = true,
}) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    const decl = `varying vec3 vWPos;\nvarying vec3 vWNormal;\n${header}\n`;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${decl}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${beginVertex}`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vec4 wp_ = vec4(transformed, 1.0);
        vec3 wn_ = ${normals ? 'normal' : 'vec3(0.0, 1.0, 0.0)'};
        #ifdef USE_INSTANCING
          wp_ = instanceMatrix * wp_;
          wn_ = mat3(instanceMatrix) * wn_;
        #endif
        wp_ = modelMatrix * wp_;
        vWPos = wp_.xyz;
        vWNormal = normalize(mat3(modelMatrix) * wn_);
        ${vertex}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${decl}`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>\n${discard}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${color}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${emissive}`);
  };
  material.customProgramCacheKey = () => key;
  return material;
}
