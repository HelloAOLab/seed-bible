import type { IndexHtmlTransformContext, Plugin } from "vite";
import fs from "fs";
import path from "path";
import { transform } from "esbuild";
import {
  injectCriticalStyles,
  makeStylesheetsNonBlocking,
} from "./inlineCriticalCss";
import {
  collectPurgeContent,
  formatPurgeSavings,
  isPurgeCssDisabled,
  purgeCssFiles,
} from "./purgeCss";

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
 * `BibleReader.inline.css`, `BibleReaderToolbar.inline.css` — the CSS needed
 * to correctly paint the first-visible content) as build-time-only critical
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
 */
export function inlineCriticalCssPlugin(): Plugin[] {
  const captured = new Map<string, string>();
  let projectRoot = process.cwd();
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
    },
    {
      name: "vite-plugin-inline-critical-css:inject",
      apply: "build",
      configResolved(config) {
        projectRoot = config.root;
      },
      transformIndexHtml: {
        order: "post",
        async handler(html, ctx) {
          const criticalCss = [...captured.values()].join("\n");
          // This CSS is re-sent with every HTML response rather than cached as
          // an asset, so unused rules here cost more than they do in the
          // external stylesheet. `vite-plugin-purgecss` can't reach it: it was
          // deliberately kept out of the bundle by the capture plugin above.
          const purged = await purgeCriticalCss(
            criticalCss,
            ctx.bundle,
            projectRoot
          );
          return makeStylesheetsNonBlocking(injectCriticalStyles(html, purged));
        },
      },
    },
  ];
}

const CRITICAL_CSS_NAME = "critical.css";

async function purgeCriticalCss(
  css: string,
  bundle: IndexHtmlTransformContext["bundle"],
  projectRoot: string
): Promise<string> {
  if (!bundle || isPurgeCssDisabled() || css.length === 0) return css;

  const purged = await purgeCssFiles(
    [{ name: CRITICAL_CSS_NAME, css }],
    collectPurgeContent(bundle, projectRoot)
  );
  const result = purged.get(CRITICAL_CSS_NAME);
  if (result === undefined) return css;

  console.log(
    `[purgecss] inlined critical CSS: ${formatPurgeSavings(css.length, result.length)}`
  );
  return result;
}
