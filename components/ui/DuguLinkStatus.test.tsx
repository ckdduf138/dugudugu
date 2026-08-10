import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DuguLinkStatus } from "./DuguLinkStatus";

vi.mock("next/link", () => ({
  useLinkStatus: () => ({ pending: true }),
}));

afterEach(cleanup);

describe("DuguLinkStatus", () => {
  it("keeps link status ownership but portals the fixed overlay to body", () => {
    const view = render(
      <div data-testid="link-descendant">
        <DuguLinkStatus label="Loading…" title="Ladder Game" />
      </div>,
    );

    expect(view.container.querySelector('[role="status"]')).toBeNull();
    expect(screen.getByRole("status").parentElement).toBe(document.body);
  });
});
