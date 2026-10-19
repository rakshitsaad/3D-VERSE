// Foreground cutouts (dev-only): bottom-anchored, transparent background, ~2400 px wide.
import { tSlotGeometry, patchMaterial } from '../../js/world/utils.js';
import { foxGeometry } from '../../js/world/printer.js';
import {
  THREE, palette, compose, mergeParts, mulberry32, cutoutStage, cutoutLights, ribbon, concat, wireTubes, halo, pineGeometry, noise1,
} from './common.js';

const cutout = (width, height, build) => ({ kind: 'cutout', width, height, build });
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const scaled = (color, k) => color.clone().multiplyScalar(k);
const pick = (rng, list) => list[Math.floor(rng() * list.length)];

// matrix placing a unit-height, y-aligned geometry between a and b
const _up = new THREE.Vector3(0, 1, 0);
function between(a, b) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(_up, dir.normalize());
  return new THREE.Matrix4().compose(new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5), q, new THREE.Vector3(1, len, 1));
}

// tube along a curve whose radius tapers from r0 to r1
function taperedTube(curve, r0, r1, tubular = 96, radial = 8) {
  const g = new THREE.TubeGeometry(curve, tubular, r0, radial, false);
  const p = g.attributes.position;
  const c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    curve.getPointAt(t, c);
    const k = (r0 + (r1 - r0) * t) / r0;
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j;
      v.fromBufferAttribute(p, idx).sub(c).multiplyScalar(k).add(c);
      p.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

const layerLines = (key, spacing = 0.035, depth = 0.22) => ({
  key,
  color: /* glsl */ `
    float ly = vWPos.y / ${spacing.toFixed(4)};
    float lw = fwidth(ly);
    float groove = 1.0 - smoothstep(0.0, 0.18 + lw, 0.5 - abs(fract(ly) - 0.5));
    diffuseColor.rgb *= 1.0 - ${depth.toFixed(2)} * groove * (1.0 - smoothstep(0.3, 0.6, lw));`,
});

// ---------------------------------------------------------------------------------------------------
// 1. filament grass: a dense band of dark strands, taller towards the edges, a few orange filament
//    strands with curled tips
function filamentGrass({ aspect, seed }) {
  const { scene, camera } = cutoutStage({ aspect });
  const rng = mulberry32(seed * 13 + 1);
  const blades = [];
  const tips = [scaled(palette.steel, 1.05), scaled(palette.cold, 0.16), scaled(palette.bone, 0.085), scaled(palette.char, 1.5)];
  for (let i = 0; i < 1700; i++) {
    const x = (rng() * 2 - 1) * 12.8;
    const z = -3 + rng() * 5.5;
    const edge = Math.abs(x) / 12.8;
    const h = (0.6 + rng() * 1.5 + edge * edge * 2.6) * (0.7 + 0.6 * noise1(x * 0.55, seed));
    const lean = (rng() - 0.5) * 1.5 + x * 0.025;
    const orange = rng() < 0.04;
    const curl = orange ? rng() < 0.35 : rng() < 0.012;
    const base = new THREE.Vector3(x, -1.6, z);
    const ctrl = new THREE.Vector3(x + lean * 0.3, h * 0.5, z);
    const tip = new THREE.Vector3(x + lean, h, z);
    const curve = new THREE.QuadraticBezierCurve3(base, ctrl, tip);
    const pts = curve.getPoints(10);
    if (curl) {
      const t = new THREE.Vector3().subVectors(tip, ctrl).normalize();
      const dir = lean >= 0 ? -1 : 1;
      const r = 0.1 + rng() * 0.12;
      const center = new THREE.Vector3(tip.x - t.y * r * dir, tip.y + t.x * r * dir, z);
      const a0 = Math.atan2(tip.y - center.y, tip.x - center.x);
      const turn = (t.x * -(tip.y - center.y) + t.y * (tip.x - center.x)) > 0 ? 1 : -1;
      for (let k = 1; k <= 16; k++) {
        const a = a0 + turn * (k / 16) * Math.PI * 1.7;
        const rr = r * (1 - k / 40);
        pts.push(new THREE.Vector3(center.x + Math.cos(a) * rr, center.y + Math.sin(a) * rr, z));
      }
    }
    const depth = 0.4 + 0.6 * clamp01((z + 3) / 5.5);
    const tipColor = orange ? (rng() < 0.6 ? palette.vermilion : palette.amber) : pick(rng, tips);
    const baseColor = orange ? scaled(palette.vermilion, 0.18) : palette.ink;
    blades.push(ribbon(pts, 0.075, 0.014, (t, c) => c.copy(baseColor).lerp(tipColor, Math.pow(t, 0.8)).multiplyScalar(orange ? 1 : depth)));
  }
  scene.add(new THREE.Mesh(concat(blades), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));
  return { scene, camera, grain: 0.016 }; // fine detail already; heavy grain bloats the WebP
}

// ---------------------------------------------------------------------------------------------------
// 2. spool stack: filament spools resting on their rims, stacked; one rolled away, a loose strand
function spool(rng, color, { core = 0.8 } = {}) {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.absarc(0, 0, 1, 0, Math.PI * 2, false);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    const hole = new THREE.Path();
    hole.absarc(Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0.16, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  const hubHole = new THREE.Path();
  hubHole.absarc(0, 0, 0.17, 0, Math.PI * 2, true);
  shape.holes.push(hubHole);
  const flangeGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1, curveSegments: 48 });
  flangeGeo.translate(0, 0, -0.03);
  const flangeMat = new THREE.MeshStandardMaterial({ color: palette.char, roughness: 0.45, metalness: 0.15 });
  for (const z of [-0.36, 0.36]) {
    const f = new THREE.Mesh(flangeGeo, flangeMat);
    f.position.z = z;
    g.add(f);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.7, 28, 1, true).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: palette.steel, roughness: 0.5, side: THREE.DoubleSide }));
  g.add(hub);
  const filMat = new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.05 });
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(core - 0.02, core - 0.02, 0.62, 56).rotateX(Math.PI / 2), filMat));
  const loops = 12;
  for (let k = 0; k < loops; k++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(core, 0.027, 6, 80), filMat);
    ring.position.z = -0.29 + (k / (loops - 1)) * 0.58;
    g.add(ring);
  }
  return g;
}

function spoolStack({ aspect, seed }) {
  const { scene, camera } = cutoutStage({ aspect });
  cutoutLights(scene, { key: 1.25, rim: 2.6, fill: 0.4 });
  const rng = mulberry32(seed * 7 + 3);
  const colors = [palette.vermilion, palette.amber, palette.bone, scaled(palette.char, 1.6), palette.vermilion, palette.bone];
  const stack = [[-9.25, 0.92], [-7.2, 0.92], [-5.15, 0.92], [-8.22, 2.68], [-6.18, 2.68], [-7.2, 4.44]];
  stack.forEach(([x, y], i) => {
    const s = spool(rng, colors[i], { core: i === 5 ? 0.55 : 0.8 });
    s.position.set(x, y, 0.2 + (rng() - 0.5) * 0.3);
    s.rotation.set((rng() - 0.5) * 0.08, (rng() - 0.5) * 0.7, (rng() - 0.5) * 0.3);
    scene.add(s);
  });
  const loose = spool(rng, palette.amber);
  loose.position.set(8.6, 0.95, 1.2);
  loose.rotation.set(0, 0.75, 0.05);
  scene.add(loose);
  const lying = spool(rng, palette.vermilion, { core: 0.45 });
  lying.position.set(11.4, 0.36, -1.2);
  lying.rotation.set(Math.PI / 2 - 0.12, 0, 0.4);
  scene.add(lying);
  // a strand pulled off the bottom spool, trailing across the ground to the rolled-away one
  const strand = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-5.2, 0.35, 0.65), new THREE.Vector3(-3.4, 0.12, 1.2), new THREE.Vector3(-0.5, 0.3, 1.6),
    new THREE.Vector3(2.6, 0.06, 1.4), new THREE.Vector3(5.4, 0.42, 1.7), new THREE.Vector3(7.9, 0.2, 1.5),
  ]);
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(strand, 200, 0.024, 6), new THREE.MeshStandardMaterial({ color: palette.vermilion, roughness: 0.35, emissive: scaled(palette.vermilion, 0.12) })));
  return { scene, camera, tint: 0.25 };
}

// ---------------------------------------------------------------------------------------------------
// 3. voxel stones: mounds of stacked cubes, a few printed orange voxels, filament moss
function voxelStones({ aspect, seed }) {
  const { scene, camera } = cutoutStage({ aspect });
  cutoutLights(scene, { key: 0.6, rim: 3.2, fill: 0.4 });
  const rng = mulberry32(seed * 5 + 11);
  const cubes = [];
  const crowns = [];
  const rocks = [[-11.4, -0.6, 2.9], [-7.4, 1.5, 1.7], [-4.4, -2.8, 1.4], [-1.0, 1.9, 0.95], [2.6, -1.4, 1.5], [6.0, 1.6, 1.9], [9.5, -0.9, 2.7], [12.6, 1.3, 1.6]];
  for (const [cx, cz, radius] of rocks) {
    const v = 0.28 + radius * 0.1;
    const n = Math.ceil(radius / v) + 1;
    let peak = 0;
    for (let gx = -n; gx <= n; gx++) {
      for (let gz = -n; gz <= n; gz++) {
        const d = Math.hypot(gx * v * 0.85, gz * v * 1.25);
        if (d > radius) continue;
        const h = Math.pow(1 - d / radius, 0.7) * radius * 1.35 * (0.8 + 0.4 * rng()) + 1.2;
        const layers = Math.max(1, Math.floor(h / v));
        for (let k = 0; k < layers; k++) {
          const s = v * (0.86 + rng() * 0.12);
          const top = k === layers - 1;
          const y = -1.2 + k * v + s / 2;
          peak = Math.max(peak, y + s / 2);
          cubes.push({
            m: compose(cx + gx * v + (rng() - 0.5) * 0.06, y, cz + gz * v + (rng() - 0.5) * 0.06, (rng() - 0.5) * 0.12, (rng() - 0.5) * 0.35, (rng() - 0.5) * 0.12, s),
            c: rng() < 0.03 ? palette.vermilion : top ? scaled(palette.steel, 1.3 + rng() * 0.9) : pick(rng, [palette.steel, palette.char, scaled(palette.steel, 0.75)]),
          });
        }
      }
    }
    crowns.push([cx, cz, radius, peak]);
  }
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.05 }), cubes.length);
  cubes.forEach(({ m, c }, i) => { mesh.setMatrixAt(i, m); mesh.setColorAt(i, c); });
  scene.add(mesh);
  // a few filament strands growing from the crowns, mostly dark, now and then orange
  const moss = [];
  for (const [cx, cz, radius, peak] of crowns) {
    for (let k = 0; k < 6; k++) {
      const x = cx + (rng() - 0.5) * radius * 0.6;
      const y0 = peak - 0.25;
      const pts = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x, y0, cz + 0.6), new THREE.Vector3(x + (rng() - 0.5) * 0.25, y0 + 0.25, cz + 0.6), new THREE.Vector3(x + (rng() - 0.5) * 0.5, y0 + 0.35 + rng() * 0.3, cz + 0.6)).getPoints(6);
      const orange = rng() < 0.35;
      const tip = orange ? palette.vermilion : scaled(palette.steel, 1.3);
      moss.push(ribbon(pts, 0.03, 0.008, (t, c) => c.copy(palette.ink).lerp(tip, t)));
    }
  }
  scene.add(new THREE.Mesh(concat(moss), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));
  return { scene, camera };
}

// ---------------------------------------------------------------------------------------------------
// 4. printed wall: a long retaining wall built from chunky 0.11-unit layers that step in and out by a
//    hair, so every layer catches its own line of light; a filament-change band runs through it in orange
function printedWall({ aspect, seed }) {
  const { scene, camera } = cutoutStage({ aspect });
  const { rimLight, keyLight } = cutoutLights(scene, { key: 0.95, rim: 3.9, fill: 0.4 });
  rimLight.position.set(3, 10, -5);   // high and behind: grazes the top edge of every layer
  keyLight.position.set(-10, 1.2, 5); // low from the left: rakes across the layer faces
  const rng = mulberry32(seed * 3 + 5);
  const layer = 0.11, colW = 0.4;
  const band = [17, 21];              // layers printed after the filament change
  const witness = [band[0] - 2, band[1] + 2];
  // the wall follows a long curve that recedes to the right, so its layer lines converge with depth
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-14.5, 0, 1.8), new THREE.Vector3(-6, 0, 0.8), new THREE.Vector3(2, 0, -1.4),
    new THREE.Vector3(9, 0, -4.2), new THREE.Vector3(16, 0, -8),
  ]);
  const count = Math.ceil(path.getLength() / colW);
  const breach = (t, at, width, depth) => depth * Math.exp(-(((t - at) / width) ** 2));
  const items = [];
  const normal = new THREE.Vector3();
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const p = path.getPointAt(t);
    const tan = path.getTangentAt(t);
    const yaw = Math.atan2(-tan.z, tan.x);
    normal.set(-tan.z, 0, tan.x);
    let h = 1.5 + 1.6 * noise1(i * 0.07, seed) + 0.35 * noise1(i * 0.45, seed + 4);
    h *= 1 - breach(t, 0.36, 0.045, 0.75) - breach(t, 0.71, 0.03, 0.6) - breach(t, 0.12, 0.02, 0.35);
    const n = Math.max(2, Math.floor((h + 1.2) / layer));
    for (let k = 0; k < n; k++) {
      const last = k === n - 1;
      const step = k % 2 ? 0.018 : -0.018;
      const grain = 0.88 + 0.24 * noise1(k * 0.15 + i * 0.05, seed + 2);
      const c = k >= band[0] && k <= band[1] ? scaled(palette.vermilion, (k % 2 ? 0.78 : 0.62) * grain)
        : witness.includes(k) ? scaled(palette.bone, 0.32)
        : scaled(palette.steel, (k % 2 ? 1.3 : 0.78) * grain);
      items.push({
        m: compose(p.x + normal.x * step + (rng() - 0.5) * 0.008, -1.2 + k * layer + layer / 2, p.z + normal.z * step + (rng() - 0.5) * 0.008,
          0, yaw, 0, last ? colW * (0.4 + rng() * 0.6) : colW + 0.004, layer - 0.014, 0.75),
        c,
      });
    }
    // orange drips from a few of the broken tops
    if (rng() < 0.05) {
      const top = -1.2 + n * layer;
      const len = 0.3 + rng() * 0.9;
      const a = p.clone().addScaledVector(normal, 0.39).setY(top);
      const drip = new THREE.CatmullRomCurve3([a, a.clone().add(new THREE.Vector3(0.02, -len * 0.5, 0.02)), a.clone().add(new THREE.Vector3(-0.02, -len, 0.01))]);
      scene.add(new THREE.Mesh(taperedTube(drip, 0.028, 0.01, 24, 6), new THREE.MeshStandardMaterial({ color: palette.vermilion, roughness: 0.3, emissive: scaled(palette.vermilion, 0.15) })));
    }
  }
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.05 }), items.length);
  items.forEach(({ m, c }, i) => { mesh.setMatrixAt(i, m); mesh.setColorAt(i, c); });
  scene.add(mesh);
  return { scene, camera };
}

// ---------------------------------------------------------------------------------------------------
// 5. ruins: a yard of failed prints in two rows. Front: a vase snapped at a slant with its top lying
//    beside it, the fox itself failed (layer shift, spaghetti), a "blob of death" swallowing a hot-end,
//    a toppled tower, a broken spire with an orange band, scattered debris. Back, in haze: a warped
//    sheet with curled corners, a second snapped vase, a stand of tree supports. Stringing ties it all.
function lathe(points) {
  return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), 48);
}

function ruins({ aspect, seed }) {
  const { scene, camera } = cutoutStage({ aspect });
  cutoutLights(scene, { key: 0.75, rim: 3.8, fill: 0.42 });
  const rng = mulberry32(seed * 17 + 2);
  const place = (mesh, x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => {
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.scale.setScalar(s);
    mesh.updateMatrixWorld();
    for (const plane of [].concat(mesh.material.clippingPlanes || [])) plane.applyMatrix4(mesh.matrixWorld);
    scene.add(mesh);
    return mesh;
  };
  let layerKey = 0;
  const layered = (color, { spacing = 0.06, depth = 0.3, ...opts } = {}) =>
    patchMaterial(new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...opts }), layerLines(`ruin-${layerKey++}`, spacing, depth));
  const anchors = {}; // points the stringing connects

  // back row, darker as if in haze -------------------------------------------------------------------
  const sheet = new THREE.PlaneGeometry(3.6, 2.8, 18, 12);
  const sp = sheet.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i), y = sp.getY(i);
    const corner = Math.max(0, Math.abs(x) - 0.9);
    sp.setZ(i, corner * corner * 0.42 * ((y + 1.4) / 2.8) + Math.max(0, -y - 0.9) * 0.15); // corners curl off the bed
  }
  sheet.computeVertexNormals();
  place(new THREE.Mesh(sheet, layered(scaled(palette.bone, 0.42), { side: THREE.DoubleSide, spacing: 0.07 })), -6.4, 0.6, -5.2, 0, 0.3, 0.04);

  const vase2 = [[0.6, -1.2], [0.85, 0.2], [0.9, 1.0], [0.6, 2.0], [0.5, 2.6]];
  place(new THREE.Mesh(lathe(vase2), layered(scaled(palette.bone, 0.4), { side: THREE.DoubleSide, clippingPlanes: [new THREE.Plane(new THREE.Vector3(-0.3, -1, 0.1).normalize(), 1.0)] })), 8.6, 0, -5.6, 0, 0, 0, 1.15);

  const backParts = [];
  const backTips = [];
  [[0.2, 3.2], [1.6, 4.0], [3.0, 2.9]].forEach(([x, h]) => {
    const base = new THREE.Vector3(x, -1.2, -4.8);
    const top = new THREE.Vector3(x + (rng() - 0.5) * 0.5, h, -4.8);
    backParts.push({ geometry: new THREE.CylinderGeometry(0.05, 0.08, 1, 5), matrix: between(base, top), color: scaled(palette.bone, 0.42) });
    for (let b = 0; b < 3; b++) {
      const tip = top.clone().add(new THREE.Vector3((rng() - 0.5) * 1.1, 0.25 + rng() * 0.55, (rng() - 0.5) * 0.3));
      backParts.push({ geometry: new THREE.CylinderGeometry(0.022, 0.04, 1, 5), matrix: between(top, tip), color: scaled(palette.bone, 0.42) });
      backTips.push(tip);
    }
  });
  scene.add(new THREE.Mesh(mergeParts(backParts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, flatShading: true })));

  // front row --------------------------------------------------------------------------------------
  const vaseProfile = [[0.7, -1.2], [0.95, 0.0], [1.05, 0.8], [0.8, 1.8], [0.55, 2.6], [0.62, 3.2], [0.66, 3.4]];
  place(new THREE.Mesh(lathe(vaseProfile), layered(scaled(palette.bone, 0.8), { side: THREE.DoubleSide, clippingPlanes: [new THREE.Plane(new THREE.Vector3(0.38, -1, 0.12).normalize(), 1.65)] })), -10.6, 0, 0.4, 0, 0, 0, 1.3);
  place(new THREE.Mesh(lathe(vaseProfile), layered(scaled(palette.bone, 0.76), { side: THREE.DoubleSide, clippingPlanes: [new THREE.Plane(new THREE.Vector3(-0.38, 1, -0.12).normalize(), -1.65)] })), -7.3, 0.05, 1.7, 0, 0.4, 1.45, 1.3);
  anchors.vaseTop = new THREE.Vector3(-8.2, 0.9, 1.9);
  anchors.vaseRim = new THREE.Vector3(-10.3, 2.3, 0.6);

  // the fox, failed: printed to the chest, a layer shift, then spaghetti
  const foxGeo = foxGeometry(palette);
  const foxMat = (planes) => patchMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide, clippingPlanes: planes }), layerLines(`ruin-fox-${layerKey++}`, 0.04, 0.2));
  const raft = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.1, 2.4), new THREE.MeshStandardMaterial({ color: palette.steel, roughness: 0.7 }));
  raft.position.set(-2.8, 0.05, 0.8);
  scene.add(raft);
  place(new THREE.Mesh(foxGeo, foxMat([new THREE.Plane(new THREE.Vector3(0.12, -1, 0).normalize(), 0.95)])), -2.8, 0.1, 0.8, 0, 0.35, 0, 1.75);
  place(new THREE.Mesh(foxGeo, foxMat([new THREE.Plane(new THREE.Vector3(-0.12, 1, 0).normalize(), -0.95), new THREE.Plane(new THREE.Vector3(0, -1, 0), 1.25)])), -2.35, 0.13, 0.82, 0, 0.35, 0, 1.75);
  const nest = new THREE.Vector3(-2.4, 2.7, 0.7);
  anchors.nest = nest;
  for (let k = 0; k < 64; k++) {
    const pts = [];
    let p = nest.clone().add(new THREE.Vector3((rng() - 0.5) * 2.0, (rng() - 0.5) * 1.0, (rng() - 0.5) * 1.0));
    for (let j = 0; j < 10; j++) {
      pts.push(p.clone());
      p = p.clone().add(new THREE.Vector3((rng() - 0.5) * 1.0, (rng() - 0.62) * 0.7, (rng() - 0.5) * 0.6));
      p.sub(nest).multiplyScalar(0.92).add(nest);
      p.y = Math.max(0.1, p.y);
    }
    if (k % 4 === 0) pts.push(p.clone().add(new THREE.Vector3((rng() - 0.5) * 2.4, 0, 0.3)).setY(0.12));
    const color = rng() < 0.7 ? palette.vermilion : palette.amber;
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 70, 0.013, 5), new THREE.MeshStandardMaterial({ color, roughness: 0.35, emissive: scaled(color, 0.1) })));
  }

  // the blob of death: a lumpy mass of molten filament that has swallowed a hot-end
  const blobGeo = new THREE.IcosahedronGeometry(0.95, 3);
  const bp = blobGeo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < bp.count; i++) {
    v.fromBufferAttribute(bp, i);
    const n = Math.sin(v.x * 3.1 + 1.3) * Math.sin(v.y * 2.7 + 0.4) * Math.sin(v.z * 3.3 + 2.2);
    v.multiplyScalar(1 + 0.3 * n + 0.07 * Math.sin(v.x * 9 + v.z * 7));
    v.y *= 0.7;
    bp.setXYZ(i, v.x, v.y, v.z);
  }
  blobGeo.computeVertexNormals();
  const blob = new THREE.Mesh(blobGeo, new THREE.MeshStandardMaterial({ color: scaled(palette.vermilion, 0.78), roughness: 0.32, flatShading: true, emissive: scaled(palette.vermilion, 0.05) }));
  blob.position.set(2.4, 0.45, 1.0);
  scene.add(blob);
  const swallowed = new THREE.Group();
  const sink = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.45), new THREE.MeshStandardMaterial({ color: palette.steel, roughness: 0.35, metalness: 0.6 }));
  sink.position.y = 0.35;
  const block = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.2, 0.38), new THREE.MeshStandardMaterial({ color: palette.vermilion, roughness: 0.5 }));
  swallowed.add(sink, block);
  swallowed.position.set(2.75, 0.95, 1.1);
  swallowed.rotation.set(0.2, 0.4, -0.55);
  scene.add(swallowed);
  anchors.blob = new THREE.Vector3(2.0, 1.0, 1.2);

  // a toppled tower and a broken spire with an orange filament-change band
  place(new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.6, 0.9), layered(scaled(palette.vermilion, 0.7))), 6.3, 0.32, 0.2, 0.1, 0.35, 1.42);
  anchors.tower = new THREE.Vector3(7.4, 0.7, 0.3);
  const spireSteel = layered(scaled(palette.steel, 1.5));
  place(new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.6, 1.0), spireSteel), 10.6, 0.1, 0.4);
  place(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.36, 1.0), layered(scaled(palette.vermilion, 0.72))), 10.6, 1.58, 0.4);
  place(new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 1.0), spireSteel), 10.6, 2.11, 0.4);
  place(new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.7, 1.0), layered(scaled(palette.steel, 1.4))), 11.75, 0.6, 0.9, 0.1, 0.25, -0.42); // the snapped top, leaning
  anchors.spire = new THREE.Vector3(10.4, 2.45, 0.9);

  // debris: little layered chunks scattered over the ground
  const debrisMats = [layered(scaled(palette.bone, 0.7), { spacing: 0.04 }), layered(scaled(palette.vermilion, 0.7), { spacing: 0.04 }), layered(scaled(palette.steel, 1.4), { spacing: 0.04 })];
  for (let k = 0; k < 30; k++) {
    const s = 0.12 + rng() * 0.28;
    const r = rng();
    const chunk = new THREE.Mesh(new THREE.BoxGeometry(s * (0.8 + rng() * 0.6), s, s * (0.8 + rng() * 0.6)), debrisMats[r < 0.65 ? 0 : r < 0.88 ? 1 : 2]);
    chunk.position.set((rng() * 2 - 1) * 12.5, s * 0.45, 0.6 + rng() * 2.2);
    chunk.rotation.set((rng() - 0.5) * 0.6, rng() * 3, (rng() - 0.5) * 0.6);
    scene.add(chunk);
  }

  // stringing: thin catenaries between the wrecks, and from the back supports' tips
  const strings = [
    [anchors.vaseRim, anchors.vaseTop], [anchors.vaseTop, anchors.nest], [anchors.nest, anchors.blob],
    [anchors.blob, anchors.tower], [anchors.tower, anchors.spire],
  ];
  for (let i = 0; i < backTips.length - 1; i++) strings.push([backTips[i], backTips[i + 1]]);
  strings.push([backTips[0], anchors.nest], [backTips[backTips.length - 1], anchors.spire]);
  for (let k = 0; k < 7; k++) strings.push([anchors.blob, anchors.blob.clone().add(new THREE.Vector3((rng() - 0.5) * 2.4, -0.95, (rng() - 0.3) * 1.2))]);
  const stringMat = new THREE.MeshBasicMaterial({ color: scaled(palette.bone, 0.55) });
  for (const [a, b] of strings) {
    const mid = a.clone().lerp(b, 0.5);
    mid.y -= 0.2 + a.distanceTo(b) * 0.16;
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, b), 48, 0.008, 4), stringMat));
  }
  return { scene, camera };
}

// ---------------------------------------------------------------------------------------------------
// 6. support bushes: tree supports branching up to flat contact pads, like little bushes
function supportBushes({ aspect, seed }) {
  const { scene, camera } = cutoutStage({ aspect });
  cutoutLights(scene, { key: 0.55, rim: 3.4, fill: 0.4 });
  const rng = mulberry32(seed * 23 + 9);
  const parts = [];
  // tree supports: a short trunk that forks early and keeps forking outwards, ending in flat contact pads
  function grow(p, dir, len, r, depth, color, padColor) {
    const end = p.clone().addScaledVector(dir, len);
    parts.push({ geometry: new THREE.CylinderGeometry(r * 0.8, r, 1, 6), matrix: between(p, end), color });
    if (depth === 0) {
      parts.push({ geometry: new THREE.CylinderGeometry(r * 2.6, r * 1.1, 0.03, 7), matrix: compose(end.x, end.y + 0.015, end.z), color: padColor });
      return;
    }
    const kids = rng() < 0.5 ? 3 : 2;
    for (let k = 0; k < kids; k++) {
      const out = new THREE.Vector3(dir.x * 0.5 + (rng() - 0.5) * 1.9, 0.42 + rng() * 0.5, dir.z * 0.5 + (rng() - 0.5) * 1.1).normalize();
      grow(end, out, len * (0.74 + rng() * 0.18), r * 0.72, depth - 1, color, padColor);
    }
  }
  const bushes = [[-11.2, 0.6, 3.6, 6], [-8.0, -1.6, 2.8, 5], [-5.4, 1.2, 2.0, 5], [-1.8, -0.8, 1.6, 4], [1.6, 1.0, 2.2, 5], [5.2, -1.4, 3.0, 6], [8.6, 0.8, 3.4, 6], [11.8, -1.2, 2.6, 5], [-13.4, -3.0, 2.4, 5]];
  bushes.forEach(([x, z, h, depth], i) => {
    const color = i % 4 === 2 ? scaled(palette.steel, 1.6) : scaled(palette.bone, 0.8);
    const pad = rng() < 0.35 ? palette.vermilion : scaled(palette.bone, 0.9);
    grow(new THREE.Vector3(x, -1.3, z), new THREE.Vector3(0, 1, 0), 1.3 + h * 0.18, 0.06 + h * 0.012, depth, color, pad);
  });
  scene.add(new THREE.Mesh(mergeParts(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65, flatShading: true })));
  return { scene, camera, grain: 0.014 };
}

// ---------------------------------------------------------------------------------------------------
// 7. wire hills: three low-poly ridgelines, dark fills under bone/cold wire edges, fading with depth
function ridgeGeometry(seed, z, base, amp, freq, bottom) {
  const rng = mulberry32(seed);
  const xs = [];
  for (let x = -17; x <= 17; x += 1.05 + rng() * 0.5) xs.push(x);
  const top = (x) => base + amp * (0.7 * noise1(x * freq, seed) + 0.3 * noise1(x * freq * 2.3, seed + 3));
  const rows = xs.map((x) => {
    const t = top(x);
    return [
      new THREE.Vector3(x, bottom, z),
      new THREE.Vector3(x + (rng() - 0.5) * 0.5, t * 0.55 + (rng() - 0.5) * 0.3, z + (rng() - 0.5) * 0.8),
      new THREE.Vector3(x, t, z + (rng() - 0.5) * 0.3),
    ];
  });
  const pos = [];
  const tri = (a, b, c) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  for (let i = 0; i < rows.length - 1; i++) {
    for (let r = 0; r < 2; r++) {
      const a = rows[i][r], b = rows[i + 1][r], c = rows[i][r + 1], d = rows[i + 1][r + 1];
      if ((i + r) % 2) { tri(a, b, d); tri(a, d, c); } else { tri(a, b, c); tri(b, d, c); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function wireHills({ aspect, seed }) {
  const { scene, camera } = cutoutStage({ aspect });
  cutoutLights(scene, { key: 0.6, rim: 2.2, fill: 0.5 });
  const layers = [
    { z: -16, base: 3.4, amp: 3.6, freq: 0.16, fill: scaled(palette.steel, 0.95), edge: scaled(palette.cold, 0.26), r: 0.034 },
    { z: -8, base: 2.0, amp: 2.9, freq: 0.21, fill: palette.char, edge: scaled(palette.bone, 0.24), r: 0.024 },
    { z: 0, base: 0.7, amp: 2.2, freq: 0.27, fill: palette.ink, edge: scaled(palette.bone, 0.34), r: 0.017 },
  ];
  layers.forEach((l, i) => {
    const geo = ridgeGeometry(seed * 31 + i * 7, l.z, l.base, l.amp, l.freq, -5);
    scene.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: l.fill, roughness: 0.95, flatShading: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })));
    scene.add(wireTubes(geo, l.r, new THREE.MeshBasicMaterial({ color: l.edge })));
  });
  return { scene, camera, tint: 0.2 };
}

// ---------------------------------------------------------------------------------------------------
// 8. low-poly pines: clusters at both sides, a few small ones far off in the middle
function lowPolyPines({ aspect, seed }) {
  const { scene, camera } = cutoutStage({ aspect });
  cutoutLights(scene, { key: 0.6, rim: 2.6, fill: 0.45 });
  const rng = mulberry32(seed * 19 + 4);
  const base = pineGeometry();
  const trees = [
    [-11.4, 1.0, 1.35], [-9.4, -1.8, 1.05], [-7.6, 1.6, 0.85], [-12.9, -4.5, 1.2], [-6.1, -3.6, 0.72], [-4.4, -8, 0.6],
    [11.6, 0.6, 1.3], [9.6, -2.2, 1.0], [7.8, 1.4, 0.9], [13.0, -5, 1.15], [6.0, -4.8, 0.7], [4.2, -9, 0.55],
    [-1.6, -14, 0.5], [0.9, -16, 0.45], [2.4, -13, 0.4],
  ];
  for (const [x, z, s] of trees) {
    const depth = clamp01((z + 16) / 18);
    const m = compose(x, 0, z, 0, rng() * Math.PI * 2, 0, s, s * (0.9 + rng() * 0.3), s);
    const geo = base.clone().applyMatrix4(m);
    const fill = palette.ink.clone().lerp(scaled(palette.steel, 0.9), 1 - depth);
    scene.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: fill, roughness: 0.9, flatShading: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })));
    const edge = scaled(palette.bone, 0.14 + 0.2 * depth).lerp(scaled(palette.cold, 0.25), 1 - depth);
    scene.add(wireTubes(geo, 0.012 + (1 - depth) * 0.02, new THREE.MeshBasicMaterial({ color: edge })));
  }
  return { scene, camera, tint: 0.2 };
}

// ---------------------------------------------------------------------------------------------------
// 9. nozzle lanterns: small hot-ends hanging from T-slot posts like path lanterns, glowing amber
function nozzleLanterns({ aspect, seed }) {
  const { scene, camera } = cutoutStage({ aspect });
  cutoutLights(scene, { key: 0.35, rim: 2.0, fill: 0.3 });
  const rng = mulberry32(seed * 29 + 6);
  const frame = new THREE.MeshStandardMaterial({ color: palette.ink, roughness: 0.5, metalness: 0.4 });
  const orange = new THREE.MeshStandardMaterial({ color: palette.vermilion, roughness: 0.5 });
  const steel = new THREE.MeshStandardMaterial({ color: palette.steel, roughness: 0.35, metalness: 0.6 });
  const hot = new THREE.MeshStandardMaterial({ color: palette.amber, emissive: palette.amber, emissiveIntensity: 3 });
  // a path of lanterns at different depths and heights: near ones big at the edges, far ones small
  const lanterns = [[-10.6, 2.8, 3.6], [-6.8, -1.4, 2.7], [-2.2, -9, 3.3], [3.0, -5.2, 2.9], [7.8, 0.2, 4.0], [11.6, 3.0, 2.5]];
  for (const [x, z, h] of lanterns) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.scale.setScalar(1.25);
    const side = x > 0.6 ? -1 : 1; // arms reach towards the middle
    const post = new THREE.Mesh(tSlotGeometry(h + 6, 0.3).rotateX(Math.PI / 2), frame);
    post.position.y = (h - 6) / 2;
    const arm = new THREE.Mesh(tSlotGeometry(0.95, 0.24).rotateY(Math.PI / 2), frame);
    arm.position.set(side * 0.4, h - 0.12, 0);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.34), orange);
    cap.position.set(0, h + 0.03, 0);
    const head = new THREE.Group();
    head.position.set(side * 0.78, h - 0.36, 0);
    const sink = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.3), steel);
    sink.position.y = -0.1;
    const fan = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.33, 0.07), frame);
    fan.position.set(0, -0.1, 0.19);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.017, 6, 20), orange);
    ring.position.set(0, -0.1, 0.23);
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.13, 0.24), orange);
    block.position.y = -0.35;
    const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.13, 8).rotateX(Math.PI), hot);
    nozzle.position.y = -0.48;
    head.add(sink, fan, ring, block, nozzle);
    const tip = new THREE.Vector3(side * 0.78, h - 0.86, 0);
    const light = new THREE.PointLight(palette.amber, 1.4, 3.2, 1.8);
    light.position.copy(tip).add(new THREE.Vector3(0, 0.1, 0.25));
    const glowNear = halo(palette.amber, 1.5, 0.8, 2.6);
    glowNear.position.copy(tip).add(new THREE.Vector3(0, 0.02, 0.3));
    const glowFar = halo(palette.amber, 3.2, 0.07, 1.8);
    glowFar.position.copy(tip).add(new THREE.Vector3(0, 0.2, 0.28));
    g.add(post, arm, cap, head, light, glowNear, glowFar);
    // a few embers rising from the tip
    for (let k = 0; k < 6; k++) {
      const e = halo(palette.amber, 0.08 + rng() * 0.06, 0.9, 1.2);
      e.position.copy(tip).add(new THREE.Vector3((rng() - 0.5) * 0.5, 0.3 + rng() * 1.6, 0.32));
      g.add(e);
    }
    scene.add(g);
  }
  return { scene, camera, tint: 0.25 };
}

// ---------------------------------------------------------------------------------------------------
// 10. orange filament branch: a curling strand rising from the bottom-left corner, side shoots, small
//     printed leaves (layer lines), a hot glowing tip, like the reference's blossom branch
function filamentBranch({ aspect, seed }) {
  const { scene, camera } = cutoutStage({ aspect });
  cutoutLights(scene, { key: 1.2, rim: 2.6, fill: 0.4 });
  const rng = mulberry32(seed * 37 + 8);
  const stemMat = new THREE.MeshStandardMaterial({ color: palette.vermilion, roughness: 0.32, emissive: scaled(palette.vermilion, 0.18) });
  const curl = (cx, cy, z, r, a0, turns, dir) => Array.from({ length: 18 }, (_, k) => {
    const a = a0 + dir * (k / 17) * Math.PI * 2 * turns;
    const rr = r * (1 - (k / 17) * 0.6);
    return new THREE.Vector3(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, z);
  });
  const mainPts = [
    new THREE.Vector3(-13.2, -1.6, 0.6), new THREE.Vector3(-11.4, 1.2, 0.5), new THREE.Vector3(-9.8, 3.6, 0.3),
    new THREE.Vector3(-7.4, 5.5, 0.1), new THREE.Vector3(-4.4, 6.6, -0.1), new THREE.Vector3(-1.2, 6.9, -0.2),
    new THREE.Vector3(1.6, 6.5, -0.2), ...curl(2.4, 5.7, -0.2, 0.9, Math.PI * 0.75, 1.3, -1),
  ];
  const main = new THREE.CatmullRomCurve3(mainPts);
  scene.add(new THREE.Mesh(taperedTube(main, 0.11, 0.025, 260, 10), stemMat));
  const branches = [main];
  [[0.22, 0.9, 1.6, 1], [0.38, -0.2, 2.2, 1], [0.5, 1.1, 1.8, -1], [0.62, 0.4, 2.0, 1], [0.7, -0.8, 1.4, -1]].forEach(([t, bend, len, dir]) => {
    const p0 = main.getPointAt(t);
    const tan = main.getTangentAt(t);
    const p1 = p0.clone().add(new THREE.Vector3(tan.x * len * 0.4 + bend * 0.5, len * 0.55, 0.2 * dir));
    const p2 = p0.clone().add(new THREE.Vector3(tan.x * len * 0.8 + bend, len, 0.3 * dir));
    const pts = [p0, p1, p2, ...curl(p2.x + 0.3 * dir, p2.y - 0.2, p2.z, 0.32, Math.PI * (dir > 0 ? 0.6 : 0.4), 1.1, -dir)];
    const c = new THREE.CatmullRomCurve3(pts);
    branches.push(c);
    scene.add(new THREE.Mesh(taperedTube(c, 0.05, 0.016, 120, 7), stemMat));
  });
  // printed leaves
  const leafShape = new THREE.Shape();
  [[0, 0], [0.13, 0.17], [0.09, 0.36], [0, 0.52], [-0.09, 0.36], [-0.13, 0.17]].forEach(([x, y], i) => (i ? leafShape.lineTo(x, y) : leafShape.moveTo(x, y)));
  leafShape.closePath();
  const leafGeo = new THREE.ExtrudeGeometry(leafShape, { depth: 0.02, bevelEnabled: false });
  const leafMats = [palette.vermilion, palette.vermilion, palette.amber, scaled(palette.bone, 0.9)].map((color, i) =>
    patchMaterial(new THREE.MeshStandardMaterial({ color, roughness: 0.45, side: THREE.DoubleSide }), layerLines(`leaf-${i}`, 0.022, 0.2)));
  for (const c of branches) {
    const n = Math.floor(c.getLength() / 0.42);
    for (let k = 2; k < n - 1; k++) {
      if (rng() < 0.25) continue;
      const p = c.getPointAt(k / n);
      const leaf = new THREE.Mesh(leafGeo, pick(rng, leafMats));
      const s = 0.9 + rng() * 0.8;
      leaf.scale.setScalar(s);
      leaf.position.copy(p);
      leaf.rotation.set((rng() - 0.5) * 1.2, (rng() - 0.5) * 1.4, (rng() < 0.5 ? 1 : -1) * (0.4 + rng() * 1.2));
      scene.add(leaf);
    }
  }
  // the hot tip of the main strand
  const tip = main.getPointAt(1);
  const glow = halo(palette.amber, 0.9, 0.85, 2.4);
  glow.position.copy(tip).add(new THREE.Vector3(0, 0, 0.3));
  scene.add(glow);
  return { scene, camera, tint: 0.2 };
}

export const CUTOUTS = {
  'filament-grass': cutout(2400, 700, filamentGrass),
  'spool-stack': cutout(2400, 900, spoolStack),
  'voxel-stones': cutout(2400, 800, voxelStones),
  'printed-wall': cutout(2400, 800, printedWall),
  ruins: cutout(2400, 900, ruins),
  'support-bushes': cutout(2400, 900, supportBushes),
  'wire-hills': cutout(2400, 900, wireHills),
  'low-poly-pines': cutout(2400, 1000, lowPolyPines),
  'nozzle-lanterns': cutout(2400, 1000, nozzleLanterns),
  'orange-filament-branch': cutout(2400, 1000, filamentBranch),
};
