import { LocaleRootLayout } from "@/app/_localized/root-layout";
import { rootMetadata, rootViewport } from "@/app/root-config";

export const metadata = rootMetadata;
export const viewport = rootViewport;

// English keeps its /en prefix and its own root layout, so <html lang> is
// correct in the static HTML. Switching language is a full page load.
export default function EnglishRootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <LocaleRootLayout locale="en">{children}</LocaleRootLayout>;
}
