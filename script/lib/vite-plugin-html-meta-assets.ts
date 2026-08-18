import type { Plugin } from "vite";
import {
  injectMetaAssetCarriers,
  resolveMetaAssetCarriers,
} from "./htmlMetaAssets";

// The transform itself lives in `./htmlMetaAssets` so it can be unit tested
// without running a build; this only wires the two halves to the hooks that
// bracket Vite's own HTML processing.

/** Fallback origin, matching `script/generate-sitemap.ts`. */
const DEFAULT_ORIGIN = "https://seedbible.org";

export interface HtmlMetaAssetsOptions {
  siteOrigin?: string;
}

/**
 * Makes image URLs in `<meta content="...">` — `og:image` and friends — build
 * like any other HTML asset reference: emitted into `assets/` with a content
 * hash and rewritten to the absolute URL they are served from.
 *
 * Build-only. In dev the paths in `index.html` point at files Vite's static
 * middleware already serves from the project root, so there is nothing to fix.
 */
export function htmlMetaAssetsPlugin(
  options: HtmlMetaAssetsOptions = {}
): Plugin[] {
  const siteOrigin =
    options.siteOrigin ?? process.env.SITE_ORIGIN ?? DEFAULT_ORIGIN;

  // Two plugins rather than one: a plugin carries a single `transformIndexHtml`
  // hook, and this needs to run on both sides of Vite's.
  return [
    {
      name: "vite-plugin-html-meta-assets:pre",
      apply: "build",
      transformIndexHtml: {
        order: "pre",
        handler: (html) => injectMetaAssetCarriers(html),
      },
    },
    {
      name: "vite-plugin-html-meta-assets:post",
      apply: "build",
      transformIndexHtml: {
        order: "post",
        handler: (html) => resolveMetaAssetCarriers(html, { siteOrigin }),
      },
    },
  ];
}
