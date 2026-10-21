// Air and light: blue-charcoal exponential fog and sky, cold moonlight, warm amber lights at the nozzle
// and the hall's panels, and two faint ground-haze planes.
import * as THREE from 'three';
import { GLSL_NOISE } from './utils.js';
import { MOON_POSITION } from './moon.js';

export function createAtmosphere({ palette }) {
  const group = new THREE.Group();
  group.name = 'atmosphere';

  const background = palette.char.clone();
  const fog = new THREE.FogExp2(palette.char.clone(), 0.0145);

  // sky dome: ink overhead fading to the fog colour at the horizon, a faint warm bloom around the moon
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(320, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTop: { value: palette.ink },
        uHorizon: { value: palette.char },
        uWarm: { value: palette.vermilion },
        uMoonDir: { value: MOON_POSITION.clone().normalize() },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop, uHorizon, uWarm, uMoonDir;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          vec3 c = mix(uHorizon, uTop, smoothstep(0.02, 0.5, d.y));
          float m = max(dot(d, uMoonDir), 0.0);
          c = mix(c, uWarm, pow(m, 24.0) * 0.07);
          gl_FragColor = vec4(c, 1.0);
        }`,
    }),
  );
  sky.renderOrder = -20;
  sky.frustumCulled = false;

  // cold moonlight from behind the hall (rims the gate), a weak cold fill from the viewer's side
  const moonLight = new THREE.DirectionalLight(palette.cold, 1.6);
  moonLight.position.set(-18, 34, -70);
  const fill = new THREE.DirectionalLight(palette.cold, 0.42);
  fill.position.set(14, 12, 40);
  const hemi = new THREE.HemisphereLight(palette.cold, palette.ink, 0.45);

  // warm light: the nozzle (follows the print head) and the hall's glowing panels
  // sits up in the head (not on the print) with a soft falloff, so close shots don't blow out
  const nozzleLight = new THREE.PointLight(palette.amber, 6, 9, 1.4);
  const PANEL_INTENSITY = 30;
  const panelLights = [-9, 9].map((x) => {
    const light = new THREE.PointLight(palette.amber, PANEL_INTENSITY, 24, 1.6);
    light.position.set(x, 5.6, -19.2);
    return light;
  });

  // ground haze
  const uTime = { value: 0 };
  const hazeMaterial = (opacity) => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    uniforms: { uTime, uOpacity: { value: opacity }, uColor: { value: palette.cold.clone().lerp(palette.char, 0.5) } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vW;
      varying float vD;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vec4 mv = viewMatrix * w;
        vD = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      ${GLSL_NOISE}
      uniform float uTime, uOpacity;
      uniform vec3 uColor;
      varying vec2 vUv;
      varying vec3 vW;
      varying float vD;
      void main() {
        float n = fbm(vW.xz * 0.06 + vec2(uTime * 0.012, uTime * 0.007));
        vec2 e = abs(vUv - 0.5) * 2.0;
        float edge = (1.0 - smoothstep(0.5, 1.0, e.x)) * (1.0 - smoothstep(0.5, 1.0, e.y));
        float near = smoothstep(1.5, 10.0, vD);
        gl_FragColor = vec4(uColor, uOpacity * edge * near * (0.3 + 0.9 * n));
      }`,
  });
  const hazeFront = new THREE.Mesh(new THREE.PlaneGeometry(90, 46), hazeMaterial(0.07));
  hazeFront.rotation.x = -Math.PI / 2;
  hazeFront.position.set(0, 0.45, 8);
  const hazeBack = new THREE.Mesh(new THREE.PlaneGeometry(150, 80), hazeMaterial(0.2));
  hazeBack.rotation.x = -Math.PI / 2;
  hazeBack.position.set(0, 4.3, -42);
  hazeFront.renderOrder = hazeBack.renderOrder = 2;
  const hazes = [[hazeFront, 0.07], [hazeBack, 0.2]];

  // cold rim from behind and above the printer: outlines the gantry and the fox against the hall
  const rimLight = new THREE.DirectionalLight(palette.cold, 2.2);
  rimLight.position.set(-9, 18, -34);
  rimLight.target.position.set(0, 5.5, -6.9);
  group.add(sky, moonLight, fill, hemi, nozzleLight, ...panelLights, rimLight, rimLight.target, hazeFront, hazeBack);

  return {
    group,
    fog,
    background,
    update(state) {
      uTime.value = state.time;
      fog.density = state.fog;
      // sky glow and moonlight follow the moon wherever the current shot puts it
      sky.material.uniforms.uMoonDir.value.copy(state.moon).normalize();
      moonLight.position.set(state.moon.x * 0.6 - 18, state.moon.y + 10, state.moon.z * 0.7);
      for (const [mesh, base] of hazes) mesh.material.uniforms.uOpacity.value = Math.min(0.6, base * state.haze);
      nozzleLight.position.copy(state.nozzle);
      nozzleLight.position.y += 0.9;
      nozzleLight.intensity = (2 + 4 * state.heat) * (0.5 + 0.5 * (state.printLights ?? state.lights)); // steady: print-driven, never on the clock
      for (const light of panelLights) light.intensity = PANEL_INTENSITY * state.lights;
    },
  };
}
