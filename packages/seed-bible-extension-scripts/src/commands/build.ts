import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { build as viteBuild } from "vite";
import preact from "@preact/preset-vite";
import { loadExtensionProjectInfo } from "../lib/project.js";
import { runCheck } from "./check.js";
import { runTest } from "./test.js";
import {
  isSandboxedProject,
  readProjectSources,
} from "../lib/sandboxedProject.js";

export interface BuildOptions {
  /**
   * Also build the single-file bundle. A sandboxed extension always gets
   * one; for any other it's an error, since only a sandboxed extension can
   * be loaded from a URL.
   */
  standalone: boolean;
}

/** Directories never copied into the monorepo-ready output. */
const EXCLUDED_TOP_LEVEL_DIRS = new Set([
  "node_modules",
  "dist",
  ".git",
  "coverage",
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
) => `# ${extensionId} — sandboxed build

This is a single, self-contained ES module (\`index.js\`) for distributing
${extensionId} outside the seed-bible monorepo. Seed Bible runs every
extension it loads from a URL in a sandboxed iframe: the extension can't see
the page, the user's account, or anything the user hasn't granted it.

For that, the module's default export must come from
\`defineExtension()\` in \`seed-bible/extensions\`, not \`registerExtension()\`:

\`\`\`tsx
import { defineExtension } from "seed-bible/extensions";

export default defineExtension({
  main: async (sb) => { /* register tools with sb.tools */ },
  views: { /* the UI of each pane it opens */ },
});
\`\`\`

Everything it imports, Preact included, is bundled in, since it runs in its
own frame. Styles must come from the bundle itself (inline styles, or CSS
imported with \`?inline\` and added to the document): the frame can't load a
separate stylesheet.

Declare in \`extension.json\` the \`permissions\` it needs and every host it
contacts under \`network\`; the user approves them when installing.
\`seed-bible-extension-scripts publish\` uploads this file and pins its hash
as the manifest's \`integrity\`.
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

  // Everything is bundled into one file: the sandbox loads exactly one
  // module, from a `blob:` URL, so a second chunk could never be fetched.
  await viteBuild({
    root,
    configFile: false,
    logLevel: "info",
    plugins: [preact()],
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    build: {
      outDir,
      emptyOutDir: true,
      lib: {
        entry,
        formats: ["es"],
        fileName: () => "index.js",
      },
      rollupOptions: {
        output: { codeSplitting: false },
      },
    },
  });

  await writeFile(
    path.join(outDir, "README.md"),
    STANDALONE_README(extensionId),
    "utf-8"
  );
  console.log(`[build] Wrote sandboxed bundle to ${outDir}`);
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

  // The check above has already refused a manifest Seed Bible wouldn't
  // install.
  if (isSandboxedProject(await readProjectSources(root))) {
    await buildStandaloneBundle(root, info.extensionId);
    return 0;
  }
  if (options.standalone) {
    console.error(
      '[build] Only a sandboxed extension can be loaded from a URL, and this one registers itself with registerExtension(). Write it with defineExtension() from "seed-bible/extensions" instead (see dist/standalone/README.md in a scaffolded project, or docs/developer-guide.md §7).'
    );
    return 1;
  }
  await buildMonorepoReadyOutput(root, info.extensionId);
  return 0;
}
