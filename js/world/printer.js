// The landmark: a giant 3D-printer gantry standing like a torii at the top of the stairs. Black T-slot
// extrusions, orange caps and gussets, linear rails, a hanging print head with a glowing nozzle, a cable
// chain and a heated bed. On the bed the poster's low-poly fox is printed layer by layer (uPrint 0 -> 1):
// below the cut it is solid, at the cut a hot amber layer, above it a faint wireframe of what is still imagined.
import * as THREE from 'three';
import { compose, lerp, mergeParts, patchMaterial, smoothstep, tSlotGeometry } from './utils.js';

export const PRINTER = {
  base: new THREE.Vector3(0, 3.6, -6.9), // centre of the plinth top
  bedTop: 0.83,                          // local y of the build surface
  foxHeight: 2.4,
};

const PX = 4.6;      // post x
const S = 0.5;       // extrusion size
const NUKI = 7.6;    // X-axis beam height
const KASAGI = 9.3;  // top beam height
const HEAD_TOP = 1.28; // head assembly height above the nozzle tip

// fox cross-section radius by print height, so the head traces roughly the right outline
const OUTLINE = [[0, 0.75], [0.15, 0.7], [0.4, 0.55], [0.55, 0.3], [0.7, 0.45], [0.85, 0.3], [1, 0.12]];
function outlineRadius(h) {
  for (let i = 1; i < OUTLINE.length; i++) {
    if (h <= OUTLINE[i][0]) {
      const [h0, r0] = OUTLINE[i - 1], [h1, r1] = OUTLINE[i];
      return lerp(r0, r1, (h - h0) / (h1 - h0));
    }
  }
  return OUTLINE[OUTLINE.length - 1][1];
}

// The toolpath: a pure function of print progress p (0..1), so one p is always one head position.
// The print is TOOL_LAYERS layers; each layer is a zig-zag raster of TOOL_LINES passes across the fox's
// cross-section, stepping over at the end of each pass. Successive layers raster in opposite directions,
// so the last pass of a layer ends exactly where the first pass of the next begins: the head never jumps.
export const TOOL_LAYERS = 36;
const TOOL_LINES = 4;     // even, so a layer ends on the side the next one starts from
const STEP_OVER = 0.18;   // share of each pass spent stepping over to the next line
export function toolpath(p, out = { x: 0, y: 0, z: 0, layer: 0 }) {
  const q = Math.min(Math.max(p, 0), 1);
  const layer = Math.min(Math.floor(q * TOOL_LAYERS), TOOL_LAYERS - 1);
  const u = q * TOOL_LAYERS - layer;
  const line = Math.min(Math.floor(u * TOOL_LINES), TOOL_LINES - 1);
  const s = u * TOOL_LINES - line;
  const top = (layer + 1) / TOOL_LAYERS; // the nozzle rides at the top of the layer it is laying

  // across the cross-section (z), one line per pass; odd layers run the other way
  const k = (line + smoothstep(1 - STEP_OVER, 1, s)) / TOOL_LINES; // 0..1 over the layer
  const c = (layer % 2 ? 1 - k : k) * 1.7 - 0.85;
  // along each pass (x), alternating direction; held at the edge while stepping over
  const a = Math.min(s / (1 - STEP_OVER), 1);
  const dir = line % 2 ? -1 : 1;
  const envelope = smoothstep(0, 0.02, q) * (1 - smoothstep(0.98, 1, q)); // park in the middle at 0 and 1
  const r = outlineRadius(top) * envelope;
  const half = r * Math.sqrt(Math.max(0, 1 - c * c)); // chord of the (elliptical) section at this line
  out.x = dir * half * (2 * a - 1);
  out.z = c * r * 0.8;
  out.y = PRINTER.foxHeight * (q > 0 ? top : 0);
  out.layer = layer;
  return out;
}

// exported for the offline asset renderer (tools/), which reuses the fox in its stills and cutouts
export function foxGeometry(palette) {
  const cream = palette.bone, light = palette.paper, orange = palette.vermilion, ink = palette.ink;
  const ico = (r) => new THREE.IcosahedronGeometry(r, 0);
  const side = (x, fn) => [fn(-x, 1), fn(x, -1)];
  return mergeParts([
    // sitting body, chest, haunches
    { geometry: ico(0.6), matrix: compose(0, 0.78, -0.05, 0.2, 0.3, 0, 0.95, 1.25, 0.85), color: cream },
    { geometry: ico(0.42), matrix: compose(0, 0.95, 0.28, 0.25, 0, 0, 0.75, 1.1, 0.55), color: light },
    ...side(0.4, (x, s) => ({ geometry: ico(0.34), matrix: compose(x, 0.36, -0.12, 0, 0.4 * s, 0, 0.8, 0.85, 1.15), color: cream })),
    // front legs and paws
    ...side(0.17, (x) => ({ geometry: new THREE.CylinderGeometry(0.075, 0.1, 0.62, 5), matrix: compose(x, 0.36, 0.34), color: cream })),
    ...side(0.17, (x) => ({ geometry: new THREE.BoxGeometry(0.17, 0.1, 0.22), matrix: compose(x, 0.05, 0.4), color: orange })),
    ...side(0.48, (x) => ({ geometry: new THREE.BoxGeometry(0.2, 0.1, 0.26), matrix: compose(x, 0.05, 0.1), color: orange })),
    // head, cheeks, snout, nose, eyes
    { geometry: ico(0.42), matrix: compose(0, 1.72, 0.12, 0, 0, 0, 1.12, 0.92, 1.0), color: cream },
    ...side(0.2, (x) => ({ geometry: ico(0.2), matrix: compose(x, 1.6, 0.32, 0, 0, 0, 1.0, 0.8, 0.8), color: light })),
    { geometry: new THREE.ConeGeometry(0.17, 0.42, 4), matrix: compose(0, 1.62, 0.55, Math.PI / 2, Math.PI / 4, 0), color: light },
    { geometry: new THREE.OctahedronGeometry(0.055, 0), matrix: compose(0, 1.63, 0.77), color: ink },
    ...side(0.17, (x) => ({ geometry: new THREE.OctahedronGeometry(0.045, 0), matrix: compose(x, 1.8, 0.45, 0, 0, 0, 1.3, 0.8, 0.6), color: ink })),
    // ears with orange tips (coloured per face, so the tips are crisp)
    ...side(0.25, (x, s) => ({
      geometry: new THREE.ConeGeometry(0.17, 0.5, 4, 2),
      matrix: compose(x, 2.12, 0.08, 0, Math.PI / 4, 0.28 * s),
      color: (cx, cy) => (cy > 2.2 ? orange : cream),
    })),
    // tail curling round the right side, orange tip
    { geometry: ico(0.3), matrix: compose(0.55, 0.32, -0.42, 0, 0.5, 0, 1.4, 0.75, 0.8), color: cream },
    { geometry: ico(0.26), matrix: compose(0.86, 0.26, 0.0, 0, 1.1, 0, 1.3, 0.7, 0.8), color: cream },
    { geometry: ico(0.2), matrix: compose(0.86, 0.22, 0.38, 0, 1.6, 0, 1.25, 0.7, 0.8), color: orange },
  ]);
}

// the curved top beam (kasagi) with upturned ends, extruded through the frame's depth
function kasagiGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-6.9, 0.42);
  shape.quadraticCurveTo(0, -0.12, 6.9, 0.42);
  shape.lineTo(7.05, 0.8);
  shape.quadraticCurveTo(0, 0.3, -7.05, 0.8);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.9, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1, curveSegments: 16 });
  g.translate(0, 0, -0.45);
  return g;
}

function headGeometry() {
  const box = (w, h, d, x, y, z) => ({ geometry: new THREE.BoxGeometry(w, h, d), matrix: compose(x, y, z) });
  const fins = Array.from({ length: 6 }, (_, i) => box(0.58, 0.035, 0.5, 0, 0.52 + i * 0.09, 0));
  return mergeParts([
    box(0.1, 0.14, 0.1, 0, 0.47, 0),          // heat break
    box(0.48, 0.58, 0.44, 0, 0.78, 0),        // heatsink core
    ...fins,
    box(0.3, 0.24, 0.3, 0, 1.16, 0),          // top mount
  ]);
}

export function createPrinter({ palette }) {
  const group = new THREE.Group();
  group.name = 'printer';
  group.position.copy(PRINTER.base);

  const frameMat = new THREE.MeshStandardMaterial({ color: palette.char, metalness: 0.3, roughness: 0.65 }); // anodised, satin
  const orangeMat = new THREE.MeshStandardMaterial({ color: palette.vermilion, metalness: 0.1, roughness: 0.5 });
  const steelMat = new THREE.MeshStandardMaterial({ color: palette.steel, metalness: 0.75, roughness: 0.28 });

  // frame: every extrusion merged into one mesh
  const beam = (len, size, axis, x, y, z) => {
    const g = tSlotGeometry(len, size);
    if (axis === 'y') g.rotateX(Math.PI / 2);
    if (axis === 'x') g.rotateY(Math.PI / 2);
    return { geometry: g, matrix: compose(x, y, z) };
  };
  const frame = new THREE.Mesh(mergeParts([
    beam(9.0, S, 'y', -PX, 4.5, 0), beam(9.0, S, 'y', PX, 4.5, 0),          // posts
    beam(6.8, S, 'z', -PX, 0.25, 0), beam(6.8, S, 'z', PX, 0.25, 0),        // feet
    beam(8.7, S, 'x', 0, 0.25, -3.15), beam(8.7, S, 'x', 0, 0.25, 3.15),    // base cross members
    beam(10.6, S, 'x', 0, NUKI, 0),                                         // X axis (nuki), through the posts
    beam(12.4, 0.62, 'x', 0, KASAGI, 0),                                    // lower top beam
    { geometry: kasagiGeometry(), matrix: compose(0, KASAGI + 0.16, 0) },    // curved kasagi
  ]), frameMat);

  // orange end caps on every exposed beam end
  const caps = [
    [-5.32, NUKI, 0, 0.04, 0.52, 0.52], [5.32, NUKI, 0, 0.04, 0.52, 0.52],
    [-6.22, KASAGI, 0, 0.04, 0.64, 0.64], [6.22, KASAGI, 0, 0.04, 0.64, 0.64],
    [-PX, 0.25, 3.42, 0.52, 0.52, 0.04], [PX, 0.25, 3.42, 0.52, 0.52, 0.04],
    [-PX, 0.25, -3.42, 0.52, 0.52, 0.04], [PX, 0.25, -3.42, 0.52, 0.52, 0.04],
  ];
  const capMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), orangeMat, caps.length);
  const m = new THREE.Matrix4();
  caps.forEach(([x, y, z, sx, sy, sz], i) => capMesh.setMatrixAt(i, compose(x, y, z, 0, 0, 0, sx, sy, sz, 'XYZ', m)));

  // flat L gussets where the posts meet the beams, front and back
  const gussetGeo = mergeParts([
    { geometry: new THREE.BoxGeometry(0.62, 0.17, 0.04), matrix: compose(0.31, -0.085, 0) },
    { geometry: new THREE.BoxGeometry(0.17, 0.62, 0.04), matrix: compose(0.085, -0.31, 0) },
  ]);
  const gussetSpots = [];
  for (const y of [NUKI - 0.25, KASAGI - 0.31]) {
    for (const z of [0.27, -0.27]) {
      gussetSpots.push(compose(-PX + 0.25, y, z), compose(PX - 0.25, y, z, 0, Math.PI, 0));
    }
  }
  const gussets = new THREE.InstancedMesh(gussetGeo, orangeMat, gussetSpots.length);
  gussetSpots.forEach((matrix, i) => gussets.setMatrixAt(i, matrix));

  // linear rails: two on the X beam's face, two under the bed
  const rod = (len, r) => new THREE.CylinderGeometry(r, r, len, 8);
  const rails = new THREE.Mesh(mergeParts([
    { geometry: rod(9.6, 0.035), matrix: compose(0, NUKI + 0.14, 0.27, 0, 0, Math.PI / 2) },
    { geometry: rod(9.6, 0.035), matrix: compose(0, NUKI - 0.14, 0.27, 0, 0, Math.PI / 2) },
    { geometry: rod(6.6, 0.045), matrix: compose(-1.6, 0.56, 0, Math.PI / 2, 0, 0) },
    { geometry: rod(6.6, 0.045), matrix: compose(1.6, 0.56, 0, Math.PI / 2, 0, 0) },
  ]), steelMat);

  // heated bed: under-frame, plate, PEI-style surface with a faint grid and warm centre, orange clips
  const heat = { value: 0.45 };
  const bedTopMat = patchMaterial(new THREE.MeshStandardMaterial({ color: palette.steel, roughness: 0.55, metalness: 0.2 }), {
    key: 'heated-bed',
    uniforms: {
      uHeat: heat,
      uCenter: { value: new THREE.Vector2(PRINTER.base.x, PRINTER.base.z) },
      uLine: { value: palette.bone },
      uWarm: { value: palette.vermilion },
    },
    header: 'uniform float uHeat; uniform vec2 uCenter; uniform vec3 uLine; uniform vec3 uWarm;',
    color: /* glsl */ `
      vec2 bq = vWPos.xz - uCenter;
      vec2 bd = 0.5 - abs(fract(bq * 1.25) - 0.5);
      float bw = fwidth(bq.x * 1.25) * 1.5 + 0.01;
      float grid = 1.0 - smoothstep(0.0, bw, min(bd.x, bd.y));
      diffuseColor.rgb = mix(diffuseColor.rgb, uLine, grid * 0.16);`,
    emissive: /* glsl */ `
      totalEmissiveRadiance += uWarm * uHeat * 0.14 * (1.0 - smoothstep(0.3, 2.6, length(bq)));`,
  });
  const bed = new THREE.Group();
  const underFrame = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.1, 4.6), frameMat);
  underFrame.position.y = 0.66;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.14, 5.0), steelMat);
  plate.position.y = 0.76;
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(4.9, 4.9), bedTopMat);
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = PRINTER.bedTop + 0.002;
  const clips = new THREE.InstancedMesh(new THREE.BoxGeometry(0.3, 0.06, 0.16), orangeMat, 4);
  [[-2.3, -2.42], [2.3, -2.42], [-2.3, 2.42], [2.3, 2.42]].forEach(([x, z], i) => clips.setMatrixAt(i, compose(x, PRINTER.bedTop + 0.02, z, 0, 0, 0, 1, 1, 1, 'XYZ', m)));
  bed.add(underFrame, plate, surface, clips);

  // the fox: solid below the cut, glowing at it, a wireframe "imagination" above it
  const foxGeo = foxGeometry(palette);
  const uPrint = { value: 0 };
  const foxUniforms = {
    uPrint,
    uBase: { value: PRINTER.base.y + PRINTER.bedTop },
    uHeight: { value: PRINTER.foxHeight },
    uGlow: { value: palette.amber },
    uInfill: { value: palette.vermilion.clone().multiplyScalar(0.55) },
    uLayers: { value: 140 }, // visible layer lines over the fox's height
  };
  const foxHeader = 'uniform float uPrint; uniform float uBase; uniform float uHeight; uniform vec3 uGlow; uniform vec3 uInfill; uniform float uLayers;';
  const foxMat = patchMaterial(
    // a faint emissive floor keeps the cream reading as cream in the night light
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0, side: THREE.DoubleSide, emissive: palette.bone.clone().multiplyScalar(0.18) }),
    {
      key: 'fox-print',
      uniforms: foxUniforms,
      header: foxHeader,
      discard: 'float hPrint = (vWPos.y - uBase) / uHeight; if (hPrint > uPrint - 0.0001) discard;',
      color: /* glsl */ `
        // crisp, thin grooves between layers (a soft profile reads as wood grain), faded out with distance
        float layerF = hPrint * uLayers;
        float layerD = 0.5 - abs(fract(layerF) - 0.5);
        float layerW = fwidth(layerF);
        float groove = (1.0 - smoothstep(0.0, 0.07 + layerW, layerD)) * (1.0 - smoothstep(0.3, 0.6, layerW));
        diffuseColor.rgb *= 1.0 - 0.18 * groove;
        if (!gl_FrontFacing) diffuseColor.rgb = uInfill;`,
      emissive: /* glsl */ `
        float fresh = smoothstep(uPrint - 0.02, uPrint, hPrint) * step(0.0005, uPrint) * (1.0 - step(0.9995, uPrint));
        totalEmissiveRadiance += uGlow * fresh * 0.9;
        if (!gl_FrontFacing) totalEmissiveRadiance += uGlow * 0.5 * smoothstep(uPrint - 0.08, uPrint, hPrint);`,
    },
  );
  const fox = new THREE.Mesh(foxGeo, foxMat);
  const ghostMat = patchMaterial(
    new THREE.LineBasicMaterial({ color: palette.bone, transparent: true, opacity: 0.5, depthWrite: false }),
    {
      key: 'fox-ghost',
      uniforms: foxUniforms,
      header: foxHeader,
      normals: false,
      discard: 'float hPrint = (vWPos.y - uBase) / uHeight; if (hPrint < uPrint) discard;',
      color: 'diffuseColor.a *= 1.0 - 0.45 * smoothstep(uPrint + 0.04, 1.0, hPrint);',
    },
  );
  const ghost = new THREE.LineSegments(new THREE.EdgesGeometry(foxGeo, 1), ghostMat);
  const foxGroup = new THREE.Group();
  foxGroup.position.y = PRINTER.bedTop;
  foxGroup.add(fox, ghost);

  // print head: hangs from the X carriage on a rod; heatsink, fan with an orange ring, heat block, nozzle
  const head = new THREE.Group();
  const nozzleMat = new THREE.MeshStandardMaterial({ color: palette.amber, emissive: palette.amber, emissiveIntensity: 4, roughness: 0.4 });
  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 8), nozzleMat);
  nozzle.rotation.x = Math.PI;
  nozzle.position.y = 0.1;
  const heatBlock = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.2, 0.36), orangeMat);
  heatBlock.position.y = 0.3;
  const sink = new THREE.Mesh(headGeometry(), steelMat);
  const fan = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.1), frameMat);
  fan.position.set(0, 0.78, 0.29);
  const fanRing = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 6, 20), orangeMat);
  fanRing.position.set(0, 0.78, 0.345);
  head.add(nozzle, heatBlock, sink, fan, fanRing);
  // the molten strand under the tip: only visible while the print is actually moving (state.extrude)
  const strandMat = new THREE.MeshBasicMaterial({ color: palette.amber, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const strand = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 1, 6).translate(0, -0.5, 0), strandMat);
  strand.visible = false;
  head.add(strand);

  const carriage = new THREE.Group();
  const carriageBody = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 0.32), frameMat);
  carriageBody.position.z = 0.43;
  const carriagePlate = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.4, 0.03), orangeMat);
  carriagePlate.position.set(0, 0.05, 0.6);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.18), frameMat);
  tower.position.set(0, 0.67, 0.2);
  carriage.add(carriageBody, carriagePlate, tower);
  carriage.position.y = NUKI;

  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.7), frameMat);
  const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 6).translate(0, -0.5, 0), steelMat);

  // cable chain: lower run on the beam, a 180° bend, upper run back to the carriage
  const LINKS = 34, CHAIN = 9.0, R = 0.28, FIX_X = 4.2, Y0 = NUKI + 0.25 + 0.075;
  const chain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.24, 0.13, 0.3), frameMat, LINKS);
  chain.frustumCulled = false;
  const chainPos = new THREE.Vector3();
  function chainPoint(s, xc) {
    const xb = (FIX_X + xc + Math.PI * R - CHAIN) / 2;
    const lower = FIX_X - xb, bend = Math.PI * R;
    if (s < lower) { chainPos.set(FIX_X - s, Y0, 0); return Math.PI; }
    s -= lower;
    if (s < bend) {
      const a = s / R;
      chainPos.set(xb - Math.sin(a) * R, Y0 + R - Math.cos(a) * R, 0);
      return Math.atan2(Math.sin(a), -Math.cos(a));
    }
    chainPos.set(xb + (s - bend), Y0 + 2 * R, 0);
    return 0;
  }
  function updateChain(xc) {
    for (let i = 0; i < LINKS; i++) {
      const angle = chainPoint(((i + 0.5) / LINKS) * CHAIN, xc);
      chain.setMatrixAt(i, compose(chainPos.x, chainPos.y, chainPos.z, 0, 0, angle, 1, 1, 1, 'XYZ', m));
    }
    chain.instanceMatrix.needsUpdate = true;
  }

  group.add(frame, capMesh, gussets, rails, bed, foxGroup, carriage, bracket, hanger, head, chain);
  const tool = { x: 0, y: 0, z: 0, layer: 0 };

  return {
    group,
    foxUniforms, // the offline still renderer tunes these per shot
    head, // read by the ?debug print hook
    update(state) {
      // everything here is a function of the scroll-driven print state (state.print, state.park,
      // state.heat, state.extrude): when the scroll stops, the printer holds its exact frame
      uPrint.value = state.print;
      heat.value = state.heat;
      nozzleMat.emissiveIntensity = (1.5 + 2.5 * state.heat) * (0.6 + 0.4 * (state.printLights ?? state.lights)); // steady, never pulsing

      toolpath(state.print, tool);
      const hx = tool.x, hz = tool.z;
      const tipY = PRINTER.bedTop + 0.02 + tool.y + state.park * 1.2;
      // the strand reaches from the tip down to the cut, and glows only while extruding
      const extrude = (state.extrude ?? 0) * (1 - state.park);
      strand.visible = extrude > 0.01;
      strandMat.opacity = Math.min(1, extrude);
      strand.scale.y = Math.max(0.02, tipY - (PRINTER.bedTop + PRINTER.foxHeight * state.print));

      head.position.set(hx, tipY, hz);
      carriage.position.x = hx;
      bracket.position.set(hx, NUKI - 0.33, hz * 0.5 + 0.12);
      const rodTop = NUKI - 0.41;
      hanger.position.set(hx, rodTop, hz);
      hanger.scale.y = Math.max(0.01, rodTop - (tipY + HEAD_TOP));
      updateChain(hx);

      state.nozzle.set(hx, tipY, hz).add(PRINTER.base);
    },
  };
}
