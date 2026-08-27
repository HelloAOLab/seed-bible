import type { Plugin } from "vite";
import fs from "fs";
import path from "path";
import { transform } from "esbuild";
import {
  injectCriticalStyles,
  isNonCriticalStylesheetId,
  makeStylesheetsNonBlocking,
} from "./inlineCriticalCss";

const INLINE_CSS_RE = /\.inline\.css$/;

// Vite's own CSS plugin decides whether to treat a module as CSS purely by
// the *id*'s extension, independent of what an earlier `load` hook returned
// — so simply returning JS from `load` for a `*.inline.css` id still leaves
// Vite's css `transform` hook trying to parse that JS as CSS afterwards.
// Resolving to a virtual id without a `.css` suffix is what actually keeps
// Vite's CSS pipeline from ever seeing the module.
const VIRTUAL_ID_PREFIX = "\0inline-critical-css:";

/**
 * Marks `*.inline.css` files (currently `base.inline.css`,
 * `BibleReader.inline.css`, `BibleReaderToolbar.inline.css`,
 * `BibleSelector.inline.css` — the CSS needed to correctly paint the
 * first-visible content) as build-time-only critical
 * CSS: their minified content is baked directly into `index.html` instead of
 * the regular external stylesheet, and that stylesheet's `<link>` is made
 * non-blocking, since first paint no longer depends on it.
 *
 * Two plugins rather than one, the same reason `vite-plugin-html-meta-assets.ts`
 * uses two: the `load` interception needs `enforce: "pre"` so it runs before
 * Vite's own CSS plugin claims the module (which is what keeps this content
 * out of the regular emitted stylesheet — see `inlineCriticalCss.ts`), while
 * the HTML injection needs to run after Vite has written the real hashed
 * `<link rel="stylesheet">` tag it's rewriting.
 *
 * Build-only: in dev, `*.inline.css` files are just ordinary CSS imports
 * handled by Vite's normal dev pipeline.
 *
 * Setting `VITE_CRITICAL_CSS_ONLY=true` additionally blanks out every
 * *other* `.css` file's content, so the build ships with nothing but the
 * critical CSS inlined in `index.html` — a way to actually eyeball whether
 * that critical set alone renders a correct first paint, instead of trusting
 * it by inspection.
 */
export function inlineCriticalCssPlugin(): Plugin[] {
  const criticalCssOnly = process.env.VITE_CRITICAL_CSS_ONLY === "true";
  const captured = new Map<string, string>();
  // The virtual id is a plain counter, not the real path — an absolute
  // Windows path has its own `C:\...` colon, and a virtual id combining that
  // with the `\0inline-critical-css:` prefix tripped up rolldown's own
  // id handling downstream.
  const pathsByVirtualId = new Map<string, string>();
  let nextVirtualId = 0;

  return [
    {
      name: "vite-plugin-inline-critical-css:capture",
      apply: "build",
      enforce: "pre",
      resolveId(source, importer) {
        const clean = source.replace(/\?.*$/, "");
        if (!INLINE_CSS_RE.test(clean) || !importer) return null;

        const filePath = path.resolve(path.dirname(importer), clean);
        const virtualId = `${VIRTUAL_ID_PREFIX}${nextVirtualId++}`;
        pathsByVirtualId.set(virtualId, filePath);
        return virtualId;
      },
      async load(id) {
        const filePath = pathsByVirtualId.get(id);
        if (!filePath) return null;

        const raw = fs.readFileSync(filePath, "utf-8");
        const { code } = await transform(raw, { loader: "css", minify: true });
        captured.set(filePath, code);
        // An empty module — the CSS lives only in the inlined <style> tag.
        return "export default undefined;\n";
      },
      transform(code, id) {
        if (!criticalCssOnly || !isNonCriticalStylesheetId(id)) return null;
        return { code: "", map: null };
      },
    },
    {
      name: "vite-plugin-inline-critical-css:inject",
      apply: "build",
      transformIndexHtml: {
        order: "post",
        handler(html) {
          const criticalCss = [...captured.values()].join("\n");
          return makeStylesheetsNonBlocking(
            injectCriticalStyles(html, criticalCss)
          );
        },
      },
    },
  ];
}
