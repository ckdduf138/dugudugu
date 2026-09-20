/**
 * Google Analytics 4 measurement ID for the dugupop.com web stream.
 * Measurement IDs are public by design; they ship inside the page HTML.
 */
export const GA_MEASUREMENT_ID = "G-7X97EZP2RM";

/** The gtag.js loader URL for the stream, shared by the tag and any preconnect. */
export const gtagScriptUrl = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;

/** Bootstrap that queues `gtag` calls before the loader finishes. */
export const gtagBootstrap = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');`;
