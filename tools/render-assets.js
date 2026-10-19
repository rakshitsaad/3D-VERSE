// Offline renderer harness (dev-only). Exposes:
//   window.listAssets()                 -> [{ name, kind, width, height }]
//   window.renderAsset(name, { scale }) -> { dataURL, width, height }  (PNG, rendered at width*scale)
// Cutouts render on a transparent background with straight (un-premultiplied) alpha; stills are opaque.
// Every frame goes through the same grade: palette drift for neutral tones, optional vignette, film grain.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { palette } from '../js/world/palette.js';
import { CUTOUTS } from './subjects/cutouts.js';
import { STILLS } from './subjects/stills.js';

const ASSETS = { ...CUTOUTS, ...STILLS };

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uAlpha: { value: 0 },
    uExposure: { value: 1 },
    uTint: { value: 0.35 },
    uVignette: { value: 0 },
    uGrain: { value: 0.05 },
    uSeed: { value: 1 },
    uInk: { value: palette.ink },
    uChar: { value: palette.char },
    uSteel: { value: palette.steel },
    uBone: { value: palette.bone },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uRes;
    uniform float uAlpha, uExposure, uTint, uVignette, uGrain, uSeed;
    uniform vec3 uInk, uChar, uSteel, uBone;
    varying vec2 vUv;

    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33 + uSeed);
      return fract((p3.x + p3.y) * p3.z);
    }
    vec3 toSRGB(vec3 c) {
      return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
    }

    void main() {
      vec4 src = texture2D(tDiffuse, vUv);
      float a = uAlpha > 0.5 ? clamp(src.a, 0.0, 1.0) : 1.0;
      vec3 c = src.rgb;
      if (uAlpha > 0.5) c = a > 1e-4 ? c / a : vec3(0.0); // the render target holds premultiplied colour
      c *= uExposure;

      // palette grade: neutral tones drift towards ink / char / steel / bone, saturated orange keeps its hue
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      vec3 ramp = l < 0.008 ? mix(uInk, uChar, l / 0.008)
                : l < 0.03 ? mix(uChar, uSteel, (l - 0.008) / 0.022)
                : mix(uSteel, uBone, clamp((l - 0.03) / 0.77, 0.0, 1.0));
      float mx = max(c.r, max(c.g, c.b));
      float sat = mx > 1e-4 ? (mx - min(c.r, min(c.g, c.b))) / mx : 0.0;
      c = mix(c, ramp, uTint * (1.0 - sat));

      vec2 q = vUv - 0.5;
      q.x *= uRes.x / uRes.y;
      c *= 1.0 - uVignette * smoothstep(0.35, 1.05, length(q));

      // film grain in display space, a little stronger in the mid-tones
      vec3 s = toSRGB(clamp(c, 0.0, 1.0));
      float n = hash(gl_FragCoord.xy) + hash(gl_FragCoord.xy + 17.17) - 1.0;
      float lum = dot(s, vec3(0.299, 0.587, 0.114));
      s += n * uGrain * (0.55 + 1.6 * lum * (1.0 - lum));
      gl_FragColor = vec4(clamp(s, 0.0, 1.0), a);
    }`,
};

const log = (msg) => { document.getElementById('log').textContent += `\n${msg}`; };

window.listAssets = () => Object.entries(ASSETS).map(([name, a]) => ({ name, kind: a.kind, width: a.width, height: a.height }));

window.renderAsset = async (name, { scale = 2, seed = 7 } = {}) => {
  const asset = ASSETS[name];
  if (!asset) throw new Error(`unknown asset ${name}`);
  const width = asset.width * scale;
  const height = asset.height * scale;
  const alpha = asset.kind === 'cutout';

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha, premultipliedAlpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.localClippingEnabled = true;
  renderer.setClearColor(0x000000, alpha ? 0 : 1);

  const built = await asset.build({ width, height, aspect: width / height, scale, seed });
  const { scene, camera } = built;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  // supersampling (scale) does the anti-aliasing; half-float keeps the dark gradients clean
  const target = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType });
  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(1);
  composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, camera));
  if (!alpha && built.bloom) composer.addPass(new UnrealBloomPass(new THREE.Vector2(width, height), built.bloom, 0.45, built.bloomThreshold ?? 0.82));
  const grade = new ShaderPass(GradeShader);
  grade.uniforms.uRes.value.set(width, height);
  grade.uniforms.uAlpha.value = alpha ? 1 : 0;
  grade.uniforms.uExposure.value = built.exposure ?? 1;
  grade.uniforms.uTint.value = built.tint ?? 0.35;
  grade.uniforms.uVignette.value = built.vignette ?? (alpha ? 0 : 0.45);
  grade.uniforms.uGrain.value = (built.grain ?? (alpha ? 0.03 : 0.045)) * scale; // supersampling averages grain away; compensate
  grade.uniforms.uSeed.value = seed;
  composer.addPass(grade);

  const t0 = performance.now();
  composer.render();
  const dataURL = canvas.toDataURL('image/png');
  log(`${name}: ${width}x${height} in ${Math.round(performance.now() - t0)} ms`);

  composer.dispose();
  target.dispose();
  scene.traverse((o) => { o.geometry?.dispose(); [].concat(o.material || []).forEach((m) => m.dispose()); });
  renderer.dispose();
  renderer.forceContextLoss();
  return { dataURL, width, height };
};

document.getElementById('log').textContent = `ready: ${Object.keys(ASSETS).join(', ')}`;
window.rendererReady = true;
