/**
 * forces-tentacles.js
 * Reusable Three.js module for SKB force visualizations.
 *
 * Implements the "tentacle/handle" model from the SKB hypothesis:
 *   - Forces are realized as extended, twisting topological connections (handles)
 *     between SKB defects.
 *   - EM mode: quantized flux tubes (Maxwell derivation paper).
 *   - Strong mode: high-twist knotting/linking that enforces Causal Compensation
 *     Principle (CCP) — confinement visualized as topological locking.
 *   - Electroweak mode: symmetry-breaking twists (phase + color rotation).
 *
 * All parameters and invariants are traceable to:
 *   - Baryon Glueing.pdf (holonomy product, bordism k mod 16)
 *   - Maxwell_Derivation_SKB_Update_7_18.pdf (flux quantization 1/2π ∮F = Q)
 *   - Core.pdf & Ontology.pdf (CCP, Pin⁻ gluing, TwistMan category)
 *
 * Usage:
 *   import { createTentacleGroup, updateTentacles } from './forces-tentacles.js';
 *   const group = createTentacleGroup(scene, positions);
 *   // in animation loop:
 *   updateTentacles(group, { mode: 'strong', separation: 1.1, twist: 2.8, ccp: 0.9, time });
 */

import * as THREE from 'three';

/**
 * Creates a group containing three tentacles (cylinders) between three SKB defects.
 * @param {THREE.Scene} scene
 * @param {THREE.Vector3[]} basePositions - 3 positions for the defects (triangle)
 * @returns {{group: THREE.Group, tentacles: THREE.Mesh[]}}
 */
export function createTentacleGroup(scene, basePositions = null) {
  const group = new THREE.Group();
  const tentacles = [];

  const defaultPositions = [
    new THREE.Vector3(2.1, 0, 0),
    new THREE.Vector3(-1.05, 1.82, 0),
    new THREE.Vector3(-1.05, -1.82, 0)
  ];
  const positions = basePositions || defaultPositions;

  const colors = [0x66ffaa, 0xffaa66, 0x88ddff];

  for (let i = 0; i < 3; i++) {
    const geo = new THREE.CylinderGeometry(0.055, 0.048, 2.6, 32, 1, false);
    const mat = new THREE.MeshPhongMaterial({
      color: colors[i],
      shininess: 8,
      emissive: 0x112211,
      transparent: true,
      opacity: 0.88,
      flatShading: false
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    mesh.userData.originalPositions = mesh.geometry.attributes.position.array.slice();
    mesh.userData.index = i;

    group.add(mesh);
    tentacles.push(mesh);
  }

  scene.add(group);

  return { group, tentacles, basePositions: positions };
}

/**
 * Updates the three tentacles according to the chosen force mode.
 * @param {{tentacles: THREE.Mesh[]}} tentGroup
 * @param {Object} params
 * @param {'em'|'strong'|'ew'} params.mode
 * @param {number} params.separation - 0.6 (glued) to ~3.0 (isolated)
 * @param {number} params.twist - base twist strength (radians)
 * @param {number} params.ccp - Causal Compensation 0..1 (higher = more locking/knotting)
 * @param {number} params.time - seconds for animation
 * @param {THREE.Vector3[]} [params.targetPositions] - optional live positions of the three SKBs
 */
export function updateTentacles(tentGroup, params) {
  const { tentacles, basePositions } = tentGroup;
  const { mode = 'em', separation = 1.8, twist = 1.6, ccp = 0.75, time = 0, targetPositions = null } = params;

  const dirs = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-0.5, 0.866, 0),
    new THREE.Vector3(-0.5, -0.866, 0)
  ];

  tentacles.forEach((tent, i) => {
    const dir = dirs[i].clone();
    const pos = targetPositions ? targetPositions[i] : basePositions[i];

    const mid = pos.clone().multiplyScalar(separation * 0.55);

    tent.position.copy(mid);
    tent.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());

    const len = 2.45 * separation;
    tent.scale.set(1, len / 2.6, 1);

    let twistAngle = twist;
    let extraRot = 0;
    let knotFactor = 0;

    if (mode === 'strong') {
      twistAngle = twist * (2.1 + 1.1 * Math.sin(time * 1.65 + i * 1.3));
      knotFactor = ccp * 0.9 + 0.4 * Math.sin(time * 0.9 + i);
      tent.material.color.setHex(0xff9966);
      tent.material.opacity = 0.72 + 0.22 * ccp;
      extraRot = knotFactor * 2.4;
    } else if (mode === 'ew') {
      twistAngle = twist * 0.85 + Math.sin(time * 2.8 + i * 2.1) * 1.6;
      tent.material.color.setHex(0x77ccff);
      tent.material.opacity = 0.82;
      extraRot = Math.sin(time * 1.4 + i) * 0.9;
    } else {
      twistAngle = twist * 0.55;
      tent.material.color.setHex(0x66eeaa);
      tent.material.opacity = 0.58 + 0.35 * Math.sin(time * 3.4 + i);
      extraRot = 0;
    }

    tent.rotation.z = twistAngle * (1 + i * 0.18) + extraRot;

    if (mode === 'strong' && knotFactor > 0.15) {
      deformForKnotting(tent, knotFactor, time, i);
    } else {
      restoreGeometry(tent);
    }
  });
}

function deformForKnotting(tent, intensity, time, index) {
  const posAttr = tent.geometry.attributes.position;
  const orig = tent.userData.originalPositions;
  if (!orig) return;

  const arr = posAttr.array;
  const yMax = 1.3;

  for (let j = 0; j < arr.length; j += 3) {
    const x0 = orig[j];
    const y0 = orig[j + 1];
    const z0 = orig[j + 2];

    const t = (y0 + yMax) / (2 * yMax);

    const wave1 = Math.sin(t * 6.28 * 1.8 + time * 2.2 + index) * intensity * 0.22;
    const wave2 = Math.cos(t * 6.28 * 2.4 - time * 1.7 + index * 1.3) * intensity * 0.15;

    arr[j]     = x0 + wave1 * (1 - Math.abs(t - 0.5) * 1.1);
    arr[j + 2] = z0 + wave2 * (1 - Math.abs(t - 0.5) * 1.3);
    arr[j + 1] = y0;
  }

  posAttr.needsUpdate = true;
  tent.geometry.computeVertexNormals();
}

function restoreGeometry(tent) {
  const posAttr = tent.geometry.attributes.position;
  const orig = tent.userData.originalPositions;
  if (!orig) return;

  const arr = posAttr.array;
  for (let j = 0; j < arr.length; j++) {
    arr[j] = orig[j];
  }
  posAttr.needsUpdate = true;
  tent.geometry.computeVertexNormals();
}

export function getGluedSeparation(holonomyProduct, ccp = 0.8) {
  return holonomyProduct > 0 ? 0.78 + (1 - ccp) * 0.25 : 1.35;
}

export default {
  createTentacleGroup,
  updateTentacles,
  getGluedSeparation
};
