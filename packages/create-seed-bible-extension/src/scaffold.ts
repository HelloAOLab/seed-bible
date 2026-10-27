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
 * The version range to give the scaffolded project for `seed-bible` and
 * `seed-bible-extension-scripts`. All three packages are released together
 * under one version, so this package's own version is the one that matches.
 */
async function resolvePackageVersion(): Promise<string> {
  const pkg = JSON.parse(
    await readFile(path.join(here, "..", "package.json"), "utf-8")
  ) as { version?: string };
  return pkg.version ? `^${pkg.version}` : "*";
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
  const version = await resolvePackageVersion();
  const ctx: TemplateContext = {
    extensionId,
    packageName: extensionId,
    extensionPascalName: toPascalCase(extensionId),
    scriptsVersion: version,
    seedBibleVersion: version,
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
}
