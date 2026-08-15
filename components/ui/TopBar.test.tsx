import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TopBar } from "./TopBar";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("./BrandMark", () => ({
  BrandMark: () => <svg aria-hidden="true" />,
}));

afterEach(cleanup);

describe("TopBar lobby brand", () => {
  it("keeps one clear home destination without utility controls", () => {
    const view = render(<TopBar siteName="Dugudugu" />);

    const header = view.getByRole("banner");
    const home = view.getByRole("link", { name: "Dugudugu" });

    expect(header.className).toContain("z-40");
    expect(home.getAttribute("href")).toBe("/");
    expect(view.queryByRole("button")).toBeNull();
  });
});
