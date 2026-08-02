import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  renderTemplate,
  toExtensionId,
  toPascalCase,
  type TemplateContext,
} from "./templating.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const templateRoot = path.join(here, "..", "templates", "extension");

/**
 * Where the vendored `SeedBibleState`/`registerExtension` types
 * (`scripts/sync-types.ts` in `seed-bible-extension-scripts`) come from.
 * A published `create-seed-bible-extension` bundles its own copy at
 * `templates/extension/types/vendor/` (populated by this package's own build
 * step); during local monorepo development, before that copy step has run,
 * fall back to the sibling `seed-bible-extension-scripts` package's live
 * `vendor-types/` so scaffolding always has *something* accurate to copy.
 */
function resolveVendorTypesDir(): string {
  const bundled = path.join(templateRoot, "types", "vendor");
  if (existsSync(path.join(bundled, "app", "api.d.ts"))) {
    return bundled;
  }
  const sibling = path.join(
    here,
    "..",
    "..",
    "seed-bible-extension-scripts",
    "vendor-types"
  );
  if (existsSync(path.join(sibling, "app", "api.d.ts"))) {
    return sibling;
  }
  throw new Error(
    "Could not find vendored seed-bible types (neither templates/extension/types/vendor/ nor a sibling seed-bible-extension-scripts/vendor-types/ exists). Run `pnpm --filter seed-bible-extension-scripts run sync-types` first."
  );
}

/** Reads the installed `seed-bible-extension-scripts` version to pin in the scaffolded package.json, falling back to "*" if it can't be determined (e.g. not yet published). */
async function resolveScriptsVersion(): Promise<string> {
  const sibling = path.join(
    here,
    "..",
    "..",
    "seed-bible-extension-scripts",
    "package.json"
  );
  if (existsSync(sibling)) {
    const pkg = JSON.parse(await readFile(sibling, "utf-8")) as {
      version?: string;
    };
    if (pkg.version) {
      return `^${pkg.version}`;
    }
  }
  return "*";
}

async function walkTemplateFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkTemplateFiles(full)));
    } else {
      files.push(full);
    }
  }
  return files;
}

export interface ScaffoldOptions {
  /** Directory to scaffold into. Must not already exist. */
  targetDir: string;
  /** Raw name the user provided (used to derive the extension id and package name). */
  name: string;
}

export async function scaffoldExtension(
  options: ScaffoldOptions
): Promise<void> {
  const { targetDir } = options;
  if (existsSync(targetDir)) {
    throw new Error(
      `${targetDir} already exists. Choose a different name or remove it first.`
    );
  }

  const extensionId = toExtensionId(options.name);
  const ctx: TemplateContext = {
    extensionId,
    packageName: extensionId,
    extensionPascalName: toPascalCase(extensionId),
    scriptsVersion: await resolveScriptsVersion(),
  };

  await mkdir(targetDir, { recursive: true });

  const templateFiles = await walkTemplateFiles(templateRoot);
  for (const templateFile of templateFiles) {
    const relative = path.relative(templateRoot, templateFile);
    const isTemplate = relative.endsWith(".tpl");
    const destRelative = isTemplate
      ? relative.slice(0, -".tpl".length)
      : relative;
    const destPath = path.join(targetDir, destRelative);

    await mkdir(path.dirname(destPath), { recursive: true });

    if (isTemplate) {
      const raw = await readFile(templateFile, "utf-8");
      await writeFile(destPath, renderTemplate(raw, ctx), "utf-8");
    } else {
      await cp(templateFile, destPath);
    }
  }

  // Merge the type-only devDependencies the vendored `.d.ts` tree needs
  // (@casual-simulation/*, @tiptap/*, etc. — see sync-types.ts) into the
  // scaffolded package.json, rather than hand-maintaining that list in the
  // template, where it would silently go stale as SeedBibleState evolves.
  const vendorTypesDir = resolveVendorTypesDir();
  const generatedDepsPath = path.join(
    vendorTypesDir,
    "devDependencies.generated.json"
  );
  if (existsSync(generatedDepsPath)) {
    const generatedDeps = JSON.parse(
      await readFile(generatedDepsPath, "utf-8")
    ) as Record<string, string>;
    const packageJsonPath = path.join(targetDir, "package.json");
    const packageJson = JSON.parse(
      await readFile(packageJsonPath, "utf-8")
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      [key: string]: unknown;
    };
    // Skip any generated type-only dep already listed as a real runtime
    // dependency (e.g. preact/@preact/signals) — no reason to list the same
    // package in both sections with two different version specifiers.
    const filteredGeneratedDeps = Object.fromEntries(
      Object.entries(generatedDeps).filter(
        ([name]) => !(name in (packageJson.dependencies ?? {}))
      )
    );
    packageJson.devDependencies = {
      ...filteredGeneratedDeps,
      ...packageJson.devDependencies,
    };
    await writeFile(
      packageJsonPath,
      `${JSON.stringify(packageJson, null, 2)}\n`,
      "utf-8"
    );
  }

  await mkdir(path.join(targetDir, "types"), { recursive: true });
  await cp(vendorTypesDir, path.join(targetDir, "types", "vendor"), {
    recursive: true,
    filter: (src) => !src.endsWith("devDependencies.generated.json"),
  });
}
