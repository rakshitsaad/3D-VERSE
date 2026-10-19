// Growth around the path: instanced wireframe-ish pines, filament "grass" swaying in the vertex shader,
// and small rocks built from voxel cubes.
import * as THREE from 'three';
import { compose, mergeParts, mulberry32, patchMaterial } from './utils.js';
import { pathClearance } from './camera-path.js';

function pineGeometry() {
  const tiers = [[1.7, 2.6, 2.1], [1.3, 2.3, 3.5], [0.9, 2.0, 4.8], [0.5, 1.5, 5.9]];
  return mergeParts([
    ...tiers.map(([r, h, y], i) => ({ geometry: new THREE.ConeGeometry(r, h, 6, 1), matrix: compose(0, y, 0, 0, i * 0.5, 0) })),
    { geometry: new THREE.CylinderGeometry(0.12, 0.18, 1.6, 5), matrix: compose(0, 0.8, 0) },
  ]);
}

export function createNature({ palette, quality }, terrain) {
  const group = new THREE.Group();
  group.name = 'nature';
  const rng = mulberry32(23);
  const m = new THREE.Matrix4();

  // pines: a dark solid body under a faint bone wireframe
  const treeGeo = pineGeometry();
  const solid = new THREE.InstancedMesh(treeGeo, new THREE.MeshLambertMaterial({
    color: palette.ink, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
  }), quality.trees);
  const wire = new THREE.InstancedMesh(treeGeo, new THREE.MeshBasicMaterial({
    color: palette.bone, wireframe: true, transparent: true, opacity: 0.14, depthWrite: false,
  }), quality.trees);
  let placed = 0;
  for (let guard = 0; placed < quality.trees && guard < 6000; guard++) {
    const x = (rng() * 2 - 1) * 60;
    const z = 22 - rng() * 95;
    const clear = z > -12 ? 8.5 : z > -32 ? 21 : 15; // keep the stairs, gate, hall and moon clear
    if (Math.abs(x) < clear) continue;
    const s = 0.75 + rng() * 0.9;
    if (pathClearance(x, z) < 1.7 * s + 1.5) continue; // and the camera's way through

    compose(x, terrain.heightAt(x, z) - 0.2, z, 0, rng() * Math.PI * 2, 0, s, s * (0.85 + rng() * 0.45), s, 'XYZ', m);
    solid.setMatrixAt(placed, m);
    wire.setMatrixAt(placed, m);
    placed++;
  }
  solid.count = wire.count = placed;
  solid.computeBoundingSphere();
  wire.computeBoundingSphere();

  // filament grass: thin strands with a resting curve and a slow sway, darker at the root
  const uTime = { value: 0 };
  const strand = new THREE.PlaneGeometry(0.035, 1, 1, 4).translate(0, 0.5, 0);
  const grassMat = patchMaterial(new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), {
    key: 'filament-grass',
    uniforms: { uTime },
    header: 'uniform float uTime; varying float vH;',
    beginVertex: /* glsl */ `
      vH = position.y;
      float h2 = position.y * position.y;
      float ph = instanceMatrix[3][0] * 0.37 + instanceMatrix[3][2] * 0.29;
      transformed.z += 0.22 * h2;
      transformed.x += sin(uTime * 1.4 + ph) * 0.1 * h2;
      transformed.z += cos(uTime * 1.1 + ph * 1.3) * 0.05 * h2;`,
    color: 'diffuseColor.rgb *= mix(0.3, 1.0, vH);',
  });
  const grass = new THREE.InstancedMesh(strand, grassMat, quality.grass);
  const grassColors = [
    palette.cold.clone().multiplyScalar(0.32),
    palette.bone.clone().multiplyScalar(0.2),
    palette.steel.clone().multiplyScalar(1.5),
  ];
  for (let i = 0; i < quality.grass; i++) {
    const side = rng() < 0.5 ? -1 : 1;
    let x, z;
    if (rng() < 0.7) { x = side * (4.4 + rng() * 7); z = 18 - rng() * 22; } // flanking the stairs
    else { x = side * (6.5 + rng() * 14); z = -5 - rng() * 12; }            // plateau between gate and hall
    const h = 0.35 + rng() * 0.6;
    compose(x, terrain.heightAt(x, z) - 0.05, z, (rng() - 0.5) * 0.3, rng() * Math.PI * 2, 0, 1, h, 1, 'XYZ', m);
    grass.setMatrixAt(i, m);
    const r = rng();
    grass.setColorAt(i, r < 0.05 ? palette.vermilion : r < 0.08 ? palette.amber : grassColors[Math.floor(rng() * 3)]);
  }
  grass.computeBoundingSphere();

  // voxel rocks: small stacks of cubes along the path
  const rockMat = new THREE.MeshLambertMaterial({ color: palette.steel });
  const rocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), rockMat, quality.rocks * 6);
  let r = 0;
  for (let k = 0; k < quality.rocks; k++) {
    const side = k % 2 ? 1 : -1;
    let cx, cz, tries = 0;
    do {
      cx = side * (5 + rng() * 11);
      cz = 17 - rng() * 32;
    } while (pathClearance(cx, cz) < 2.4 && ++tries < 50);
    const ground = terrain.heightAt(cx, cz);
    for (let j = 0; j < 6; j++) {
      const s = 0.22 + rng() * 0.5;
      const layer = j < 3 ? 0 : j < 5 ? 1 : 2;
      const x = cx + (rng() - 0.5) * (1.2 - layer * 0.4);
      const z = cz + (rng() - 0.5) * (1.2 - layer * 0.4);
      const y = ground + s * 0.45 + layer * 0.32;
      rocks.setMatrixAt(r++, compose(x, y, z, (rng() - 0.5) * 0.3, rng() * 1.5, (rng() - 0.5) * 0.3, s, s, s, 'XYZ', m));
    }
  }
  rocks.computeBoundingSphere();

  group.add(solid, wire, grass, rocks);
  return {
    group,
    update(state) { uTime.value = state.time; },
  };
}
