// Structured-data helpers. The objects are serialized into <script
// type="application/ld+json"> tags so search engines can show rich results.

import { absolutePageUrl, absoluteUrl } from "@/lib/site";

export function websiteJsonLd() {
  const url = absolutePageUrl("/");
  const organizationId = `${url}#organization`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${url}#website`,
        name: "두구두구",
        alternateName: ["Dugudugu", "두구두구 랜덤 아케이드"],
        url,
        inLanguage: ["ko", "en"],
        publisher: { "@id": organizationId },
      },
      {
        "@type": "Organization",
        "@id": organizationId,
        name: "두구두구",
        alternateName: "Dugudugu",
        url,
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl("/brand-icon-512.png"),
          contentUrl: absoluteUrl("/brand-icon-512.png"),
          width: 512,
          height: 512,
        },
      },
    ],
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
