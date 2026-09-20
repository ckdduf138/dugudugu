import { GA_MEASUREMENT_ID, gtagBootstrap, gtagScriptUrl } from "@/lib/analytics";

/**
 * GA4 gtag.js, rendered straight into the prerendered <head> of both locale
 * trees. The static export has no server runtime, so the tag has to be part of
 * the HTML rather than injected by a server component boundary. Enhanced
 * measurement reports client-side route changes, so no manual page_view is
 * sent on navigation.
 *
 * `next dev` is left untagged so local play tests never reach the property.
 */
export function GoogleAnalytics() {
  if (process.env.NODE_ENV !== "production") return null;

  return (
    <>
      <link rel="preconnect" href="https://www.googletagmanager.com" />
      <script async src={gtagScriptUrl} />
      <script
        id={`gtag-init-${GA_MEASUREMENT_ID}`}
        dangerouslySetInnerHTML={{ __html: gtagBootstrap }}
      />
    </>
  );
}
