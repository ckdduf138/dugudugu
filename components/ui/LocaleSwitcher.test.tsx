import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleSwitcher } from "./LocaleSwitcher";

const route = vi.hoisted(() => ({
  locale: "ko",
  pathname: "/ladder/",
  replace: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useLocale: () => route.locale,
  useTranslations: () => () => "언어",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: route.replace }),
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => route.pathname,
}));

describe("LocaleSwitcher", () => {
  beforeEach(() => {
    route.replace.mockReset();
  });

  afterEach(cleanup);

  it("links Korean pages at the root to their /en counterparts", () => {
    route.locale = "ko";
    route.pathname = "/ladder/";
    window.history.replaceState({}, "", "/ladder/?seed=dugu#result");
    const view = render(<LocaleSwitcher />);

    const korean = view.getByRole("link", { name: "한국어" });
    const english = view.getByRole("link", { name: "English" });

    expect(korean.getAttribute("href")).toBe("/ladder/");
    expect(korean.getAttribute("aria-current")).toBe("true");
    expect(english.getAttribute("href")).toBe("/en/ladder/");
    expect(english.getAttribute("hreflang")).toBe("en");
    expect(english.hasAttribute("aria-current")).toBe(false);
  });

  it("preserves the current query and hash while switching locale", () => {
    route.locale = "ko";
    route.pathname = "/ladder/";
    window.history.replaceState({}, "", "/ladder/?seed=dugu#result");
    const view = render(<LocaleSwitcher />);

    fireEvent.click(view.getByRole("link", { name: "English" }));

    expect(route.replace).toHaveBeenCalledWith("/en/ladder/?seed=dugu#result");
  });

  it("returns English pages to the unprefixed Korean URL", () => {
    route.locale = "en";
    route.pathname = "/";
    window.history.replaceState({}, "", "/en/");
    const view = render(<LocaleSwitcher />);

    const korean = view.getByRole("link", { name: "한국어" });
    expect(korean.getAttribute("href")).toBe("/");

    fireEvent.click(view.getByRole("link", { name: "English" }));
    expect(route.replace).not.toHaveBeenCalled();

    fireEvent.click(korean);
    expect(route.replace).toHaveBeenCalledWith("/");
  });
});
