// The 3D world behind the page: renderer, scene assembly, post-processing, camera rig and the public API.
//   const world = createWorld(canvas);
//   world.setProgress(t, { immediate })  // 0..1 camera-path progress from the scroll (see camera-path.js)
//   world.setSection(i)                  // 0 hero, 1 threshold, 2 still workshop, 3 craft, 4 afterlight, 5 footer
//   world.resize()
//   world.render()                       // one synchronous frame snapped to the targets (stills, tests)
import * as THREE from 'three';
import { palette } from './palette.js';
import { clamp, lerp, smoothDamp, smoothstep } from './utils.js';
import { SHOTS, createCameraPath, createShotState } from './camera-path.js';
import { createAtmosphere } from './atmosphere.js';
import { createTerrain } from './terrain.js';
import { createMoon } from './moon.js';
import { createLab } from './lab.js';
import { createPrinter, PRINTER } from './printer.js';
import { createNature } from './nature.js';
import { createParticles } from './particles.js';
import { createPost } from './post.js';

// Following the scroll: critically damped, so fast scrolling still reads as one slow, precise move.
const FOLLOW_TIME = 0.7;   // seconds to (mostly) catch up
const FOLLOW_SPEED = 0.22; // max path travel per second (the whole walk takes >= ~4.5 s)
const PARALLAX = THREE.MathUtils.degToRad(1.5); // max pointer-driven camera rotation
// The print is scrubbed by the scroll like a video timeline, independent of the camera's softer follow:
// a short exponential smoothing that settles (and snaps) within ~150 ms of the scroll stopping.
const PRINT_RATE = 22;        // 1 - exp(-dt * 22) per frame: frozen ~150 ms after even a fast flick
const PRINT_SNAP = 0.0005;    // closer than this, the shown timeline snaps onto the scroll's
const SPARK_SPEED = 0.1;      // print progress per second that throws sparks at the full rate
const CROSSFADE = 0.7;     // seconds: under reduced motion the camera cuts between shots behind a dissolve
const LAST_SHOT = SHOTS.length - 1;
// The stage: the image slides (a lens shift: the projection is sheared, the camera does not move) so the
// fox lands on the shot's stage point, in the open zone opposite the text column.
const STAGE_ANCHOR = new THREE.Vector3(PRINTER.base.x, PRINTER.base.y + PRINTER.bedTop + PRINTER.foxHeight * 0.55, PRINTER.base.z);
const STAGE_MAX = 0.9; // NDC: never slide further than this

// Scene brightness per section. The text sits in its own column over a scrim, so the scene stays bright
// where the printer is; only the footer's thick haze is held down.
const EXPOSURE = [1, 0.94, 0.9, 0.92, 0.95, 0.66];
const EXPOSURE_PORTRAIT = [1, 0.9, 0.86, 0.88, 0.88, 0.6];

const QUALITY = {
  full: { dpr: 1.75, samples: 4, terrain: [96, 68], trees: 64, grass: 2600, rocks: 18, rain: 640, curls: 26, voxels: 30, embers: 64 },
  small: { dpr: 1.25, samples: 0, terrain: [60, 44], trees: 34, grass: 900, rocks: 10, rain: 240, curls: 12, voxels: 14, embers: 32 },
};

export function createWorld(canvas) {
  const small = matchMedia('(max-width: 768px), (pointer: coarse)').matches;
  const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const quality = small ? QUALITY.small : QUALITY.full;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.dpr));
  renderer.toneMapping = THREE.NoToneMapping; // keeps palette colours exact on screen

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 500);

  const ctx = { scene, palette, quality };
  const atmosphere = createAtmosphere(ctx);
  scene.background = atmosphere.background;
  scene.fog = atmosphere.fog;
  const terrain = createTerrain(ctx);
  const moon = createMoon(ctx);
  const lab = createLab(ctx);
  const printer = createPrinter(ctx);
  const nature = createNature(ctx, terrain);
  const particles = createParticles(ctx);
  // update order matters: the printer publishes the nozzle position the lights and embers follow
  const parts = [terrain, moon, lab, printer, nature, atmosphere, particles];
  for (const part of parts) scene.add(part.group);

  // post: render -> selective bloom -> lens (haze, split tone, exposure, vignette, chroma, grain) -> output
  const post = createPost({ renderer, scene, camera, palette, quality, small });
  const { composer, bloom, lens, crossfade } = post;
  let fade = 0;

  // camera rig: one continuous path of composed shots
  const path = createCameraPath();
  const shot = createShotState();
  const isPortrait = () => camera.aspect < 0.75;
  const exposureFor = (i) => (isPortrait() ? EXPOSURE_PORTRAIT : EXPOSURE)[i] ?? 1;
  const minHFov = THREE.MathUtils.degToRad(36);

  // subtle parallax from a fine pointer only (mouse / trackpad), never on touch
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const pointer = { x: 0, y: 0 };
  const parallax = { x: 0, y: 0 };
  const onPointerMove = (event) => {
    if (!finePointer.matches || event.pointerType === 'touch') return;
    const x = (event.clientX / window.innerWidth) * 2 - 1;
    const y = (event.clientY / window.innerHeight) * 2 - 1;
    const len = Math.max(1, Math.hypot(x, y)); // a circle, so corners stay within the 1.5° too
    pointer.x = x / len;
    pointer.y = y / len;
  };
  const onPointerOut = (event) => { if (!event.relatedTarget) pointer.x = pointer.y = 0; };
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerout', onPointerOut);

  const anchor = new THREE.Vector3();
  const stagePoint = new THREE.Vector2();
  function placeCamera(t) {
    path.sample(t, shot);
    // portrait screens need a wider lens: keep >= 36° horizontally and dolly in during the entrance
    const portraitFov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(minHFov / 2) / camera.aspect));
    camera.fov = Math.max(shot.fov, portraitFov);
    camera.updateProjectionMatrix();
    const dolly = isPortrait() ? 1 - 0.2 * (1 - smoothstep(0.03, 0.12, t)) : 1;
    camera.position.lerpVectors(shot.target, shot.position, dolly);
    camera.lookAt(shot.target);
    camera.rotateY(-parallax.x * PARALLAX);
    camera.rotateX(-parallax.y * PARALLAX);

    // lens shift: slide the image so the fox sits on the stage point (landscape and portrait blend by aspect)
    camera.updateMatrixWorld();
    anchor.copy(STAGE_ANCHOR).applyMatrix4(camera.matrixWorldInverse);
    if (anchor.z < -0.5) {
      anchor.applyMatrix4(camera.projectionMatrix);
      stagePoint.lerpVectors(shot.stagePortrait, shot.stage, smoothstep(0.75, 1.1, camera.aspect));
      const e = camera.projectionMatrix.elements;
      e[8] -= clamp(stagePoint.x - anchor.x, -STAGE_MAX, STAGE_MAX); // NDC x' = x - e8, at any depth
      e[9] -= clamp(stagePoint.y - anchor.y, -STAGE_MAX, STAGE_MAX);
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    }
  }

  const state = {
    time: 0,
    dt: 0,
    progress: 0,
    section: 0,
    print: 0,     // 0..1, how much of the fox is printed
    printing: false,
    park: 0,      // 0..1, head lifting away once the print is done
    heat: 0.45,   // nozzle heat, drives glow and light (a function of print)
    extrude: 0,   // 0..1, how fast the print is moving right now: the strand under the nozzle
    sparkRate: 0, // 0..1, ember emission rate (0 whenever the scroll is still)
    printLights: 1,
    nozzle: new THREE.Vector3(),
    moon: shot.moon,           // per-shot values from the camera path
    camera: camera.position,
    fog: 0.0145,
    haze: 1,
    lights: 1,
    sparks: 1,
    reduced: reducedQuery.matches,
    pixelRatio: renderer.getPixelRatio(),
  };

  const follow = { value: 0, velocity: 0 };
  // a reader of the print (the page's layer readout): told whenever the print moves, never drives it
  let printListener = null;
  let printAnnounced = false;
  // print timeline: the scroll's path position (targetProgress) is its only input. Print, park, nozzle
  // heat and spark rate are all pure functions of it (sampled from the same shot keyframes as the camera),
  // so a given scroll position always shows the same print, however it was reached.
  const printShot = createShotState();
  const printT = { value: 0 };
  let targetProgress = 0;
  let targetExposure = 1;
  let exposure = targetExposure;
  let raf = 0;
  let last = 0;
  let ready = false;

  function step(dt, snap = false) {
    if (state.reduced) {
      // no camera travel: hold the active section's composed shot (shot i sits at t = i / 5);
      // render() snaps to the exact scroll position instead, for stills and tests
      follow.value = snap ? targetProgress : Math.min(state.section, LAST_SHOT) / LAST_SHOT;
      follow.velocity = 0;
      exposure = targetExposure;
      parallax.x = parallax.y = 0;
      fade = Math.max(0, fade - dt / CROSSFADE);
      crossfade.enabled = fade > 0;
      crossfade.uniforms.uMix.value = fade * fade * (3 - 2 * fade);
    } else {
      fade = 0;
      crossfade.enabled = false;
      smoothDamp(follow, targetProgress, FOLLOW_TIME, FOLLOW_SPEED, dt);
      exposure += (targetExposure - exposure) * (1 - Math.exp(-2.5 * dt));
      const k = 1 - Math.exp(-3 * dt);
      parallax.x += ((finePointer.matches ? pointer.x : 0) - parallax.x) * k;
      parallax.y += ((finePointer.matches ? pointer.y : 0) - parallax.y) * k;
    }
    state.progress = follow.value;
    placeCamera(state.progress);

    // the print: scrubbed from the scroll, never from the camera follow or the clock
    if (snap || state.reduced) printT.value = targetProgress;
    else {
      printT.value += (targetProgress - printT.value) * (1 - Math.exp(-PRINT_RATE * dt));
      if (Math.abs(targetProgress - printT.value) < PRINT_SNAP) printT.value = targetProgress;
    }
    path.sample(printT.value, printShot);
    const before = state.print;
    state.print = printShot.print;
    state.park = printShot.park;
    state.printing = state.print > 0.001 && state.print < 0.999;
    state.printLights = printShot.lights;
    // extrusion and sparks only while the print is actually moving, in proportion to its speed
    const speed = dt > 0 && !snap ? Math.abs(state.print - before) / dt : 0;
    state.extrude = state.reduced ? 0 : clamp(speed / SPARK_SPEED);
    state.sparkRate = state.extrude * printShot.sparks;
    // nozzle and bed heat: hot while the fox is unfinished, cooling once it is done (a function of the print)
    state.heat = lerp(lerp(0.45, 1, smoothstep(0, 0.03, state.print)), 0.25, smoothstep(0.97, 1, state.print));
    state.fog = shot.fog;
    state.haze = shot.haze;
    state.lights = shot.lights;
    state.sparks = printShot.sparks;

    for (const part of parts) part.update?.(state);
    if (printListener && (state.print !== before || !printAnnounced)) { printAnnounced = true; printListener(state.print); }
    // post follows the camera's shot (scroll-driven); the grain is the only thing on the clock
    bloom.strength = shot.bloom;
    lens.uniforms.uExposure.value = exposure;
    lens.uniforms.uHaze.value = 0.05 * Math.min(shot.haze, 1.2); // the footer's thick haze is the scene fog's job
    lens.uniforms.uSeed.value = state.reduced ? 0 : (state.time * 24) % 997; // frozen under reduced motion
  }

  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    state.dt = dt;
    if (!state.reduced) state.time += dt;
    step(dt);
    composer.render(dt);

    // reduced motion: render on demand only, until the dissolve and the exposure settle
    const settled = fade === 0 && Math.abs(targetExposure - exposure) < 1e-3;
    if (!document.hidden && (!state.reduced || !settled)) raf = requestAnimationFrame(frame);
  }

  function start() {
    if (raf || !ready || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function resize() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    post.setSize(width, height);
    fade = 0; // the old frame no longer matches the canvas
    camera.aspect = width / height;
    camera.updateProjectionMatrix(); // the lens itself is set per frame from the current shot
    state.pixelRatio = renderer.getPixelRatio();
    targetExposure = exposureFor(state.section);
    start();
  }

  function setProgress(t, { immediate = false } = {}) {
    targetProgress = clamp(Number(t) || 0);
    if (immediate) {
      follow.value = targetProgress;
      follow.velocity = 0;
      printT.value = targetProgress;
    }
    start();
  }

  function setSection(i) {
    if (state.reduced && ready && i !== state.section) {
      // keep what is on screen now (the read buffer still holds the last graded frame) and dissolve from it
      post.holdFrame();
      fade = 1;
    }
    state.section = i;
    targetExposure = exposureFor(i);
    start();
  }

  // draw one frame now, snapped to the current targets (for stills, tests and hidden pages)
  function render() {
    follow.value = targetProgress;
    follow.velocity = 0;
    exposure = targetExposure;
    fade = 0;
    step(0, true);
    composer.render(0);
  }

  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);
  const onMotionPref = (event) => { state.reduced = event.matches; start(); };
  reducedQuery.addEventListener('change', onMotionPref);
  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(canvas);
  canvas.addEventListener('webglcontextlost', (event) => { event.preventDefault(); stop(); ready = false; });

  resize();
  step(0);
  renderer.compileAsync(scene, camera).catch(() => {}).then(() => {
    ready = true;
    composer.render(0);
    canvas.classList.add('is-ready');
    start();
  });

  function dispose() {
    stop();
    resizeObserver.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerout', onPointerOut);
    document.removeEventListener('visibilitychange', onVisibility);
    reducedQuery.removeEventListener('change', onMotionPref);
    post.dispose();
    renderer.dispose();
  }

  const onPrint = (fn) => { printListener = fn; printAnnounced = false; start(); };

  return { setProgress, setSection, resize, render, dispose, onPrint, renderer, scene, camera, state, shot, path, printer, particles, post };
}
