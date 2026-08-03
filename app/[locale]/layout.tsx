import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { LocaleHtmlLang } from "@/components/providers/LocaleHtmlLang";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

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
    <NextIntlClientProvider>
      <LocaleHtmlLang locale={locale} />
      {children}
    </NextIntlClientProvider>
  );
}
