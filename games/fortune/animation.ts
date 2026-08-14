import * as THREE from "three";

/**
 * Seeks a one-shot clip even after clampWhenFinished has paused its action.
 * AnimationMixer.setTime resets the action time but does not unpause it, which
 * otherwise evaluates the first frame when a completed clip is sought again.
 */
export function seekOneShotClip(
  mixer: THREE.AnimationMixer,
  action: THREE.AnimationAction,
  time: number,
) {
  action.reset().setLoop(THREE.LoopOnce, 1).play();
  action.clampWhenFinished = true;
  mixer.setTime(time);
}
