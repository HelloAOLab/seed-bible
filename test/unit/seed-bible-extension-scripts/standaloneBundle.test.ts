// @vitest-environment node
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { SourceMap } from "node:module";
import os from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { JSDOM } from "jsdom";
import { build } from "vite";
import {
  inlineCssPlugin,
  standaloneBundleConfig,
} from "@packages/seed-bible-extension-scripts/src/lib/standaloneBundle";

/**
 * Builds the sandboxed bundle for `root` into a new folder, and returns the
 * folder and the bundle's code.
 */
async function buildBundle(root: string) {
  const outDir = await mkdtemp(path.join(os.tmpdir(), "sb-bundle-"));
  const config = standaloneBundleConfig(root, outDir);
  // The `seed-bible` package's source rather than its build, which tests
  // run before. It still gets Preact from `seed-bible`'s own dependencies,
  // so the two versions meet as they do in a real project.
  const source = (entry: string) =>
    path.resolve("packages/seed-bible/seed-bible", entry);
  // The extension tooling has its own copy of Vite's types.
  await build({
    ...config,
    logLevel: "silent",
    resolve: {
      ...config.resolve,
      alias: {
        "seed-bible/extensions": source("extensions/index.tsx"),
        "seed-bible/components": source("components/index.tsx"),
      },
    },
  } as Parameters<typeof build>[0]);
  return {
    outDir,
    code: await readFile(path.join(outDir, "index.js"), "utf-8"),
  };
}

/** The CSS `inlineCssPlugin` put at the start of the bundle. */
function inlinedCss(code: string): string {
  const start = "s.textContent=";
  const from = code.indexOf(start) + start.length;
  const to = code.indexOf(";document.head.append(s)", from);
  return JSON.parse(code.slice(from, to)) as string;
}

describe("the sandboxed bundle", () => {
  const folders: string[] = [];
  afterEach(async () => {
    await Promise.all(
      folders
        .splice(0)
        .map((folder) => rm(folder, { recursive: true, force: true }))
    );
  });

  /*
   * The example extension's own Preact differs from the one `seed-bible`
   * resolves for its SDK. Bundling both breaks every hook in the
   * extension's views, so the bundle must hold exactly one.
   */
  it("contains one copy of Preact, the project's own", async () => {
    const { outDir, code } = await buildBundle(
      path.resolve("packages/sandboxed-example-extension")
    );
    folders.push(outDir);

    const copies = code.match(
      /\/preact@[^/]+\/node_modules\/preact\/dist\/preact\.module\.js/g
    );
    expect(new Set(copies)).toEqual(
      new Set(["/preact@10.29.2/node_modules/preact/dist/preact.module.js"])
    );
    expect(
      code.match(/\/preact\/hooks\/dist\/hooks\.module\.js/g)
    ).toHaveLength(1);
  }, 60_000);

  // The frame loads one module, so a stylesheet beside it would never apply.
  it("carries the shared components' styles inside the module, with no stylesheet beside it", async () => {
    const { outDir, code } = await buildBundle(
      path.resolve("packages/sandboxed-example-extension")
    );
    folders.push(outDir);

    expect(await readdir(outDir)).toEqual(["index.js"]);
    // The example's pane uses the shared Button.
    expect(code).toMatch(/\.sb-button\{/);
  }, 60_000);

  // The bundler keeps every CSS import, even of components the extension
  // doesn't use, so an extension using one shared component carries all
  // their CSS: about 4 KB gzipped. Far more means a component's CSS has
  // grown a lot, or a component imports something heavy, such as one of the
  // app's stylesheets. Built against the package's source, this can't see
  // how the package build groups CSS into chunks.
  it("carries only a few KB of CSS for the shared components", async () => {
    const { outDir, code } = await buildBundle(
      path.resolve("packages/sandboxed-example-extension")
    );
    folders.push(outDir);

    const css = inlinedCss(code);
    expect(css).toMatch(/\.sb-button\{/);
    expect(gzipSync(css).length).toBeLessThan(8 * 1024);
  }, 60_000);

  it("adds the extension's own CSS to the page before its code runs", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "sb-css-extension-"));
    folders.push(root);
    await writeFile(
      path.join(root, "panel.css"),
      ".panel { color: rgb(1, 2, 3); }"
    );
    await writeFile(
      path.join(root, "index.ts"),
      [
        'import "./panel.css";',
        "document.body.dataset.stylesWhenRun = String(",
        '  document.head.querySelectorAll("style").length',
        ");",
      ].join("\n")
    );
    const { outDir, code } = await buildBundle(root);
    folders.push(outDir);

    const page = new JSDOM(
      '<!doctype html><html><head></head><body><p class="panel">Hi</p></body></html>',
      { runScripts: "outside-only" }
    );
    page.window.eval(code);

    const { document } = page.window;
    expect(document.body.dataset.stylesWhenRun).toBe("1");
    expect(
      page.window.getComputedStyle(document.querySelector(".panel")!).color
    ).toBe("rgb(1, 2, 3)");
  }, 60_000);

  it("fails the build, rather than drop the CSS, when there's no entry module to carry it", () => {
    const plugin = inlineCssPlugin();
    const bundle = {
      "style.css": {
        type: "asset",
        fileName: "style.css",
        source: ".panel { color: red; }",
      },
    };
    const context = {
      error(message: string): never {
        throw new Error(message);
      },
    };
    const generateBundle = plugin.generateBundle as unknown as (
      this: typeof context,
      options: unknown,
      files: typeof bundle
    ) => void;

    expect(() => generateBundle.call(context, {}, bundle)).toThrow(
      /no entry module/
    );
    expect(bundle["style.css"]).toBeDefined();
  });

  describe("in a development build's source map", () => {
    /** Where the map says the text at `needle` came from. */
    function original(code: string, needle: string) {
      const data = /base64,([A-Za-z0-9+/=]+)\s*$/.exec(code)![1]!;
      const map = new SourceMap(
        JSON.parse(Buffer.from(data, "base64").toString("utf-8"))
      );
      const lines = code.split("\n");
      const line = lines.findIndex((text) => text.includes(needle));
      const column = lines[line]!.indexOf(needle);
      const entry = map.findEntry(line, column);
      return "generatedColumn" in entry && entry.generatedColumn === column
        ? { line: entry.originalLine, column: entry.originalColumn }
        : null;
    }

    it("still points the extension's code to its source", async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "sb-css-map-"));
      folders.push(root);
      await writeFile(path.join(root, "panel.css"), ".panel { margin: 0; }");
      await writeFile(
        path.join(root, "index.ts"),
        'import "./panel.css";\nexport function fail() {\n  throw new Error("failed here");\n}\n'
      );
      const outDir = await mkdtemp(path.join(os.tmpdir(), "sb-bundle-"));
      folders.push(outDir);
      await build({
        ...standaloneBundleConfig(root, outDir, "development"),
        logLevel: "silent",
      } as Parameters<typeof build>[0]);
      const code = await readFile(path.join(outDir, "index.js"), "utf-8");

      expect(code).toMatch(/^\(\(\)=>\{const s=document\.createElement/);
      // `new Error(` on the source's third line, two spaces in.
      expect(original(code, "new Error(")).toEqual({ line: 2, column: 8 });
    }, 60_000);

    it("still points code on the bundle's first line to its source", () => {
      // `token` at column 6 of the first line, mapped to the same place.
      const map = {
        version: 3,
        sources: ["index.ts"],
        names: [],
        mappings: "AAAA,MAAM",
      };
      const inline = Buffer.from(JSON.stringify(map)).toString("base64");
      const bundle = {
        "index.js": {
          type: "chunk",
          isEntry: true,
          fileName: "index.js",
          code: `const token = 1;\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${inline}`,
        },
        "style.css": {
          type: "asset",
          fileName: "style.css",
          source: ".panel {}",
        },
      };
      (
        inlineCssPlugin().generateBundle as unknown as (
          options: unknown,
          files: typeof bundle
        ) => void
      ).call({}, {}, bundle);

      expect(original(bundle["index.js"].code, "token")).toEqual({
        line: 0,
        column: 6,
      });
    });
  });
});
