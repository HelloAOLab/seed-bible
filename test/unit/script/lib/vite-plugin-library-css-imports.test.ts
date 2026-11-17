// @vitest-environment node
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { SourceMap } from "node:module";
import os from "node:os";
import path from "node:path";
import { build, type Rollup } from "vite";
import { libraryCssImportsPlugin } from "../../../../script/lib/vite-plugin-library-css-imports";

/*
 * The `seed-bible` package is built as a library, then bundled again by
 * whatever uses it (a sandboxed extension's build, say). Its components'
 * CSS has to survive that second bundling.
 */

async function writeFiles(dir: string, files: Record<string, string>) {
  await Promise.all(
    Object.entries(files).map(([name, text]) =>
      writeFile(path.join(dir, name), text)
    )
  );
}

describe("libraryCssImportsPlugin", () => {
  let dir: string;
  let library: string;

  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "sb-library-css-"));
    await writeFiles(dir, {
      "base.css": ".rule-base { margin: 0; }",
      "styles.ts": 'import "./base.css";',
      "shared.css": ".rule-shared { color: red; }",
      "shared.ts":
        'import "./shared.css";\nexport const shared = () => "shared";',
      "a.css": ".rule-a { color: blue; }",
      "a.ts":
        'import "./a.css";\nimport { shared } from "./shared";\nexport const a = () => "a" + shared();',
      "b.css": ".rule-b { color: green; }",
      "b.ts":
        'import "./b.css";\nimport { shared } from "./shared";\nexport const b = () => "b" + shared();',
    });
    library = path.join(dir, "dist");
    await build({
      root: dir,
      configFile: false,
      logLevel: "silent",
      plugins: [libraryCssImportsPlugin({ firstEntry: "styles" })],
      build: {
        outDir: library,
        minify: false,
        sourcemap: true,
        cssCodeSplit: true,
        lib: {
          entry: {
            a: path.join(dir, "a.ts"),
            b: path.join(dir, "b.ts"),
            styles: path.join(dir, "styles.ts"),
          },
          formats: ["es"],
          fileName: (_format, name) => `${name}.js`,
        },
      },
    });
  }, 60_000);

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("brings an entry's CSS, and the CSS of what it uses, into whatever bundles it", async () => {
    const consumer = path.join(dir, "consumer");
    const output = (await build({
      root: dir,
      configFile: false,
      logLevel: "silent",
      build: {
        write: false,
        cssCodeSplit: false,
        lib: {
          entry: path.join(dir, "consumer.ts"),
          formats: ["es"],
          fileName: () => "consumer.js",
          cssFileName: "consumer",
        },
        outDir: consumer,
      },
      plugins: [
        {
          name: "consumer-entry",
          resolveId: (id) => (id.endsWith("consumer.ts") ? id : null),
          load: (id) =>
            id.endsWith("consumer.ts")
              ? `import { a } from ${JSON.stringify(path.join(library, "a.js").replaceAll("\\", "/"))};\nconsole.log(a());`
              : null,
        },
      ],
    })) as Rollup.RollupOutput[];

    const css = output[0]!.output.find(
      (file): file is Rollup.OutputAsset =>
        file.type === "asset" && file.fileName.endsWith(".css")
    );
    const text = String(css?.source);
    expect(text).toContain(".rule-a");
    expect(text).toContain(".rule-shared");
    expect(text).not.toContain(".rule-b");
    expect(text).not.toContain(".rule-base");
  }, 60_000);

  it("writes every chunk's CSS to style.css, the first entry's first", async () => {
    const merged = await readFile(path.join(library, "style.css"), "utf-8");

    expect(merged.indexOf(".rule-base")).toBe(0);
    for (const rule of [".rule-a", ".rule-b", ".rule-shared"]) {
      expect(merged).toContain(rule);
    }
  });

  it("keeps the first entry's CSS files in their order", () => {
    const plugin = libraryCssImportsPlugin({ firstEntry: "styles" });
    const chunk = (name: string, importedCss: string[]) => ({
      type: "chunk",
      fileName: `${name}.js`,
      name,
      isEntry: true,
      code: "",
      viteMetadata: { importedCss: new Set(importedCss) },
    });
    const asset = (fileName: string) => ({
      type: "asset",
      fileName,
      source: `.${fileName.replace(".css", "")} {}`,
    });
    const bundle = {
      "a.js": chunk("a", ["a.css"]),
      "styles.js": chunk("styles", ["reset.css", "tokens.css"]),
      "a.css": asset("a.css"),
      "reset.css": asset("reset.css"),
      "tokens.css": asset("tokens.css"),
    };
    let merged = "";
    const context = {
      emitFile: (file: { source: string }) => void (merged = file.source),
    };
    (
      plugin.generateBundle as unknown as (
        this: typeof context,
        options: unknown,
        files: typeof bundle
      ) => void
    ).call(context, {}, bundle);

    expect(merged.split("\n")).toEqual([".reset {}", ".tokens {}", ".a {}"]);
  });

  describe("in a chunk's source map", () => {
    /** Where `map` says the text at `needle` in `code` came from. */
    function original(code: string, map: string, needle: string) {
      const lines = code.split("\n");
      const line = lines.findIndex((text) => text.includes(needle));
      const column = lines[line]!.indexOf(needle);
      const entry = new SourceMap(JSON.parse(map)).findEntry(line, column);
      return "generatedColumn" in entry && entry.generatedColumn === column
        ? { line: entry.originalLine, column: entry.originalColumn }
        : null;
    }

    it("still points the chunk's code to its source", async () => {
      const code = await readFile(path.join(library, "a.js"), "utf-8");
      const map = await readFile(path.join(library, "a.js.map"), "utf-8");

      expect(code.split("\n")[0]).toMatch(/^import "\.\/a\.css";$/);
      // `"a" + shared()` on a.ts's third line.
      expect(original(code, map, '"a" + shared()')).toEqual({
        line: 2,
        column: 'export const a = () => "a"'.indexOf('"a"'),
      });
    });

    it("still points code on the chunk's first line to its source", () => {
      // `token` at column 6 of the first line, mapped to the same place.
      const bundle = {
        "a.js": {
          type: "chunk",
          fileName: "a.js",
          name: "a",
          isEntry: true,
          code: "const token = 1;\n//# sourceMappingURL=a.js.map",
          viteMetadata: { importedCss: new Set(["a.css"]) },
        },
        "a.js.map": {
          type: "asset",
          fileName: "a.js.map",
          source: JSON.stringify({
            version: 3,
            sources: ["a.ts"],
            names: [],
            mappings: "AAAA,MAAM",
          }),
        },
        "a.css": { type: "asset", fileName: "a.css", source: ".a {}" },
      };
      (
        libraryCssImportsPlugin().generateBundle as unknown as (
          this: { emitFile: () => void },
          options: unknown,
          files: typeof bundle
        ) => void
      ).call({ emitFile: () => {} }, {}, bundle);

      expect(
        original(bundle["a.js"].code, bundle["a.js.map"].source, "token")
      ).toEqual({ line: 0, column: 6 });
    });
  });
});
