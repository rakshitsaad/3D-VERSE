// Cinematic stills for the editorial cards (dev-only), rendered from the live world's own modules.
import * as THREE from 'three';
import { palette } from '../../js/world/palette.js';
import { createAtmosphere } from '../../js/world/atmosphere.js';
import { createTerrain } from '../../js/world/terrain.js';
import { createMoon } from '../../js/world/moon.js';
import { createLab } from '../../js/world/lab.js';
import { createPrinter, PRINTER } from '../../js/world/printer.js';
import { createNature } from '../../js/world/nature.js';
import { createParticles } from '../../js/world/particles.js';

const QUALITY = { dpr: 1, samples: 0, terrain: [120, 86], trees: 80, grass: 3600, rocks: 22, rain: 1800, curls: 70, voxels: 80, embers: 220 };
const still = (width, height, build) => ({ kind: 'still', width, height, build });

// Assemble the world, place the camera, then run one update so every module (nozzle, lights, moon,
// particles) agrees with the chosen moment.
function world({ aspect, scale }, shot) {
  const scene = new THREE.Scene();
  const ctx = { scene, palette, quality: QUALITY };
  const atmosphere = createAtmosphere(ctx);
  scene.background = atmosphere.background;
  scene.fog = atmosphere.fog;
  const terrain = createTerrain(ctx);
  const parts = [terrain, createMoon(ctx), createLab(ctx), createPrinter(ctx), createNature(ctx, terrain), atmosphere, createParticles(ctx)];
  for (const part of parts) scene.add(part.group);

  const camera = new THREE.PerspectiveCamera(shot.fov, aspect, 0.05, 500);
  const state = {
    time: shot.time ?? 14.2, dt: 1 / 60, progress: 0, section: 0,
    print: shot.print, park: shot.park ?? 0, printing: shot.print > 0 && shot.print < 1, heat: shot.heat ?? 1,
    nozzle: new THREE.Vector3(), moon: new THREE.Vector3(...(shot.moon ?? [0, 24, -105])), camera: camera.position,
    fog: shot.fog ?? 0.0145, haze: shot.haze ?? 1, lights: shot.lights ?? 1, sparks: shot.sparks ?? 1,
    reduced: false, pixelRatio: scale,
  };
  // the printer runs first and publishes the nozzle; a camera relative to it can then be placed
  parts[3].update(state);
  const place = typeof shot.camera === 'function' ? shot.camera(state.nozzle) : shot.camera;
  camera.position.copy(place.position);
  camera.lookAt(place.target);
  if (place.moonBehind) {
    // put the moon on the line from the camera through the subject, far away
    const dir = place.target.clone().sub(place.position).normalize();
    state.moon.copy(place.position).addScaledVector(dir, place.moonBehind).add(new THREE.Vector3(0, place.moonLift ?? 0, 0));
  }
  if (shot.layers) parts[3].foxUniforms.uLayers.value = shot.layers; // close-ups want wider, cleaner layer bands
  for (const part of parts) part.update?.(state);
  // a still is a moment mid-scroll: the print is moving, so the strand glows and sparks fly. Embers are
  // only born while the print moves, so run the spark pool for a moment to fill the air.
  if (state.printing) {
    state.extrude = 1;
    state.sparkRate = shot.sparks ?? 1;
    parts[3].update(state);
    for (let i = 0; i < 40; i++) parts[6].update(state);
  }
  // the world's nozzle light sits up inside the head; a close shot moves it out in front of the tip
  if (shot.nozzleLight) {
    scene.traverse((o) => {
      if (o.isPointLight && o.position.distanceTo(state.nozzle) < 1.6) {
        o.position.copy(state.nozzle).add(new THREE.Vector3(...shot.nozzleLight.offset));
        o.intensity = shot.nozzleLight.intensity;
      }
    });
  }
  // the live world gives the fox a faint emissive floor so it reads in the dark; lit stills don't need it
  if (shot.foxEmissive !== undefined) {
    scene.traverse((o) => {
      if (o.material?.customProgramCacheKey?.() === 'fox-print') o.material.emissive.copy(palette.bone).multiplyScalar(shot.foxEmissive);
    });
  }
  shot.extra?.(scene, state);
  return { scene, camera, bloom: shot.bloom, bloomThreshold: shot.bloomThreshold, vignette: shot.vignette ?? 0.5, exposure: shot.exposure ?? 1, grain: 0.05, tint: 0.3 };
}

const v = (x, y, z) => new THREE.Vector3(x, y, z);

export const STILLS = {
  // stair slabs leading up to the gantry under the moon (square: crops to every card shape)
  approach: still(1600, 1600, (opts) => world(opts, {
    fov: 34, print: 0.42, bloom: 0.42, lights: 1.05, haze: 1.1, fog: 0.0135, moon: [0, 27, -105],
    camera: { position: v(0.35, 1.5, 27.5), target: v(0, 8.4, -20) },
  })),

  // macro of the glowing hot-end laying a layer
  // (a lower eye line than before, so the heat block shows its sides rather than a lit top face)
  nozzles: still(1600, 1000, (opts) => world(opts, {
    fov: 30, print: 0.5, bloom: 0.42, lights: 1.1, sparks: 2.2, haze: 0.7, fog: 0.011, vignette: 0.6, exposure: 0.9,
    foxEmissive: 0.03, layers: 64, nozzleLight: { offset: [0.55, 0.05, 1.15], intensity: 2.0 },
    camera: (n) => ({ position: v(n.x + 1.3, n.y + 0.55, n.z + 2.2), target: v(n.x - 0.1, n.y - 0.35, n.z - 0.1) }),
  })),

  // the finished fox on the bed, rim-lit, the moon right behind it
  cooldown: still(1600, 1000, (opts) => world(opts, {
    fov: 24, print: 1, park: 1, heat: 0.25, bloom: 0.3, lights: 0.55, haze: 0.9, fog: 0.012, sparks: 0.2, vignette: 0.55, exposure: 0.9, foxEmissive: 0.02,
    camera: { position: v(-1.9, 4.9, -1.2), target: v(0, PRINTER.base.y + PRINTER.bedTop + 1.25, -6.9), moonBehind: 110, moonLift: 9 },
    extra: (scene) => {
      const rim = new THREE.DirectionalLight(palette.cold, 4.2);
      rim.position.set(2.5, 9, -14);
      rim.target.position.set(0, 5, -6.9);
      const warm = new THREE.PointLight(palette.amber, 1.1, 6, 1.5);
      warm.position.set(-1.6, 4.9, -4.6);
      scene.add(rim, rim.target, warm);
    },
  })),

  // the hall's lit shoji facade, seen along its length
  'lab-panels': still(1600, 686, (opts) => world(opts, {
    fov: 38, print: 0.85, bloom: 0.36, lights: 1.1, haze: 1.2, fog: 0.012, moon: [-30, 26, -100],
    camera: { position: v(6.8, 4.5, -17.2), target: v(-10, 6.3, -20.9) },
  })),

  // the play card: the very first layer touching the bed
  'first-layer': still(1600, 1200, (opts) => world(opts, {
    fov: 34, print: 0.035, bloom: 0.5, lights: 1.0, sparks: 1.6, haze: 0.8, fog: 0.012, vignette: 0.55, exposure: 0.95,
    camera: (n) => ({ position: v(n.x + 3.1, n.y + 1.35, n.z + 3.9), target: v(n.x - 0.25, n.y + 0.55, n.z - 0.3) }),
  })),
};
