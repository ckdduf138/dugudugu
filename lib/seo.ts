// Structured-data helpers. The objects are serialized into <script
// type="application/ld+json"> tags so search engines can show rich results.

import { absolutePageUrl } from "@/lib/site";

export type FaqItem = { q: string; a: string };

export function faqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

export function websiteJsonLd() {
  const url = absolutePageUrl("/");

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${url}#website`,
    name: "두구두구",
    alternateName: "Dugudugu",
    url,
    inLanguage: ["ko", "en"],
  };
}

export function gameJsonLd(opts: {
  name: string;
  description: string;
  url: string;
  locale: string;
}) {
  const url = absolutePageUrl(opts.url);

  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${url}#web-application`,
    applicationCategory: "GameApplication",
    name: opts.name,
    description: opts.description,
    url,
    inLanguage: opts.locale,
    operatingSystem: "Web",
    isAccessibleForFree: true,
    isPartOf: { "@id": `${absolutePageUrl("/")}#website` },
    offers: { "@type": "Offer", price: 0 },
  };
}
