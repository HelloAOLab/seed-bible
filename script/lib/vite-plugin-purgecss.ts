import type { Plugin } from "vite";
import {
  collectPurgeContent,
  formatPurgeSavings,
  isPurgeCssDisabled,
  purgeCssFiles,
} from "./purgeCss";

/**
 * Strips CSS rules the app never uses out of the emitted stylesheets.
 *
 * Runs on the finished bundle rather than through PostCSS so the emitted JS
 * chunks can be used as purge content — that is the only place a class name
 * owned by a dependency (TipTap's `.ProseMirror`, for instance) can be found.
 *
 * Rewriting an asset in `generateBundle` means its filename hash was computed
 * from the *unpurged* CSS. That is safe here only because every deployment
 * serves its assets from its own `branches/<branch>/<buildId>/` prefix (see the
 * `base` comment in `vite.config.ts`), so two builds never share an asset URL
 * and a stale hash can never resolve to another build's file.
 *
 * The inlined critical CSS is purged separately, by
 * `vite-plugin-inline-critical-css.ts`, because it never becomes a bundle asset.
 *
 * Build-only, and skipped for the SSR build, whose CSS output is never served.
 */
export function purgeCssPlugin(): Plugin {
  let projectRoot = process.cwd();
  let isSsrBuild = false;

  return {
    name: "vite-plugin-purgecss",
    apply: "build",
    // Must run after `vite:css-post`, which is what emits the CSS assets.
    enforce: "post",

    configResolved(config) {
      projectRoot = config.root;
      isSsrBuild = !!config.build.ssr;
    },

    async generateBundle(_options, bundle) {
      if (isSsrBuild || isPurgeCssDisabled()) return;

      const stylesheets = Object.entries(bundle).flatMap(
        ([fileName, output]) => {
          if (output.type !== "asset" || !fileName.endsWith(".css")) return [];
          const source =
            typeof output.source === "string"
              ? output.source
              : Buffer.from(output.source).toString("utf-8");
          return [{ name: fileName, css: source }];
        }
      );
      if (stylesheets.length === 0) return;

      const purged = await purgeCssFiles(
        stylesheets,
        collectPurgeContent(bundle, projectRoot)
      );

      let before = 0;
      let after = 0;
      for (const stylesheet of stylesheets) {
        const result = purged.get(stylesheet.name);
        if (result === undefined) continue;

        const asset = bundle[stylesheet.name];
        if (asset?.type !== "asset") continue;

        before += stylesheet.css.length;
        after += result.length;
        asset.source = result;
      }

      // Source maps for these stylesheets are left as Vite wrote them, so a
      // purged rule's mapping is off by however much was removed above it.
      console.log(
        `[purgecss] ${stylesheets.length} stylesheets: ${formatPurgeSavings(before, after)}`
      );
    },
  };
}
