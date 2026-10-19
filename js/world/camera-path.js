// One continuous camera path through the night walk, built from one composed "shot" per page section.
// Shot i is fully composed when section i sits in the middle of the viewport (the hero at the very top,
// the footer at the very bottom); the hand-off between two shots happens where one section gives way to
// the next. Positions run through one CatmullRomCurve3, look-at targets through a second one, and every
// other value (lens, fog, moon, bloom, print...) is interpolated with the same eased fraction, so nothing
// ever jumps.
import * as THREE from 'three';
import { clamp, lerp, smoothstep } from './utils.js';

// The fox is printed from the bed up; nozzle sits at y = 4.43 + 2.4 * print, x/z near (0, -6.9).
export const SHOTS = [
  {
    name: 'hero', // wide and low: the gantry framed like a gate, the moon behind it
    position: [0, 3.0, 31], target: [0, 4.2, -20], fov: 40,
    fog: 0.0145, moon: [0, 24, -105], bloom: 0.45, print: 0.15, park: 0, haze: 1, lights: 1, sparks: 0.6,
  },
  {
    name: 'threshold', // a slow push up the printed slabs towards the gate
    position: [1.2, 2.7, 15.5], target: [0, 6.6, -6.9], fov: 42,
    fog: 0.015, moon: [2, 26, -105], bloom: 0.45, print: 0.35, park: 0, haze: 1, lights: 1, sparks: 0.8,
  },
  {
    name: 'gardens', // drifting sideways through filament grass and pines, the hall glowing beyond
    position: [-7.6, 2.8, 5.0], target: [2.5, 5.6, -22], fov: 44,
    fog: 0.017, moon: [14, 24, -105], bloom: 0.5, print: 0.55, park: 0, haze: 1.3, lights: 1.1, sparks: 0.7,
  },
  {
    name: 'craft', // a close orbit round the print head: nozzle glow and sparks
    position: [3.7, 7.5, -2.4], target: [0, 6.3, -6.9], fov: 40,
    fog: 0.013, moon: [-6, 27, -100], bloom: 0.55, print: 0.85, park: 0, haze: 0.8, lights: 1.1, sparks: 1.5,
    via: [{ position: [-2.6, 8.2, -2.2], target: [0, 6.6, -6.9] }], // the orbit continues past the head's front
  },
  {
    name: 'afterlight', // pull back: the whole gate and the finished fox against the moon
    position: [0, 6.0, 19], target: [0, 9.0, -6.9], fov: 44,
    fog: 0.012, moon: [0, 25, -82], bloom: 0.42, print: 1, park: 1, haze: 0.9, lights: 0.85, sparks: 0.3,
  },
  {
    name: 'footer', // high and quiet, looking down through thick haze, lights low
    position: [0, 34, 9], target: [0, 2, -10], fov: 38,
    fog: 0.022, moon: [0, 25, -82], bloom: 0.35, print: 1, park: 1, haze: 2.0, lights: 0.35, sparks: 0.1,
  },
];

// 0 = constant travel between shots, 1 = full ease-in-out. In between, the camera settles into each
// composed shot and does most of its travelling across the section boundaries, with no velocity jump.
const SETTLE = 0.7;
const ease = (f) => f + (smoothstep(0, 1, f) - f) * SETTLE;

const vec = (a) => new THREE.Vector3(a[0], a[1], a[2]);

export function createCameraPath() {
  // flatten shots and their via points into curve control points, remembering where each shot sits
  const positions = [];
  const targets = [];
  const shotIndex = [];
  for (const shot of SHOTS) {
    shotIndex.push(positions.length);
    positions.push(vec(shot.position));
    targets.push(vec(shot.target));
    for (const via of shot.via || []) {
      positions.push(vec(via.position));
      targets.push(vec(via.target));
    }
  }
  const posCurve = new THREE.CatmullRomCurve3(positions, false, 'centripetal');
  const lookCurve = new THREE.CatmullRomCurve3(targets, false, 'centripetal');
  const moons = SHOTS.map((shot) => vec(shot.moon));
  const last = SHOTS.length - 1;

  // t: 0..1 path progress from the scroll (shot i at t = i / 5). Writes into `out`.
  function sample(t, out) {
    const p = clamp(t) * last;
    const i = Math.min(Math.floor(p), last - 1);
    const f = ease(p - i);
    const u = (shotIndex[i] + f * (shotIndex[i + 1] - shotIndex[i])) / (positions.length - 1);
    posCurve.getPoint(u, out.position);
    lookCurve.getPoint(u, out.target);

    const a = SHOTS[i], b = SHOTS[i + 1];
    out.shot = f < 0.5 ? i : i + 1;
    out.fov = lerp(a.fov, b.fov, f);
    out.fog = lerp(a.fog, b.fog, f);
    out.bloom = lerp(a.bloom, b.bloom, f);
    out.haze = lerp(a.haze, b.haze, f);
    out.lights = lerp(a.lights, b.lights, f);
    out.sparks = lerp(a.sparks, b.sparks, f);
    out.moon.lerpVectors(moons[i], moons[i + 1], f);
    // the print finishes a little before the next shot; the head lifts away only at the very end
    out.print = lerp(a.print, b.print, smoothstep(0, 0.85, f));
    out.park = lerp(a.park, b.park, smoothstep(0.7, 1, f));
    return out;
  }

  return { sample, posCurve, lookCurve };
}

export function createShotState() {
  return {
    position: new THREE.Vector3(), target: new THREE.Vector3(), moon: new THREE.Vector3(),
    shot: 0, fov: 40, fog: 0, bloom: 0, haze: 1, lights: 1, sparks: 1, print: 0, park: 0,
  };
}

// Horizontal distance from (x, z) to the camera path: scenery uses it to keep out of the lens.
let pathSamples = null;
export function pathClearance(x, z) {
  if (!pathSamples) {
    const { sample } = createCameraPath();
    const s = createShotState();
    pathSamples = Array.from({ length: 400 }, (_, k) => {
      sample(k / 399, s);
      return [s.position.x, s.position.z];
    });
  }
  let min = Infinity;
  for (const [px, pz] of pathSamples) min = Math.min(min, Math.hypot(x - px, z - pz));
  return min;
}
