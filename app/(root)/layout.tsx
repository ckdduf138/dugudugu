import {
  rootHtmlClassName,
  rootMetadata,
  rootViewport,
} from "@/app/root-config";
import "../globals.css";

export const metadata = rootMetadata;
export const viewport = rootViewport;

export default function RedirectRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={rootHtmlClassName}>
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
