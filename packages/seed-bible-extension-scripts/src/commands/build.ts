import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { build as viteBuild } from "vite";
import preact from "@preact/preset-vite";
import { loadExtensionProjectInfo } from "../lib/project.js";
import { runCheck } from "./check.js";
import { runTest } from "./test.js";
import { STANDALONE_BUILD_ALIASES } from "../build-shims/aliasMap.js";

export interface BuildOptions {
  standalone: boolean;
}

/** Directories never copied into the monorepo-ready output. */
const EXCLUDED_TOP_LEVEL_DIRS = new Set([
  "node_modules",
  "dist",
  ".git",
  "coverage",
  "vendor-types",
]);

async function copyProjectSource(
  root: string,
  destination: string
): Promise<void> {
  await mkdir(destination, { recursive: true });
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && EXCLUDED_TOP_LEVEL_DIRS.has(entry.name)) {
      continue;
    }
    await cp(path.join(root, entry.name), path.join(destination, entry.name), {
      recursive: true,
    });
  }
}

const MONOREPO_README = (
  extensionId: string
) => `# ${extensionId} — ready for the seed-bible monorepo

This folder is a validated (type-checked, tests passing) copy of your
extension's source, ready to become \`packages/${extensionId}/\` in a
\`seed-bible\` checkout — the fully-supported distribution path: extensions
bundled this way ship as plain source, auto-discovered by
\`script/lib/vite-plugin-extensions.ts\` and swept into the app's own Vite
build alongside every other extension. No further build step is needed for
this path.

To use it:

1. Copy this folder's contents into \`packages/${extensionId}/\` in a
   \`seed-bible\` checkout.
2. Run \`pnpm install\` from the repo root so the new package's
   dependencies resolve.
3. It's auto-discovered on the next \`pnpm dev\`/\`pnpm build\` — no other
   wiring required.
`;

const STANDALONE_README = (
  extensionId: string
) => `# ${extensionId} — standalone build (experimental)

This is a self-contained ES module (\`index.js\`) for hosting outside the
seed-bible monorepo and installing into a *running* Seed Bible instance via:

\`\`\`ts
seedBibleState.extensions.loadExtension({
  meta: { id: "${extensionId}", translations: { en: { title: "...", description: "..." } } },
  url: "https://wherever-you-host-this/index.js",
});
\`\`\`

**This path is experimental / best-effort**, unlike the monorepo-bundled
distribution (see \`build\`'s other output, \`dist/monorepo-package/\`), which
is the primary, fully-supported way to ship an extension. Two things to know:

- It only works when loaded into a real, running Seed Bible page — one that
  exposes \`window.__seedBibleExtensionRuntime\` (every current build of the
  app does). Loading it anywhere else throws a clear error immediately rather
  than failing silently.
- \`seed-bible/components\` doesn't work as a normal static import here (the
  host only exposes it as an async loader, to avoid forcing its whole UI
  surface into eager load). Instead of
  \`import { MaterialIcon } from "seed-bible/components"\`, call
  \`const { MaterialIcon } = await loadSeedBibleComponents();\` (also
  importable from \`"seed-bible/components"\` in this build).
`;

async function buildMonorepoReadyOutput(
  root: string,
  extensionId: string
): Promise<void> {
  const destination = path.join(root, "dist", "monorepo-package");
  await rm(destination, { recursive: true, force: true });
  await copyProjectSource(root, destination);
  await writeFile(
    path.join(destination, "README.md"),
    MONOREPO_README(extensionId),
    "utf-8"
  );
  console.log(`[build] Wrote monorepo-ready package to ${destination}`);
}

async function buildStandaloneBundle(
  root: string,
  extensionId: string
): Promise<void> {
  const entry = path.join(root, "index.ts");
  const outDir = path.join(root, "dist", "standalone");

  await viteBuild({
    root,
    configFile: false,
    logLevel: "info",
    plugins: [preact()],
    resolve: {
      alias: STANDALONE_BUILD_ALIASES,
    },
    build: {
      outDir,
      emptyOutDir: true,
      lib: {
        entry,
        formats: ["es"],
        fileName: () => "index.js",
      },
    },
  });

  await writeFile(
    path.join(outDir, "README.md"),
    STANDALONE_README(extensionId),
    "utf-8"
  );
  console.log(`[build] Wrote experimental standalone bundle to ${outDir}`);
}

export async function runBuild(
  options: BuildOptions,
  root: string = process.cwd()
): Promise<number> {
  const info = await loadExtensionProjectInfo(root);

  const checkCode = await runCheck(root);
  if (checkCode !== 0) {
    console.error("[build] Aborting: type-check failed.");
    return checkCode;
  }

  const testCode = await runTest([], root);
  if (testCode !== 0) {
    console.error("[build] Aborting: tests failed.");
    return testCode;
  }

  await buildMonorepoReadyOutput(root, info.extensionId);

  if (options.standalone) {
    await buildStandaloneBundle(root, info.extensionId);
  }

  return 0;
}
