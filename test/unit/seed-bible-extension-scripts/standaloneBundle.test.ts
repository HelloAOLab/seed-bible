// @vitest-environment node
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { build } from "vite";
import { standaloneBundleConfig } from "@packages/seed-bible-extension-scripts/src/lib/standaloneBundle";

/*
 * The example extension's own Preact differs from the one `seed-bible`
 * resolves for its SDK. Bundling both breaks every hook in the
 * extension's views, so the bundle must hold exactly one.
 */
describe("the sandboxed bundle", () => {
  it("contains one copy of Preact, the project's own", async () => {
    const root = path.resolve("packages/sandboxed-example-extension");
    const outDir = await mkdtemp(path.join(os.tmpdir(), "sb-bundle-"));
    try {
      const config = standaloneBundleConfig(root, outDir);
      // The extension tooling has its own copy of Vite's types.
      await build({ ...config, logLevel: "silent" } as Parameters<
        typeof build
      >[0]);
      const bundle = await readFile(path.join(outDir, "index.js"), "utf-8");

      const copies = bundle.match(
        /\/preact@[^/]+\/node_modules\/preact\/dist\/preact\.module\.js/g
      );
      expect(new Set(copies)).toEqual(
        new Set(["/preact@10.29.2/node_modules/preact/dist/preact.module.js"])
      );
      expect(
        bundle.match(/\/preact\/hooks\/dist\/hooks\.module\.js/g)
      ).toHaveLength(1);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  }, 60_000);
});
