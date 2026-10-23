import { rm, readFile } from "node:fs/promises";
import path from "node:path";
import { scaffoldExtension } from "@packages/create-seed-bible-extension/src/scaffold";
import {
  checkManifestPermissions,
  checkPermissionUses,
  findPermissionUses,
} from "@packages/seed-bible-extension-scripts/src/lib/manifestPolicy";
import {
  isSandboxedProject,
  readProjectSources,
} from "@packages/seed-bible-extension-scripts/src/lib/sandboxedProject";
import { loadExtensionProjectInfo } from "@packages/seed-bible-extension-scripts/src/lib/project";

/*
 * A newly scaffolded project has to work as it stands: its own tests pass
 * against the real SDK, and its manifest passes the checks `check` and
 * `build` run. Scaffolded inside the repo so its imports resolve the way
 * they do here.
 */
const target = path.resolve("node_modules/.cache/sb-template-test/my-ext");
await rm(path.dirname(target), { recursive: true, force: true });
await scaffoldExtension({ targetDir: target, name: "My Ext" });

describe("a scaffolded extension", () => {
  it("is a sandboxed extension whose manifest Seed Bible would install", async () => {
    const info = await loadExtensionProjectInfo(target);
    const sources = await readProjectSources(target);

    expect(isSandboxedProject(sources)).toBe(true);
    expect(checkManifestPermissions(info.meta)).toEqual([]);
    expect(checkPermissionUses(info.meta, findPermissionUses(sources))).toEqual(
      { errors: [], warnings: [] }
    );
    const { scripts } = JSON.parse(
      await readFile(path.join(target, "package.json"), "utf-8")
    );
    expect(scripts.build).toBe("seed-bible-extension-scripts build");
    expect(scripts.package).toBe("seed-bible-extension-scripts package");
  });

  it("pins the Preact version the seed-bible package requires", async () => {
    // Published, `seed-bible`'s `catalog:` peer becomes this exact version,
    // so any other pin makes `npm install` fail in every new project.
    const catalogPreact = /^\s+preact:\s*"([^"]+)"/m.exec(
      await readFile("pnpm-workspace.yaml", "utf-8")
    )?.[1];
    const { dependencies } = JSON.parse(
      await readFile(path.join(target, "package.json"), "utf-8")
    );
    expect(catalogPreact).toBeDefined();
    expect(dependencies.preact).toBe(catalogPreact);
  });

  it("is ready to host on GitHub Pages or Cloudflare", async () => {
    const workflow = await readFile(
      path.join(target, ".github/workflows/deploy-pages.yml"),
      "utf-8"
    );
    expect(workflow).toContain("run: npm run package");
    expect(workflow).toContain("path: dist/site");
    // GitHub's own expressions survive scaffolding.
    expect(workflow).toContain("${{ steps.deployment.outputs.page_url }}");
    expect(
      await readFile(path.join(target, "wrangler.jsonc"), "utf-8")
    ).toContain('"name": "my-ext"');
  });
});

// The project's own tests, run here as they would run there.
await import(path.join(target, "src/init.test.tsx"));
