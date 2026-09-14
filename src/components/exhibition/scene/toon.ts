/**
 * Runtime anime material system (first slice): stepped toon shading applied to
 * everything the Blender pipeline exports. Blender shader graphs are not the
 * contract — material roles are, carried by material names (mat_skin,
 * mat_hair, mat_cloth, mat_eyes, mat_equipment, mat_env_*). Blockout assets
 * get flat colors + a shared gradient ramp; the look-dev phase refines this
 * per role (rim light, hair highlight, painted face detail).
 */

import {
  Color,
  DataTexture,
  Mesh,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
  SRGBColorSpace,
  type Object3D,
  type MeshStandardMaterial,
} from "three";
import { isEmissiveLanternMaterial } from "./night";

let sharedRamp: DataTexture | null = null;

/** Three-step ramp. Shadow band stays deep so grass does not lift to daylight. */
export function toonRamp(): DataTexture {
  if (sharedRamp) return sharedRamp;
  const data = new Uint8Array([48, 118, 200, 255]);
  const tex = new DataTexture(data, data.length, 1, RedFormat);
  tex.magFilter = NearestFilter;
  tex.minFilter = NearestFilter;
  tex.needsUpdate = true;
  sharedRamp = tex;
  return tex;
}

/** Replace exported materials with toon equivalents, preserving color/map. */
export function applyToonMaterials(root: Object3D) {
  const ramp = toonRamp();
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    const convert = (m: MeshStandardMaterial) => {
      const rgb: [number, number, number] = m.emissive ? [m.emissive.r, m.emissive.g, m.emissive.b] : [0, 0, 0];
      // Keep lantern glow only. Floodlights ship a strong authored emissive
      // that would relight the park as day if it survived the toon convert.
      const lanternGlow = isEmissiveLanternMaterial(m.name ?? "", rgb);
      const toon = new MeshToonMaterial({
        color: m.color ? m.color.clone() : new Color("#cccccc"),
        map: m.map ?? null,
        gradientMap: ramp,
        transparent: m.transparent,
        opacity: m.opacity,
        side: m.side,
        name: m.name,
        emissive: lanternGlow && m.emissive ? m.emissive.clone() : new Color(0),
        emissiveIntensity: lanternGlow ? (m.emissiveIntensity ?? 1) : 1,
        emissiveMap: lanternGlow ? (m.emissiveMap ?? null) : null,
      });
      // Preserve GLTF alpha handling: MASK -> alphaTest cutout (hair, eyes,
      // lashes), BLEND -> transparent. Without this, VRoid cutout cards render
      // as opaque quads or vanish entirely.
      if (m.alphaTest > 0) {
        toon.alphaTest = m.alphaTest;
      }
      toon.depthWrite = m.depthWrite;
      // Lantern globes keep their authored amber instead of ACES-desaturating
      // to white; the halo sprites are unmapped too, so both agree.
      if (lanternGlow) {
        toon.toneMapped = false;
        // The globe is its emissive. A pale lit base color on top pushed the
        // field lanterns to cream while the frame lanterns stayed amber.
        toon.color.multiplyScalar(0.2);
      }
      if (toon.map) toon.map.colorSpace = SRGBColorSpace;
      const name = m.name ?? `${mesh.name}`;
      // Night darkening for ground surfaces. Grass keeps a little more so the
      // mid-field reads as a dark lawn, not a void; dirt stays warm-dark.
      if (/grass/i.test(name)) toon.color.multiplyScalar(0.4);
      else if (/dirt|infield|chalk|clay/i.test(name)) toon.color.multiplyScalar(0.42);
      return toon;
    };
    if (Array.isArray(mesh.material)) mesh.material = mesh.material.map((m) => convert(m as MeshStandardMaterial));
    else mesh.material = convert(mesh.material as MeshStandardMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
}
