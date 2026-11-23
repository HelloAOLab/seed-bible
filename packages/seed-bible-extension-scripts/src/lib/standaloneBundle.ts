import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type { InlineConfig, Plugin } from "vite";
import preact from "@preact/preset-vite";

const MIME_TYPES: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".bmp": "image/bmp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".txt": "text/plain",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
};

function toDataUrl(fileName: string, content: Uint8Array): string {
  const mime =
    MIME_TYPES[path.extname(fileName).toLowerCase()] ??
    "application/octet-stream";
  return `data:${mime};base64,${Buffer.from(content).toString("base64")}`;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function listFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(full)));
    else files.push(full);
  }
  return files;
}

/**
 * Inlines every file the build would otherwise write beside the bundle, and
 * points the code at it instead, since the sandboxed frame loads `index.js`
 * and nothing else. Vite's library mode already inlines most imports (an
 * `import icon from "./icon.svg"`, a `url()` in CSS) as `data:` URLs; this
 * covers what it still writes out:
 *
 * - Web workers (`?worker`, `new Worker(new URL("./w.ts", import.meta.url))`)
 *   become `blob:` URLs made from their code, the only kind of worker the
 *   frame's CSP allows.
 * - Files in the project's `public/` folder, which Vite copies to the output
 *   and refers to by an absolute path (`/logo.svg`), become `data:` URLs
 *   wherever that path appears as a string in the code or a `url()` in CSS.
 * - Any other file emitted beside the bundle becomes a `data:` URL.
 *
 * A file the code doesn't refer to in a way this can find fails the build,
 * rather than shipping a bundle that asks for a file that isn't there.
 * CSS files are left for `inlineCssPlugin`, which runs after this one, with
 * the files they refer to already inlined.
 */
export function inlineAssetsPlugin(): Plugin {
  let base = "/";
  let publicDir = "";
  return {
    name: "seed-bible-inline-assets",
    apply: "build",
    enforce: "post",
    configResolved(config) {
      base = config.base;
      publicDir = config.publicDir;
    },
    async generateBundle(_options, bundle) {
      const files = Object.values(bundle);
      const entry = files.find((file) => file.type === "chunk" && file.isEntry);
      for (const file of files) {
        if (file.type === "chunk" && file !== entry) {
          this.error(
            `The bundle split off a second module, ${file.fileName}, which the sandbox can't load. Import it statically instead of with import().`
          );
        }
      }
      const sheets = files.filter(
        (file) => file.type === "asset" && file.fileName.endsWith(".css")
      );

      const targets: {
        url: string;
        label: string;
        /** A JavaScript expression for the file's URL. */
        expression: string;
        dataUrl: string;
        fromBundle: boolean;
      }[] = [];
      for (const file of files) {
        if (file.type !== "asset" || sheets.includes(file)) continue;
        const content =
          typeof file.source === "string"
            ? new TextEncoder().encode(file.source)
            : file.source;
        const isScript = /\.m?js$/.test(file.fileName);
        targets.push({
          url: base + file.fileName,
          label: file.fileName,
          expression: isScript
            ? `URL.createObjectURL(new Blob([${JSON.stringify(
                new TextDecoder().decode(content)
              )}],{type:"text/javascript"}))`
            : JSON.stringify(toDataUrl(file.fileName, content)),
          dataUrl: toDataUrl(file.fileName, content),
          fromBundle: true,
        });
      }
      if (publicDir && existsSync(publicDir)) {
        for (const full of await listFiles(publicDir)) {
          const relative = path
            .relative(publicDir, full)
            .split(path.sep)
            .join("/");
          const dataUrl = toDataUrl(full, await readFile(full));
          targets.push({
            url: base + relative,
            label: `public/${relative}`,
            expression: JSON.stringify(dataUrl),
            dataUrl,
            fromBundle: false,
          });
        }
      }
      if (targets.length === 0) return;

      const unreferenced: string[] = [];
      for (const target of targets) {
        const url = escapeRegExp(target.url);
        const literal = new RegExp(`(["'\`])${url}\\1`, "g");
        const cssUrl = new RegExp(`url\\(\\s*(["']?)${url}\\1\\s*\\)`, "g");
        let found = false;
        if (entry?.type === "chunk") {
          entry.code = entry.code.replace(literal, () => {
            found = true;
            return target.expression;
          });
        }
        for (const sheet of sheets) {
          if (sheet.type !== "asset") continue;
          const css =
            typeof sheet.source === "string"
              ? sheet.source
              : new TextDecoder().decode(sheet.source);
          sheet.source = css.replace(cssUrl, () => {
            found = true;
            return `url("${target.dataUrl}")`;
          });
        }
        if (target.fromBundle) {
          delete bundle[target.label];
          if (!found) unreferenced.push(target.label);
        }
      }
      if (unreferenced.length > 0) {
        this.error(
          `The sandbox loads only index.js, but the build would also write ${unreferenced.join(", ")}, and nothing in the bundle refers to ${unreferenced.length === 1 ? "it" : "them"} in a way that could be inlined.`
        );
      }
    },
  };
}

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
      const entry = Object.values(bundle).find(
        (file) => file.type === "chunk" && file.isEntry
      );
      if (entry?.type !== "chunk") {
        this.error(
          "The bundle has CSS but no entry module to carry it into the frame."
        );
      }
      const css = sheets
        .map((sheet) =>
          sheet.type === "asset" && typeof sheet.source === "string"
            ? sheet.source
            : new TextDecoder().decode((sheet as { source: Uint8Array }).source)
        )
        .join("\n");
      for (const sheet of sheets) delete bundle[sheet.fileName];

      // Before the extension's own code, so the styles are there before any
      // view renders. On a line of its own, with a development build's
      // source map moved down one line to match.
      const addStyle = `(()=>{const s=document.createElement("style");s.textContent=${JSON.stringify(css)};document.head.append(s)})();`;
      entry.code = `${addStyle}\n${entry.code}`.replace(
        INLINE_SOURCE_MAP,
        (_match, prefix: string, data: string) => {
          const map = JSON.parse(Buffer.from(data, "base64").toString("utf-8"));
          map.mappings = `;${map.mappings}`;
          return prefix + Buffer.from(JSON.stringify(map)).toString("base64");
        }
      );
    },
  };
}

/** The source map a development build writes at the end of the bundle. */
const INLINE_SOURCE_MAP =
  /(\/\/# sourceMappingURL=data:application\/json;(?:charset=utf-8;)?base64,)([A-Za-z0-9+/=]+)\s*$/;

/**
 * The Vite config for a sandboxed extension's bundle: one ES module with
 * everything in it, its CSS, images, fonts and workers included. The sandbox loads exactly one module,
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
    // Asset inlining first, so the CSS it rewrites is what gets inlined.
    plugins: [preact(), inlineAssetsPlugin(), inlineCssPlugin()],
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
      // `inlineAssetsPlugin` inlines the files instead.
      copyPublicDir: false,
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
