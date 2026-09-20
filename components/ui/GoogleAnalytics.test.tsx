import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleAnalytics } from "./GoogleAnalytics";
import { GA_MEASUREMENT_ID } from "@/lib/analytics";

describe("GoogleAnalytics", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    // React hoists <script> into <head>; unmounting leaves the resource there.
    document
      .querySelectorAll('script[src*="gtag/js"], script[id^="gtag-init"]')
      .forEach((script) => script.remove());
  });

  it("ships the gtag loader and its config for the production export", () => {
    vi.stubEnv("NODE_ENV", "production");
    const view = render(<GoogleAnalytics />);

    const scripts = Array.from(
      document.querySelectorAll<HTMLScriptElement>("script"),
    );
    const loader = scripts.find((script) => script.src.includes("gtag/js"));
    const bootstrap = scripts.find((script) =>
      script.textContent?.includes("gtag("),
    );

    expect(loader?.src).toContain(`id=${GA_MEASUREMENT_ID}`);
    expect(loader?.hasAttribute("async")).toBe(true);
    expect(bootstrap?.textContent).toContain(`'config','${GA_MEASUREMENT_ID}'`);

    view.unmount();
  });

  it("stays out of development pages so local play tests never report", () => {
    vi.stubEnv("NODE_ENV", "development");
    const view = render(<GoogleAnalytics />);

    expect(view.container.innerHTML).toBe("");
    expect(document.querySelector('script[src*="gtag/js"]')).toBeNull();
  });
});
