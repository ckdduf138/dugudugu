import { LocaleRootLayout } from "@/app/_localized/root-layout";
import { rootMetadata, rootViewport } from "@/app/root-config";

export const metadata = rootMetadata;
export const viewport = rootViewport;

// Korean, the default locale, is served without a prefix: /, /ladder/, …
export default function KoreanRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <LocaleRootLayout locale="ko">{children}</LocaleRootLayout>;
}
