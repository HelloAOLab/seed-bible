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

/** Reads the installed `seed-bible` version to pin in the scaffolded package.json, falling back to "*" if it can't be determined (e.g. not yet published). */
async function resolveSeedBibleVersion(): Promise<string> {
  const sibling = path.join(here, "..", "..", "seed-bible", "package.json");
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
    seedBibleVersion: await resolveSeedBibleVersion(),
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
