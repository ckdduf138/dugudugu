// Structured-data helpers. The objects are serialized into <script
// type="application/ld+json"> tags so search engines can show rich results.

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

export function gameJsonLd(opts: {
  name: string;
  description: string;
  url: string;
  locale: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    applicationCategory: "GameApplication",
    name: opts.name,
    description: opts.description,
    url: opts.url,
    inLanguage: opts.locale,
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}
