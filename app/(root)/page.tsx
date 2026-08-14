import { routing } from "@/i18n/routing";
import { JsonLd } from "@/components/ui/JsonLd";
import { websiteJsonLd } from "@/lib/seo";
import { absolutePageUrl } from "@/lib/site";

// The root path "/" has no locale. Static export can't run middleware, so we
// emit a tiny static page that forwards to the default locale. The <meta
// refresh> (hoisted into <head> by React 19) works even without JS, and the
// link is a no-JS fallback.
export default function RootPage() {
  const target = `/${routing.defaultLocale}/`;
  const canonical = absolutePageUrl(target);
  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${target}`} />
      <link rel="canonical" href={canonical} />
      <JsonLd data={websiteJsonLd()} />
      <main className="grid min-h-screen place-items-center">
        <h1 className="sr-only">두구두구</h1>
        <a className="toy-btn" href={target}>
          들어가기 / Enter
        </a>
      </main>
    </>
  );
}
