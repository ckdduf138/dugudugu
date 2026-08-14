import type { MetadataRoute } from "next";
import { CANDY_HEX } from "@/lib/design-tokens";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "두구두구 — 귀여운 랜덤 결정 아케이드",
    short_name: "두구두구",
    description:
      "캡슐 뽑기, 사다리타기, 포춘쿠키로 공정하고 귀엽게 결정해요.",
    start_url: "/ko/",
    display: "standalone",
    background_color: "#fff8f2",
    theme_color: CANDY_HEX.coral,
    icons: [
      {
        src: "/brand-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/brand-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
