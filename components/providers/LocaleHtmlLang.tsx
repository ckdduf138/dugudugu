"use client";

import { useEffect } from "react";

// The <html> element lives in the root layout (which is locale-agnostic in a
// static export). This keeps document.documentElement.lang in sync with the
// active locale for accessibility and SEO.
export function LocaleHtmlLang({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
