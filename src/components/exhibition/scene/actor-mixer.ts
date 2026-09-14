import type { AnimationMixer } from "three";

/**
 * Release a character mixer when its actor unmounts.
 *
 * Deliberately `stopAllAction()` only. `mixer.uncacheRoot(scene)` evicts the
 * bindings but (three r180) leaves each evicted binding with a stale
 * `_cacheIndex`; the very next `action.play()` on the same action objects
 * takes the "forgotten action" rebind path and throws inside
 * `_lendBinding` (`Cannot set properties of undefined (setting '_cacheIndex')`).
 * React StrictMode runs exactly that sequence (mount → cleanup → mount) on the
 * memoized mixer, and the swallowed throw left every character in bind pose.
 * Evidence: the ?debug=1 dump in CharacterActor (40/40 tracks bound, mixer
 * with 1 cached binding and 0 active actions, upper_armL at identity).
 */
export function releaseActorMixer(mixer: AnimationMixer): void {
  mixer.stopAllAction();
}
