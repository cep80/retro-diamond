import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AnimationClip, AnimationMixer, Bone, Object3D, Quaternion, QuaternionKeyframeTrack, Vector3 } from "three";
import { releaseActorMixer } from "./actor-mixer.ts";

function rig() {
  const root = new Object3D();
  const bone = new Bone();
  bone.name = "upper_armL";
  root.add(bone);
  const q = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), 1.2);
  const track = new QuaternionKeyframeTrack("upper_armL.quaternion", [0, 1], [q.x, q.y, q.z, q.w, q.x, q.y, q.z, q.w]);
  const clip = new AnimationClip("idle_bat", 1, [track]);
  const mixer = new AnimationMixer(root);
  const action = mixer.clipAction(clip);
  return { bone, mixer, action };
}

describe("releaseActorMixer", () => {
  it("survives the StrictMode mount → cleanup → mount cycle and still drives the bone", () => {
    const { bone, mixer, action } = rig();
    action.reset().play();
    releaseActorMixer(mixer);
    assert.doesNotThrow(() => action.reset().play());
    mixer.update(0.1);
    assert.equal(action.isRunning(), true);
    assert.ok(Math.abs(bone.quaternion.z) > 0.5, `bone should be rotated, got z=${bone.quaternion.z}`);
  });

  it("documents why: uncacheRoot leaves the cached action unplayable in three r180", () => {
    const { mixer, action } = rig();
    action.reset().play();
    mixer.stopAllAction();
    mixer.uncacheRoot(mixer.getRoot() as Object3D);
    assert.throws(() => action.reset().play(), /_cacheIndex/);
  });
});
