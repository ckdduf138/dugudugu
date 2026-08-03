import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type GlbJson = {
  accessors: Array<{
    count: number;
    min?: number[];
    max?: number[];
  }>;
  animations: Array<{
    name?: string;
    channels: unknown[];
    samplers: Array<{ input: number }>;
  }>;
  nodes: Array<{
    name?: string;
    extras?: {
      interaction_count?: number;
      visual_step_count?: number;
      image_state_count?: number;
      image_state_nodes?: string;
      snap_frame?: number;
    };
  }>;
};

function readGlbJson(): { bytes: number; json: GlbJson } {
  const glb = readFileSync(
    resolve("public/models/fortune/fortune-cookie.glb"),
  );
  expect(glb.toString("utf8", 0, 4)).toBe("glTF");
  const jsonLength = glb.readUInt32LE(12);
  return {
    bytes: glb.byteLength,
    json: JSON.parse(
      glb.subarray(20, 20 + jsonLength).toString("utf8"),
    ) as GlbJson,
  };
}

describe("fortune-cookie authored asset", () => {
  it("ships the web-sourced paper texture within its UI budget", () => {
    const image = readFileSync(
      resolve("public/images/games/fortune-paper-texture-cc0.webp"),
    );
    expect(image.toString("ascii", 0, 4)).toBe("RIFF");
    expect(image.toString("ascii", 8, 12)).toBe("WEBP");
    expect(image.byteLength).toBeLessThan(100_000);
  });

  it("ships the named cookie parts within the delivery budget", () => {
    const { bytes, json } = readGlbJson();
    const nodeNames = json.nodes.map((node) => node.name);

    expect(bytes).toBeLessThan(1_000_000);
    expect(nodeNames).toEqual(
      expect.arrayContaining([
        "CookieRig",
        "CookieMotion",
        "CookieIntact",
        "CookieLeft",
        "CookieRight",
      ]),
    );
    expect(
      nodeNames.some((name) => name?.startsWith("CookieState")),
    ).toBe(false);
    const rig = json.nodes.find((node) => node.name === "CookieRig");
    expect(rig?.extras).toMatchObject({
      interaction_count: 1,
      visual_step_count: 1,
      image_state_count: 2,
      image_state_nodes: "CookieIntact,CookieLeft+CookieRight",
      snap_frame: 11,
    });
  });

  it("contains one continuous authored snap animation", () => {
    const { json } = readGlbJson();
    const clip = json.animations.find(
      (animation) => animation.name === "CrackReveal",
    );
    expect(clip).toBeDefined();
    expect(clip?.channels).toHaveLength(9);

    const timeAccessors =
      clip?.samplers.map((sampler) => json.accessors[sampler.input]) ?? [];
    expect(Math.max(...timeAccessors.map((accessor) => accessor.count))).toBe(
      30,
    );
    expect(
      Math.max(
        ...timeAccessors.map((accessor) => accessor.max?.[0] ?? 0),
      ),
    ).toBeCloseTo(1, 5);
  });
});
