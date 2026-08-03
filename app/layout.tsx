import type { Metadata, Viewport } from "next";
import { Geist, Jua } from "next/font/google";
import { CANDY_HEX } from "@/lib/design-tokens";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

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

// Set once here so per-page metadata can use relative URLs for OG / canonical.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "두구두구",
  title: {
    default: "두구두구 | 귀여운 랜덤 결정 아케이드",
    template: "%s | 두구두구",
  },
  description:
    "캡슐 뽑기처럼 오늘의 선택을 정하는 귀여운 랜덤 미니게임. 내기, 당번, 팀 나누기, 점심 메뉴를 공정하게 골라보세요.",
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
      "뽑기, 사다리타기, 동물 경주, 포츈쿠키로 공정하고 귀엽게 결정해요.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: CANDY_HEX.pink,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // `lang` is refined per-locale on the client (see LocaleHtmlLang); the static
  // shell defaults to Korean, the primary audience.
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${jua.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
