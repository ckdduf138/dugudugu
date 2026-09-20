import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { GoogleAnalytics } from "@/components/ui/GoogleAnalytics";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { rootHtmlClassName } from "@/app/root-config";
import type { Locale } from "@/i18n/routing";
import "../globals.css";

type Props = Readonly<{
  locale: Locale;
  children: React.ReactNode;
}>;

/** Shared document shell for the Korean root tree and the /en tree. */
export function LocaleRootLayout({ locale, children }: Props) {
  // Opt into static rendering for this locale.
  setRequestLocale(locale);

  return (
    <html lang={locale} className={rootHtmlClassName}>
      <head>
        <GoogleAnalytics />
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
          <LocaleSwitcher />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
