import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MascotPeek } from "./MascotPeek";

afterEach(cleanup);

const labels = {
  openLabel: "Say hello to Dugu",
  closeLabel: "Close Dugu's introduction",
  greeting: "Hi, I'm Dugu!",
  introduction: "I make every choice a tiny game.",
};

describe("MascotPeek", () => {
  it("keeps the introduction optional and toggles it from a named button", () => {
    render(<MascotPeek {...labels} />);

    const button = screen.getByRole("button", { name: labels.openLabel });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("status")).toBeNull();

    fireEvent.click(button);

    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.getAttribute("aria-label")).toBe(labels.closeLabel);
    expect(screen.getByRole("status").textContent).toContain(labels.greeting);
    expect(screen.getByRole("status").textContent).toContain(
      labels.introduction,
    );

    fireEvent.keyDown(button, { key: "Escape" });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("status")).toBeNull();
  });
});
