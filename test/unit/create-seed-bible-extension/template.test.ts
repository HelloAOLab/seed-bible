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
    expect(
      JSON.parse(await readFile(path.join(target, "package.json"), "utf-8"))
        .scripts.build
    ).toBe("seed-bible-extension-scripts build");
  });
});

// The project's own tests, run here as they would run there.
await import(path.join(target, "src/init.test.tsx"));
