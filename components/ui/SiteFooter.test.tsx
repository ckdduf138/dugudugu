import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteFooter } from "./SiteFooter";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: () => (key: string) =>
    key === "site.name" ? "두구두구" : "언어",
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/games/ladder",
  useRouter: () => ({ replace }),
}));

describe("SiteFooter locale switcher", () => {
  beforeEach(() => {
    replace.mockReset();
    window.history.replaceState(
      {},
      "",
      "/ko/games/ladder?seed=dugu#result",
    );
  });

  afterEach(cleanup);

  it("shows both languages and preserves the current query and hash", () => {
    const view = render(<SiteFooter />);

    expect(
      view.getByRole("button", { name: "한국어" }).getAttribute("aria-pressed"),
    ).toBe("true");

    fireEvent.click(view.getByRole("button", { name: "English" }));

    expect(replace).toHaveBeenCalledWith(
      "/games/ladder?seed=dugu#result",
      { locale: "en" },
    );
  });
});
