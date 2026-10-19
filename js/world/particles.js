// Small moving matter, all instanced: (a) fine falling rain streaks, (b) drifting filament curls and
// tumbling voxel "leaves" (both ambient, on the clock), (c) ember sparks thrown from the nozzle, born only
// while the print is moving (state.sparkRate, from scroll velocity) and gone ~0.3 s after it stops.
import * as THREE from 'three';
import { mulberry32 } from './utils.js';

export function createParticles({ palette, quality }) {
  const group = new THREE.Group();
  group.name = 'particles';
  const rng = mulberry32(41);
  const uTime = { value: 0 };

  // (a) rain: one line segment per drop, positions computed in the vertex shader
  const drops = quality.rain;
  const rainGeo = new THREE.BufferGeometry();
  const seeds = new Float32Array(drops * 2 * 4);
  const ends = new Float32Array(drops * 2);
  for (let i = 0; i < drops; i++) {
    const s = [rng(), rng(), rng(), 9 + rng() * 6];
    for (let k = 0; k < 2; k++) {
      seeds.set(s, (i * 2 + k) * 4);
      ends[i * 2 + k] = k;
    }
  }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(drops * 2 * 3), 3));
  rainGeo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  rainGeo.setAttribute('aEnd', new THREE.BufferAttribute(ends, 1));
  const rain = new THREE.LineSegments(rainGeo, new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime,
      uMin: { value: new THREE.Vector3(-32, 0, -48) },
      uSize: { value: new THREE.Vector3(64, 30, 78) },
      uLen: { value: 0.7 },
      uColor: { value: palette.cold },
      uOpacity: { value: 0.3 },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      attribute float aEnd;
      uniform float uTime, uLen;
      uniform vec3 uMin, uSize;
      varying float vA;
      void main() {
        vec3 p = uMin + vec3(aSeed.x * uSize.x, 0.0, aSeed.y * uSize.z);
        p.y = uMin.y + mod(aSeed.z * uSize.y - uTime * aSeed.w, uSize.y);
        p += vec3(0.06, 1.0, 0.02) * uLen * aEnd;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float d = -mv.z;
        vA = (1.0 - aEnd) * smoothstep(70.0, 6.0, d) * smoothstep(1.5, 4.0, d);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vA;
      void main() { gl_FragColor = vec4(uColor, vA * uOpacity); }`,
  }));
  rain.frustumCulled = false;

  // (b) filament curls and voxel leaves drifting on a slow wind around the gate and stairs
  const region = { min: new THREE.Vector3(-16, 2.5, -16), size: new THREE.Vector3(32, 12, 34) };
  const drifters = (geometry, count, colors) => {
    const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial(), count);
    mesh.frustumCulled = false;
    const items = Array.from({ length: count }, (_, i) => {
      mesh.setColorAt(i, colors[Math.floor(rng() * colors.length)]);
      return {
        p: new THREE.Vector3(region.min.x + rng() * region.size.x, region.min.y + rng() * region.size.y, region.min.z + rng() * region.size.z),
        axis: new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize(),
        angle: rng() * Math.PI * 2,
        spin: 0.4 + rng() * 1.4,
        phase: rng() * 100,
        scale: 0.7 + rng() * 0.8,
      };
    });
    return { mesh, items };
  };
  const curls = drifters(new THREE.TorusGeometry(0.16, 0.014, 3, 12, Math.PI * 1.5), quality.curls, [
    palette.vermilion, palette.vermilion, palette.amber,
  ]);
  const voxels = drifters(new THREE.BoxGeometry(0.1, 0.1, 0.1), quality.voxels, [
    palette.vermilion, palette.vermilion.clone().multiplyScalar(0.7), palette.bone.clone().multiplyScalar(0.7),
  ]);
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const mat = new THREE.Matrix4();
  function drift({ mesh, items }, time, dt) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      it.p.x += (0.35 + Math.sin(time * 0.7 + it.phase) * 0.25) * dt;
      it.p.y += (-0.16 + Math.cos(time * 0.9 + it.phase) * 0.12) * dt;
      it.p.z += Math.sin(time * 0.5 + it.phase * 1.3) * 0.15 * dt;
      // wrap inside the region
      for (const axis of ['x', 'y', 'z']) {
        const lo = region.min[axis], span = region.size[axis];
        if (it.p[axis] < lo) it.p[axis] += span;
        else if (it.p[axis] > lo + span) it.p[axis] -= span;
      }
      it.angle += it.spin * dt;
      q.setFromAxisAngle(it.axis, it.angle);
      mesh.setMatrixAt(i, mat.compose(pos.copy(it.p), q, scl.setScalar(it.scale)));
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  // (c) embers: a small pool simulated on the CPU. Nothing is emitted on the clock: the spawn rate is
  // state.sparkRate (0..1, proportional to how fast the print is being scrubbed), so a still page has none.
  const sparks = quality.embers;
  const SPARK_RATE = sparks * 2.2; // per second at full rate
  const IDLE_AGEING = 2;           // with no emission, the rest burn out within ~0.3 s (lives are <= 0.6 s)
  const emberGeo = new THREE.BufferGeometry();
  const ePos = new Float32Array(sparks * 3);
  const eLife = new Float32Array(sparks).fill(1); // 0 just born .. 1 dead
  const eVel = new Float32Array(sparks * 3);
  const eSpan = new Float32Array(sparks);
  const eSize = new Float32Array(sparks);
  for (let i = 0; i < sparks; i++) eSize[i] = 0.6 + rng() * 0.8;
  emberGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3).setUsage(THREE.DynamicDrawUsage));
  emberGeo.setAttribute('aLife', new THREE.BufferAttribute(eLife, 1).setUsage(THREE.DynamicDrawUsage));
  emberGeo.setAttribute('aSize', new THREE.BufferAttribute(eSize, 1));
  const emberMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uIntensity: { value: 0.9 },
      uSize: { value: 30 },
      uPixelRatio: { value: 1 },
      uHot: { value: palette.amber },
      uCool: { value: palette.vermilion },
    },
    vertexShader: /* glsl */ `
      attribute float aLife, aSize;
      uniform float uSize, uPixelRatio;
      varying float vLife;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aLife >= 1.0 ? 0.0 : uSize * aSize * uPixelRatio * (1.0 - aLife * 0.7) / max(-mv.z, 0.5);
        vLife = aLife;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uIntensity;
      uniform vec3 uHot, uCool;
      varying float vLife;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5 || vLife >= 1.0) discard;
        float a = (1.0 - smoothstep(0.0, 0.5, d)) * (1.0 - vLife) * uIntensity;
        gl_FragColor = vec4(mix(uHot, uCool, vLife), a);
      }`,
  });
  let spawnDebt = 0;
  let nextSlot = 0;
  let live = 0;
  function emit(origin) {
    const i = nextSlot;
    nextSlot = (nextSlot + 1) % sparks;
    const a = rng() * Math.PI * 2, out = 0.4 + rng() * 1.4;
    ePos.set([origin.x + (rng() - 0.5) * 0.06, origin.y, origin.z + (rng() - 0.5) * 0.06], i * 3);
    eVel.set([Math.cos(a) * out, 0.6 + rng() * 1.8, Math.sin(a) * out], i * 3);
    eSpan[i] = 0.35 + rng() * 0.25;
    eLife[i] = 0;
  }
  function updateEmbers(state) {
    const dt = state.dt;
    const rate = state.reduced ? 0 : Math.max(0, state.sparkRate ?? 0);
    if (rate > 0 && dt > 0) {
      spawnDebt += rate * SPARK_RATE * dt;
      for (; spawnDebt >= 1; spawnDebt -= 1) emit(state.nozzle);
    } else {
      spawnDebt = 0;
    }
    if (dt <= 0) return;
    const ageing = rate > 0 ? 1 : IDLE_AGEING;
    live = 0;
    for (let i = 0; i < sparks; i++) {
      if (eLife[i] >= 1) continue;
      eLife[i] = Math.min(1, eLife[i] + (dt * ageing) / eSpan[i]);
      const k = i * 3;
      eVel[k + 1] += 1.6 * dt; // hot air carries them up
      const drag = Math.exp(-2.2 * dt);
      eVel[k] *= drag; eVel[k + 2] *= drag;
      ePos[k] += eVel[k] * dt; ePos[k + 1] += eVel[k + 1] * dt; ePos[k + 2] += eVel[k + 2] * dt;
      if (eLife[i] < 1) live++;
    }
    emberGeo.attributes.position.needsUpdate = true;
    emberGeo.attributes.aLife.needsUpdate = true;
  }
  const embers = new THREE.Points(emberGeo, emberMat);
  embers.frustumCulled = false;

  group.add(rain, curls.mesh, voxels.mesh, embers);
  // place the drifters once so a reduced-motion first frame shows them
  drift(curls, 0, 0);
  drift(voxels, 0, 0);

  return {
    group,
    get liveSparks() { return live; },
    update(state) {
      uTime.value = state.time;
      rain.material.uniforms.uOpacity.value = 0.3 * Math.min(1, 0.4 + 0.6 * state.lights); // quieter when the lights drop
      if (!state.reduced) {
        drift(curls, state.time, state.dt);
        drift(voxels, state.time, state.dt);
      }
      updateEmbers(state);
      embers.visible = live > 0;
      emberMat.uniforms.uPixelRatio.value = state.pixelRatio;
    },
  };
}
