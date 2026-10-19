// The poster's orange circle as a vermilion moon behind the hall: halftone-dot craters, limb darkening,
// a soft rim and a faint halo. Unlit and unfogged so its colour stays exactly --vermilion.
import * as THREE from 'three';
import { GLSL_NOISE } from './utils.js';

export const MOON_POSITION = new THREE.Vector3(0, 24, -105);
const RADIUS = 22;

export function createMoon({ palette }) {
  const group = new THREE.Group();
  group.name = 'moon';
  group.position.copy(MOON_POSITION);

  const disc = new THREE.Mesh(
    new THREE.PlaneGeometry(RADIUS * 2, RADIUS * 2),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      fog: false,
      uniforms: {
        uColor: { value: palette.vermilion },
        uDark: { value: palette.ink },
        uDots: { value: 44 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        ${GLSL_NOISE}
        uniform vec3 uColor, uDark;
        uniform float uDots;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r = length(p);
          float alpha = 1.0 - smoothstep(0.985, 1.0, r);
          if (alpha <= 0.0) discard;

          // crater field + a gentle terminator towards the lower right
          float craters = smoothstep(0.5, 0.78, fbm(p * 1.7 + vec2(4.2, 1.3)));
          float shade = smoothstep(-0.1, 1.15, dot(p, normalize(vec2(0.55, -0.85))));
          float tone = clamp(craters * 0.85 + shade * 0.32, 0.0, 1.0);

          // halftone screen at 45 degrees: dot area follows tone
          vec2 g = mat2(0.7071, -0.7071, 0.7071, 0.7071) * p * uDots;
          float d = length(fract(g) - 0.5);
          float rad = sqrt(tone) * 0.5;
          float aa = fwidth(d) * 1.2;
          float dots = 1.0 - smoothstep(rad - aa, rad + aa, d);

          vec3 col = mix(uColor, uDark, dots * 0.5);
          col *= mix(1.0, 0.8, smoothstep(0.72, 1.0, r)); // limb darkening
          gl_FragColor = vec4(col, alpha);
        }`,
    }),
  );
  disc.renderOrder = -9;

  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(RADIUS * 4, RADIUS * 4),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: palette.vermilion }, uStrength: { value: 0.1 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uStrength;
        varying vec2 vUv;
        void main() {
          float r = length(vUv * 2.0 - 1.0) * 2.0; // 1.0 = the disc's edge
          float glow = pow(1.0 - smoothstep(0.95, 2.0, r), 2.0);
          gl_FragColor = vec4(uColor, glow * uStrength);
        }`,
    }),
  );
  halo.position.z = -0.5;
  halo.renderOrder = -10;

  group.add(halo, disc);
  return {
    group,
    update(state) {
      // each shot places the moon where it composes best; the disc always faces the lens
      group.position.copy(state.moon);
      group.lookAt(state.camera);
    },
  };
}
