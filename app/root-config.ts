import type { Metadata, Viewport } from "next";
import { Geist, Jua } from "next/font/google";
import { CANDY_HEX } from "@/lib/design-tokens";
import { SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jua = Jua({
  variable: "--font-jua",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const rootHtmlClassName =
  `${geistSans.variable} ${jua.variable} h-full antialiased`;

export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  verification: {
    google: "V0LWQEMkzQlQoG6mGSp1UFldKcpsvuxhbgMof6G0fUE",
  },
  applicationName: "두구두구",
  title: {
    default: "두구두구 | 귀여운 랜덤 결정 아케이드",
    template: "%s | 두구두구",
  },
  description:
    "무료 사다리타기 게임, 캡슐 뽑기, 복불복 랜덤 선택, 포츈쿠키를 공정하고 귀엽게 즐기는 두구두구.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "두구두구",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    siteName: "두구두구",
    title: "두구두구 — 귀여운 랜덤 결정 아케이드",
    description:
      "캡슐 뽑기, 사다리타기, 포츈쿠키로 공정하고 귀엽게 결정해요.",
    images: [
      {
        url: "/images/brand/social-card.png",
        width: 1200,
        height: 630,
        alt: "두구두구 — 뽑기, 사다리타기, 포츈쿠키",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/images/brand/social-card.png"],
  },
};

export const rootViewport: Viewport = {
  themeColor: CANDY_HEX.coral,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
