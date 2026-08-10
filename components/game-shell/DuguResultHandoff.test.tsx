import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DuguResultHandoff } from "./DuguResultHandoff";

afterEach(cleanup);

describe("DuguResultHandoff", () => {
  it("keeps the result semantic and the presenter mascot decorative", () => {
    const view = render(
      <DuguResultHandoff>
        <p>Mint capsule</p>
      </DuguResultHandoff>,
    );
    const handoff = view.container.querySelector(
      '[data-dugu-result-handoff="dialog"]',
    );
    const mascot = handoff?.querySelector("img");

    expect(handoff).not.toBeNull();
    expect(mascot?.getAttribute("alt")).toBe("");
    expect(mascot?.getAttribute("src")).toContain(
      "dugu-result-peeker.png",
    );
    expect(mascot?.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(view.getByText("Mint capsule").textContent).toBe("Mint capsule");
  });

  it("uses the compact ribbon composition when requested", () => {
    const view = render(
      <DuguResultHandoff size="ribbon">Fortune</DuguResultHandoff>,
    );
    const handoff = view.container.querySelector(
      '[data-dugu-result-handoff="ribbon"]',
    );
    const mascot = handoff?.querySelector('[aria-hidden="true"]');

    expect(handoff?.className).toContain("pt-7");
    expect(mascot?.className).toContain("right-4");
    expect(mascot?.className).toContain("top-1");
  });

  it("allows an inline result to tune the mascot overlap", () => {
    const view = render(
      <DuguResultHandoff size="ribbon" mascotClassName="-top-1">
        Fortune
      </DuguResultHandoff>,
    );

    expect(
      view.container
        .querySelector('[data-dugu-result-handoff="ribbon"] [aria-hidden="true"]')
        ?.className,
    ).toContain("-top-1");
  });
});
