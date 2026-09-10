import { describe, expect, it } from "vitest";
import { gameJsonLd } from "./seo";

describe("gameJsonLd", () => {
  it("includes localized discovery terms and product features when supplied", () => {
    const data = gameJsonLd({
      name: "사다리타기",
      description: "무료 온라인 사다리타기 게임",
      url: "/ko/games/ladder",
      locale: "ko",
      alternateName: ["두구두구 사다리타기", "온라인 사다리 게임"],
      featureList: ["2–6명 사다리타기", "회원가입과 설치 없이 바로 이용"],
    });

    expect(data).toMatchObject({
      "@type": "WebApplication",
      name: "사다리타기",
      alternateName: ["두구두구 사다리타기", "온라인 사다리 게임"],
      featureList: ["2–6명 사다리타기", "회원가입과 설치 없이 바로 이용"],
      inLanguage: "ko",
      isAccessibleForFree: true,
    });
    expect(new URL(data.url).pathname).toBe("/ko/games/ladder/");
  });

  it("omits optional discovery fields for games without them", () => {
    const data = gameJsonLd({
      name: "포춘쿠키",
      description: "랜덤 포춘쿠키",
      url: "/ko/games/fortune",
      locale: "ko",
    });

    expect(data).not.toHaveProperty("alternateName");
    expect(data).not.toHaveProperty("featureList");
  });
});
