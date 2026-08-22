import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleSwitcher } from "./LocaleSwitcher";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: () => () => "언어",
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/games/ladder",
  useRouter: () => ({ replace }),
}));

describe("LocaleSwitcher", () => {
  beforeEach(() => {
    replace.mockReset();
    window.history.replaceState(
      {},
      "",
      "/ko/games/ladder?seed=dugu#result",
    );
  });

  afterEach(cleanup);

  it("preserves the current query and hash while switching locale", () => {
    const view = render(<LocaleSwitcher />);

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
