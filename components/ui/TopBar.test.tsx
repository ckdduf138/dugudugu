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

vi.mock("./LanguageSwitcher", () => ({
  LanguageSwitcher: () => <button type="button">Language</button>,
}));

vi.mock("./SoundToggle", () => ({
  SoundToggle: ({ label }: { label: string }) => (
    <button type="button">{label}</button>
  ),
}));

vi.mock("./BrandMark", () => ({
  BrandMark: () => <svg aria-hidden="true" />,
}));

afterEach(cleanup);

describe("TopBar result navigation", () => {
  it("marks the existing lobby link as persistent navigation above results", () => {
    const view = render(
      <TopBar
        siteName="Dugudugu"
        soundLabel="Sound"
        backHref="/"
        backLabel="Back to lobby"
      />,
    );

    const header = view.getByRole("banner");
    const back = view.getByRole("link", { name: "Back to lobby" });

    expect(header.dataset.resultDialogNavigation).toBe("true");
    expect(header.className).toContain("z-40");
    expect(back.getAttribute("href")).toBe("/");
    expect(back.closest("[data-result-dialog-navigation]")).toBe(header);
    expect(back.closest("[inert], [aria-hidden='true']")).toBeNull();
    expect(back.parentElement?.className).toContain("pointer-events-auto");
  });
});
