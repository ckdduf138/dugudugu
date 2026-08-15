import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SiteFooter } from "@/components/ui/SiteFooter";
import {
  rootHtmlClassName,
  rootMetadata,
  rootViewport,
} from "@/app/root-config";
import "../globals.css";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export const metadata = rootMetadata;
export const viewport = rootViewport;

// Pre-render one static tree per locale (/ko, /en).
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Opt into static rendering for this locale.
  setRequestLocale(locale);

  return (
    <html lang={locale} className={rootHtmlClassName}>
      <head>
        <link
          rel="icon"
          href="/brand-icon-192.png"
          type="image/png"
          sizes="192x192"
        />
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
      <body className="min-h-full">
        <NextIntlClientProvider>
          {children}
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
