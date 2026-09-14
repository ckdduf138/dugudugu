import { describe, expect, it } from "vitest";
import { games } from "@/games/registry";
import { localizedPathname, routing } from "@/i18n/routing";
import vercelConfig from "@/vercel.json";
import { SITE_URL, languageAlternates, localizedPageUrl } from "./site";

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

describe("URL redirects", () => {
  type Rule = {
    source: string;
    destination: string;
    statusCode: number;
    has?: { type: string; value: string }[];
  };
  const rules: Rule[] = vercelConfig.redirects;
  const canonicalHost = new URL(SITE_URL).host;

  // Mirrors Vercel's strict matching for the `:param`, `:param(regex)`, and
  // `has` host conditions used in vercel.json.
  function redirect(pathname: string, host = canonicalHost) {
    for (const rule of rules) {
      if (rule.has?.some((when) => when.type === "host" && when.value !== host)) {
        continue;
      }
      const names: string[] = [];
      const pattern = rule.source.replace(
        /:(\w+)(?:\(([^)]*)\))?/g,
        (_, name: string, custom?: string) => {
          names.push(name);
          return `(${custom ?? "[^/]+"})`;
        },
      );
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

  it("sends the former Vercel host and www to the canonical domain", () => {
    for (const host of ["dugudugu-chameleon.vercel.app", "www.dugupop.com"]) {
      expect(redirect("/", host)).toBe(`${SITE_URL}/`);
      expect(redirect("/en/ladder/", host)).toBe(`${SITE_URL}/en/ladder/`);
    }
    expect(redirect("/ladder/")).toBeNull();

    // An old share link reaches its page in two hops: host, then legacy path.
    const hop = redirect("/ko/games/ladder/", "dugudugu-chameleon.vercel.app");
    expect(hop).toBe(`${SITE_URL}/ko/games/ladder/`);
    expect(redirect(new URL(hop!).pathname)).toBe("/ladder/");
  });

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
