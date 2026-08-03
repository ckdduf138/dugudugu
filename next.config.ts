import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Fully static site — deploy anywhere (Cloudflare Pages / Netlify / GitHub Pages).
  output: "export",
  // next/image optimization requires a server; disable for static export.
  images: { unoptimized: true },
  // Emit /games/draw/index.html etc. so static hosts resolve clean URLs.
  trailingSlash: true,
};

export default withNextIntl(nextConfig);
