import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { seekOneShotClip } from "./animation";

describe("fortune animation seeking", () => {
  it("keeps the final fracture pose when a completed clip is sought again", () => {
    const cookieHalf = new THREE.Object3D();
    const clip = new THREE.AnimationClip("CrackReveal", 1, [
      new THREE.VectorKeyframeTrack(
        ".position",
        [0, 1],
        [0.135, 0, 0, -0.115, 0, 0],
      ),
    ]);
    const mixer = new THREE.AnimationMixer(cookieHalf);
    const action = mixer.clipAction(clip);

    seekOneShotClip(mixer, action, clip.duration);
    expect(cookieHalf.position.x).toBeCloseTo(-0.115, 5);
    expect(action.paused).toBe(true);

    seekOneShotClip(mixer, action, clip.duration);
    expect(cookieHalf.position.x).toBeCloseTo(-0.115, 5);
  });
});
