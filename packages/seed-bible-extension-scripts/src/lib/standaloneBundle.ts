import path from "node:path";
import type { InlineConfig, Plugin } from "vite";
import preact from "@preact/preset-vite";

/**
 * Moves the bundle's CSS into its JavaScript, which adds it to the frame's
 * page as a `<style>` when it loads. A sandboxed frame loads one module and
 * nothing else, so a stylesheet written next to it would never be applied:
 * this is how the shared components' styles, and the extension's own
 * `import "./x.css"`, reach the page.
 */
export function inlineCssPlugin(): Plugin {
  return {
    name: "seed-bible-inline-css",
    apply: "build",
    enforce: "post",
    generateBundle(_options, bundle) {
      const sheets = Object.values(bundle).filter(
        (file) => file.type === "asset" && file.fileName.endsWith(".css")
      );
      if (sheets.length === 0) return;
      const css = sheets
        .map((sheet) =>
          sheet.type === "asset" && typeof sheet.source === "string"
            ? sheet.source
            : new TextDecoder().decode((sheet as { source: Uint8Array }).source)
        )
        .join("\n");
      for (const sheet of sheets) delete bundle[sheet.fileName];

      const entry = Object.values(bundle).find(
        (file) => file.type === "chunk" && file.isEntry
      );
      if (entry?.type !== "chunk") return;
      // Before the extension's own code, so the styles are there before any
      // view renders. On the first line, without a line break of its own,
      // so a development build's source map still lines up.
      entry.code =
        `(()=>{const s=document.createElement("style");s.textContent=${JSON.stringify(css)};document.head.append(s)})();` +
        entry.code;
    },
  };
}

/**
 * The Vite config for a sandboxed extension's bundle: one ES module with
 * everything in it, its CSS included. The sandbox loads exactly one module,
 * from a `blob:` URL, so a second chunk or a stylesheet could never be
 * fetched.
 */
export function standaloneBundleConfig(
  root: string,
  outDir: string,
  mode: "production" | "development" = "production"
): InlineConfig {
  return {
    root,
    configFile: false,
    logLevel: "info",
    mode,
    plugins: [preact(), inlineCssPlugin()],
    define: { "process.env.NODE_ENV": JSON.stringify(mode) },
    resolve: {
      // One copy of each, the project's own. `seed-bible` may resolve another
      // version for the SDK, and Preact's hooks break across two copies.
      dedupe: ["preact", "@preact/signals", "@preact/signals-core"],
    },
    build: {
      outDir,
      emptyOutDir: true,
      minify: mode === "production",
      sourcemap: mode === "development" ? "inline" : false,
      lib: {
        entry: path.join(root, "index.ts"),
        formats: ["es"],
        fileName: () => "index.js",
        // Never written: `inlineCssPlugin` moves it into `index.js`.
        cssFileName: "style",
      },
      rollupOptions: {
        output: { codeSplitting: false },
      },
    },
  };
}
