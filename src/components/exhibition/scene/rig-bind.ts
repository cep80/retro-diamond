/**
 * Drop-in bind for replacement hero GLBs (Tencent Hunyuan, Mixamo, VRM).
 *
 * The exhibition plays contract clip names (`idle_bat`, `swing_contact`, …)
 * and grips props on `hand.R` / `hand.L`. Tencent / Mixamo / VRM exports
 * rarely use those strings. This module maps the common aliases onto the
 * contract so a swapped `aoi.glb` / `reina.glb` binds without a code change.
 *
 * Drop-in: replace `public/models/diamond-shine/{aoi,reina}.glb`, bump the
 * `?v=` on that URL in `manifest.json`, keep markers
 * `swing_contact.contact = 0.6667` and `pitch_delivery.release = 0.9167`.
 * Budget stays ~28.5k tris / ~3 MB. Do not serve a second music bus.
 */

export const HERO_BUDGET = { triangles: 28_500, bytes: 3_000_000 } as const;
export const HERO_HEIGHT_M = 1.62;

export const CONTRACT_BONES = [
  "root",
  "hips",
  "spine",
  "chest",
  "neck",
  "head",
  "shoulder.L",
  "upper_arm.L",
  "forearm.L",
  "hand.L",
  "shoulder.R",
  "upper_arm.R",
  "forearm.R",
  "hand.R",
  "thigh.L",
  "shin.L",
  "foot.L",
  "thigh.R",
  "shin.R",
  "foot.R",
] as const;

export type ContractBone = (typeof CONTRACT_BONES)[number];

/** Incoming names that mean the same bone. First entry is the contract name. */
const BONE_ALIASES: Record<ContractBone, readonly string[]> = {
  root: ["root", "Armature", "ArmatureRoot"],
  hips: ["hips", "Hips", "mixamorig:Hips", "J_Bip_C_Hips", "pelvis", "Pelvis", "Bone_Hips"],
  spine: ["spine", "Spine", "mixamorig:Spine", "J_Bip_C_Spine"],
  chest: ["chest", "Spine1", "Spine2", "mixamorig:Spine1", "mixamorig:Spine2", "J_Bip_C_Chest", "J_Bip_C_UpperChest", "spine2", "spine3"],
  neck: ["neck", "Neck", "mixamorig:Neck", "J_Bip_C_Neck"],
  head: ["head", "Head", "mixamorig:Head", "J_Bip_C_Head"],
  "shoulder.L": ["shoulder.L", "LeftShoulder", "mixamorig:LeftShoulder", "J_Bip_L_Shoulder", "left_collar"],
  "upper_arm.L": ["upper_arm.L", "LeftArm", "mixamorig:LeftArm", "J_Bip_L_UpperArm", "left_shoulder", "Bone_LeftUpperArm"],
  "forearm.L": ["forearm.L", "LeftForeArm", "mixamorig:LeftForeArm", "J_Bip_L_LowerArm", "left_elbow", "Bone_LeftLowerArm"],
  "hand.L": ["hand.L", "LeftHand", "mixamorig:LeftHand", "J_Bip_L_Hand", "left_wrist", "Bone_LeftHand"],
  "shoulder.R": ["shoulder.R", "RightShoulder", "mixamorig:RightShoulder", "J_Bip_R_Shoulder", "right_collar"],
  "upper_arm.R": ["upper_arm.R", "RightArm", "mixamorig:RightArm", "J_Bip_R_UpperArm", "right_shoulder", "Bone_RightUpperArm"],
  "forearm.R": ["forearm.R", "RightForeArm", "mixamorig:RightForeArm", "J_Bip_R_LowerArm", "right_elbow", "Bone_RightLowerArm"],
  "hand.R": ["hand.R", "RightHand", "mixamorig:RightHand", "J_Bip_R_Hand", "right_wrist", "Bone_RightHand"],
  "thigh.L": ["thigh.L", "LeftUpLeg", "mixamorig:LeftUpLeg", "J_Bip_L_UpperLeg", "left_hip", "Bone_LeftUpperLeg"],
  "shin.L": ["shin.L", "LeftLeg", "mixamorig:LeftLeg", "J_Bip_L_LowerLeg", "left_knee", "Bone_LeftLowerLeg"],
  "foot.L": ["foot.L", "LeftFoot", "mixamorig:LeftFoot", "J_Bip_L_Foot", "left_ankle", "Bone_LeftFoot"],
  "thigh.R": ["thigh.R", "RightUpLeg", "mixamorig:RightUpLeg", "J_Bip_R_UpperLeg", "right_hip", "Bone_RightUpperLeg"],
  "shin.R": ["shin.R", "RightLeg", "mixamorig:RightLeg", "J_Bip_R_LowerLeg", "right_knee", "Bone_RightLowerLeg"],
  "foot.R": ["foot.R", "RightFoot", "mixamorig:RightFoot", "J_Bip_R_Foot", "right_ankle", "Bone_RightFoot"],
};

/**
 * Clip names the mixer plays. Extra aliases cover Tencent / Mixamo exports
 * that ship `Idle` / `Armature|Swing` instead of the contract string.
 */
export const CLIP_ALIASES: Record<string, readonly string[]> = {
  idle_bat: ["idle_bat", "batter_idle", "aoi_idle", "idle", "Idle"],
  swing_contact: ["swing_contact", "swing", "Swing", "aoi_swing"],
  swing_power: ["swing_power", "power_swing", "SwingPower"],
  bunt: ["bunt", "Bunt"],
  take: ["take", "Take", "check"],
  react_success: ["react_success", "success"],
  react_disappoint: ["react_disappoint", "disappoint"],
  run: ["run", "Run"],
  idle_set: ["idle_set", "pitcher_idle", "reina_idle", "set", "idle", "Idle"],
  pitch_delivery: ["pitch_delivery", "pitch", "delivery", "throw", "Pitch"],
  follow_through: ["follow_through", "followthrough"],
  react_restrained: ["react_restrained", "restrained"],
  idle_crouch: ["idle_crouch", "crouch", "catcher_idle", "idle", "Idle"],
  catch_receive: ["catch_receive", "catch", "receive", "Catch"],
};

export function normRigName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/^mixamorig/, "");
}

export function compactBoneName(nodeName: string): string | null {
  const bone = resolveBone(nodeName);
  return bone ? bone.replaceAll(".", "") : null;
}

export function resolveBone(nodeName: string): ContractBone | null {
  const n = normRigName(nodeName);
  if (!n) return null;
  for (const bone of CONTRACT_BONES) {
    if (BONE_ALIASES[bone].some((alias) => normRigName(alias) === n)) return bone;
    if (normRigName(bone) === n) return bone;
    if (normRigName(bone.replaceAll(".", "")) === n) return bone;
  }
  return null;
}

export function matchesContractBone(nodeName: string, contract: string): boolean {
  if (nodeName === contract) return true;
  if (normRigName(nodeName) === normRigName(contract)) return true;
  const resolved = resolveBone(nodeName);
  return resolved === contract || (resolved != null && normRigName(resolved) === normRigName(contract));
}

/** Strip `Armature|` / `mixamo.com|` prefixes Mixamo and Tencent exporters add. */
export function stripClipPrefix(name: string): string {
  const cut = name.lastIndexOf("|");
  return cut >= 0 ? name.slice(cut + 1) : name;
}

export function findClipName(available: readonly string[], contract: string): string | null {
  if (available.includes(contract)) return contract;
  const aliases = CLIP_ALIASES[contract] ?? [contract];
  for (const name of available) {
    const stripped = stripClipPrefix(name);
    if (aliases.some((alias) => normRigName(alias) === normRigName(stripped) || normRigName(alias) === normRigName(name))) {
      return name;
    }
  }
  return null;
}

/**
 * Rewrite a glTF track path onto the compact contract bone.
 * Returns null to drop the track (`.scale`, Mixamo extras, unknown nodes).
 */
export function rewriteTrackName(trackName: string): string | null {
  const dot = trackName.lastIndexOf(".");
  if (dot < 0) return null;
  const node = trackName.slice(0, dot);
  const prop = trackName.slice(dot + 1);
  if (prop === "scale") return null;
  const compact = compactBoneName(node);
  if (!compact) return null;
  return `${compact}.${prop}`;
}

/** Scale only when the export is clearly not meters (cm-ish or doll-sized). */
export function heroFitScale(bboxHeightM: number): number {
  if (!Number.isFinite(bboxHeightM) || bboxHeightM <= 0) return 1;
  if (bboxHeightM >= 8 || bboxHeightM < 0.4) return HERO_HEIGHT_M / bboxHeightM;
  return 1;
}

export function heroOverBudget(opts: { triangles?: number; bytes?: number }): boolean {
  return (opts.triangles ?? 0) > HERO_BUDGET.triangles || (opts.bytes ?? 0) > HERO_BUDGET.bytes;
}
