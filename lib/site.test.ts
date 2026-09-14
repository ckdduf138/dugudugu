import { describe, expect, it } from "vitest";
import { games } from "@/games/registry";
import { localizedPathname, routing } from "@/i18n/routing";
import vercelConfig from "@/vercel.json";
import { languageAlternates, localizedPageUrl } from "./site";

const pathnameOf = (url: string) => new URL(url).pathname;

describe("localized URLs", () => {
  it("serves Korean from the root and prefixes English", () => {
    expect(localizedPathname("ko")).toBe("/");
    expect(localizedPathname("ko", "/ladder")).toBe("/ladder/");
    expect(localizedPathname("en")).toBe("/en/");
    expect(localizedPathname("en", "ladder/")).toBe("/en/ladder/");
    expect(pathnameOf(localizedPageUrl("en", "/draw"))).toBe("/en/draw/");
  });

  it("pairs every locale in hreflang with the Korean root as x-default", () => {
    const languages = languageAlternates("/fortune");

    expect(Object.keys(languages)).toEqual([...routing.locales, "x-default"]);
    expect(pathnameOf(languages.ko)).toBe("/fortune/");
    expect(pathnameOf(languages.en)).toBe("/en/fortune/");
    expect(languages["x-default"]).toBe(languages.ko);
  });
});

describe("legacy URL redirects", () => {
  // Mirrors Vercel's strict source matching for the `:param` rules used here.
  function redirect(pathname: string) {
    for (const rule of vercelConfig.redirects) {
      const names: string[] = [];
      const pattern = rule.source.replace(/:(\w+)/g, (_, name: string) => {
        names.push(name);
        return "([^/]+)";
      });
      const match = new RegExp(`^${pattern}$`).exec(pathname);
      if (!match) continue;

      expect(rule.statusCode).toBe(301);
      return names.reduce(
        (destination, name, index) =>
          destination.replace(`:${name}`, match[index + 1]),
        rule.destination,
      );
    }
    return null;
  }

  it("moves every former /<locale>/games/<slug> page to its canonical URL", () => {
    expect(redirect("/ko/")).toBe("/");
    expect(redirect("/ko")).toBe("/");
    expect(redirect("/en/")).toBeNull();

    for (const { slug } of games) {
      for (const locale of routing.locales) {
        const canonical = localizedPathname(locale, `/${slug}`);
        expect(redirect(`/${locale}/games/${slug}/`)).toBe(canonical);
        expect(redirect(`/${locale}/games/${slug}`)).toBe(canonical);
        expect(redirect(canonical)).toBeNull();
      }
    }
  });
});
