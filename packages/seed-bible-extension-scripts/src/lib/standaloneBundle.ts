import path from "node:path";
import type { InlineConfig } from "vite";
import preact from "@preact/preset-vite";

/**
 * The Vite config for a sandboxed extension's bundle: one ES module with
 * everything in it. The sandbox loads exactly one module, from a `blob:`
 * URL, so a second chunk could never be fetched.
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
    plugins: [preact()],
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
      },
      rollupOptions: {
        output: { codeSplitting: false },
      },
    },
  };
}
