import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DuguLoader } from "./DuguLoader";

afterEach(cleanup);

describe("DuguLoader", () => {
  it("announces the destination while reserving a full-screen overlay", () => {
    render(
      <DuguLoader
        label="Loading…"
        title="Capsule Draw"
        overlay
        delayed
      />,
    );

    const status = screen.getByRole("status");
    expect(status.textContent).toContain("Capsule Draw");
    expect(status.textContent).toContain("Loading…");
    expect(status.className.split(/\s+/)).toContain("fixed");
    expect(status.className.split(/\s+/)).toContain("dugu-loader-delay");
  });
});
