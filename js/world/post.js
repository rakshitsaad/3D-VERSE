// Post-processing: render -> selective bloom -> lens -> (reduced-motion dissolve) -> sRGB output.
//   bloom   UnrealBloomPass with its bright-pass swapped for a "glow key": hot cores pass by luminance
//           (nozzle, sparks, the fresh layer); strongly saturated warm light passes by value at a lower
//           weight, gated by depth: the moon (no depth, weight uMoon) and the hall's paper panels and fascia
//           (beyond ~20 units). Lit cream, steel, the night and the drifting curls stay out.
//   lens    one pass: depth haze, warm/cold split tone, exposure towards ink, vignette and a darker floor,
//           slight chromatic falloff at the edges, film grain (display space).
// Colour rules from CLAUDE.md hold: the moon and the sky write no depth, so the haze skips them; the split
// tone only moves neutral tones, so saturated orange keeps its hue; nothing here reads the print state.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CopyShader } from 'three/addons/shaders/CopyShader.js';

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const GLOW_KEY = /* glsl */ `
  #include <packing>
  uniform sampler2D tDiffuse, tDepth;
  uniform float uCore, uWarm, uWarmFrom, uMoon, uNear, uFar;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(tDiffuse, vUv).rgb;
    float depth = texture2D(tDepth, vUv).x;
    float dist = -perspectiveDepthToViewZ(depth, uNear, uFar);
    // where warm light may glow: the moon (no depth, its own weight) or the hall and beyond; never the
    // filament curls and voxel leaves drifting past the lens
    float sky = step(0.99999, depth);
    float where = mix(smoothstep(18.0, 24.0, dist) * uWarm, uMoon, sky);
    float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float mx = max(c.r, max(c.g, c.b));
    float sat = mx > 0.0 ? (mx - min(c.r, min(c.g, c.b))) / mx : 0.0;
    // hot cores: only true emissive values get here
    float core = smoothstep(uCore, uCore + 0.12, lum);
    // warm light: strongly saturated, red-led, bright in value (moon disc, paper panels, fascia, sparks)
    float warm = smoothstep(0.87, 0.93, sat) * step(mx - 0.0001, c.r) * smoothstep(uWarmFrom, uWarmFrom + 0.3, mx) * where;
    gl_FragColor = vec4(c * max(core, warm), 1.0);
  }`;

const LensShader = {
  defines: { CHROMA: 1 },
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    uNear: { value: 0.1 },
    uFar: { value: 500 },
    uExposure: { value: 1 },
    uVignette: { value: 0.5 },
    uFloor: { value: 0.55 },
    uAspect: { value: 1 },
    uInk: { value: new THREE.Color() },
    uHaze: { value: 0 },
    uHazeColor: { value: new THREE.Color() },
    uSplit: { value: 0.12 },
    uShadowTone: { value: new THREE.Color() },
    uLightTone: { value: new THREE.Color() },
    uChroma: { value: 0.0022 },
    uGrain: { value: 0.02 },
    uSeed: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: VERTEX,
  fragmentShader: /* glsl */ `
    #include <packing>
    uniform sampler2D tDiffuse, tDepth;
    uniform float uNear, uFar, uExposure, uVignette, uFloor, uAspect, uHaze, uSplit, uChroma, uGrain, uSeed;
    uniform vec3 uInk, uHazeColor, uShadowTone, uLightTone;
    uniform vec2 uResolution;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

    void main() {
      vec2 q = vUv - 0.5;
      vec2 qa = vec2(q.x * uAspect, q.y);
      float r2 = dot(qa, qa);

      vec4 c = texture2D(tDiffuse, vUv);
      #if CHROMA
        // slight chromatic falloff: red and blue drift apart towards the corners only
        vec2 d = q * uChroma * smoothstep(0.12, 0.9, r2);
        c.r = texture2D(tDiffuse, vUv + d).r;
        c.b = texture2D(tDiffuse, vUv - d).b;
      #endif

      // depth haze: aerial perspective in the middle distance, heavier low in the frame; skips the
      // moon and the sky (they write no depth, so they sit at the far plane)
      float depth = texture2D(tDepth, vUv).x;
      float dist = -perspectiveDepthToViewZ(depth, uNear, uFar);
      float haze = uHaze * smoothstep(10.0, 70.0, dist) * (1.0 - step(0.99999, depth));
      haze *= mix(1.0, 0.55, smoothstep(0.25, 0.85, vUv.y));
      c.rgb = mix(c.rgb, uHazeColor, haze);

      // split tone: blue-charcoal shadows, amber highlights, luminance kept; only for neutral tones,
      // so the vermilion moon and the orange accents keep their exact hue
      float lum = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      float mx = max(c.r, max(c.g, c.b));
      float sat = mx > 0.0 ? (mx - min(c.r, min(c.g, c.b))) / mx : 0.0;
      vec3 tone = mix(uShadowTone, uLightTone, smoothstep(0.02, 0.45, lum));
      c.rgb = mix(c.rgb, lum * tone, uSplit * (1.0 - smoothstep(0.3, 0.7, sat)));

      // exposure towards ink (never below it), soft vignette, a darker floor under the type
      float v = 1.0 - smoothstep(0.3, 1.05, length(qa)) * uVignette;
      v *= 1.0 - uFloor * smoothstep(0.45, 0.0, vUv.y);
      c.rgb = mix(uInk, c.rgb, clamp(uExposure * v, 0.0, 1.0));

      // film grain in display space (so it is even across the tones), ~2%
      vec3 s = pow(max(c.rgb, 0.0), vec3(1.0 / 2.2));
      float g = hash(floor(vUv * uResolution) + uSeed * 91.7) - 0.5;
      s += g * uGrain * (1.0 - 0.5 * s);
      c.rgb = pow(max(s, 0.0), vec3(2.2));
      gl_FragColor = c;
    }`,
};

// Reduced motion: the last frame of the previous shot, dissolving into the new one.
const CrossfadeShader = {
  uniforms: { tDiffuse: { value: null }, tPrev: { value: null }, uMix: { value: 0 } },
  vertexShader: VERTEX,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse, tPrev;
    uniform float uMix;
    varying vec2 vUv;
    void main() { gl_FragColor = mix(texture2D(tDiffuse, vUv), texture2D(tPrev, vUv), uMix); }`,
};

// Luminance-normalised tone (luminance 1), so the split tone shifts hue without shifting brightness.
function tone(color) {
  const c = color.clone();
  return c.multiplyScalar(1 / (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b));
}

export function createPost({ renderer, scene, camera, palette, quality, small }) {
  // the depth texture feeds the lens pass's haze (each composer buffer gets its own copy)
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: quality.samples,
    depthTexture: new THREE.DepthTexture(1, 1),
  });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.18, 0);
  bloom.materialHighPassFilter.fragmentShader = GLOW_KEY;
  bloom.materialHighPassFilter.uniforms = bloom.highPassUniforms = {
    tDiffuse: { value: null },
    uCore: { value: 0.92 },
    tDepth: { value: null },
    uWarm: { value: 0.25 },
    uWarmFrom: { value: 0.28 },
    uMoon: { value: 0.03 },
    uNear: { value: camera.near },
    uFar: { value: camera.far },
    luminosityThreshold: { value: 0 }, // written by UnrealBloomPass every frame; unused by the glow key
  };
  bloom.materialHighPassFilter.needsUpdate = true;
  const bloomRender = bloom.render.bind(bloom);
  bloom.render = (r, writeBuffer, readBuffer, dt, mask) => {
    bloom.highPassUniforms.tDepth.value = readBuffer.depthTexture;
    bloomRender(r, writeBuffer, readBuffer, dt, mask);
  };
  if (small) {
    // low-end: bloom at half its usual resolution (a quarter of the canvas)
    const setSize = bloom.setSize.bind(bloom);
    bloom.setSize = (w, h) => setSize(Math.max(2, Math.round(w / 2)), Math.max(2, Math.round(h / 2)));
  }
  composer.addPass(bloom);

  const lens = new ShaderPass(LensShader);
  lens.material.defines.CHROMA = small ? 0 : 1; // low-end: no chromatic falloff (two fewer taps per pixel)
  const u = lens.uniforms;
  u.uInk.value.copy(palette.ink);
  u.uNear.value = camera.near;
  u.uFar.value = camera.far;
  u.uHazeColor.value.copy(palette.char).lerp(palette.cold, 0.14);
  u.uShadowTone.value.copy(tone(palette.char.clone().lerp(palette.cold, 0.35)));
  u.uLightTone.value.copy(tone(palette.amber.clone().lerp(palette.bone, 0.55)));
  const lensRender = lens.render.bind(lens);
  lens.render = (r, writeBuffer, readBuffer, dt, mask) => {
    u.tDepth.value = readBuffer.depthTexture; // the buffer the scene was just rendered into
    lensRender(r, writeBuffer, readBuffer, dt, mask);
  };
  composer.addPass(lens);

  const crossfade = new ShaderPass(CrossfadeShader);
  crossfade.enabled = false;
  composer.addPass(crossfade);
  composer.addPass(new OutputPass());

  // holds the frame being dissolved away (the composer's read buffer is the graded, pre-output image)
  const prevFrame = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  crossfade.uniforms.tPrev.value = prevFrame.texture;
  const copy = new ShaderPass(CopyShader);

  return {
    composer,
    bloom,
    lens,
    crossfade,
    setSize(width, height) {
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(width, height);
      prevFrame.setSize(composer.readBuffer.width, composer.readBuffer.height);
      u.uAspect.value = width / height;
      u.uResolution.value.set(composer.readBuffer.width, composer.readBuffer.height);
    },
    // keep what is on screen now (the read buffer holds the last graded frame) for the dissolve
    holdFrame() { copy.render(renderer, prevFrame, composer.readBuffer); },
    dispose() {
      composer.dispose();
      prevFrame.dispose();
      target.depthTexture?.dispose();
    },
  };
}
