import { readFile } from "node:fs/promises";
import path from "node:path";

export interface ExtensionTranslation {
  title: string;
  description: string;
  [key: string]: string;
}

/** The full shape of `extension.json` — mirrors `ExtensionMeta` in `packages/seed-bible/seed-bible/managers/ExtensionManager.tsx`. */
export interface ExtensionProjectMeta {
  id: string;
  translations: Record<string, ExtensionTranslation>;
  dependencies?: string[];
  autoinstall?: boolean;
}

export interface ExtensionProjectInfo {
  root: string;
  extensionId: string;
  meta: ExtensionProjectMeta;
}

/**
 * Reads `extension.json` from an extension project's root — used to build
 * the `?autoinstall-<id>=true` dev URL, to name the monorepo-ready build
 * output, and (via the full `meta`) to build the `ExtensionSet` manifest
 * `publish` uploads. Every command in this toolkit is meant to be run from
 * the root of a scaffolded extension project, so a missing `extension.json`
 * most likely means the command was run from the wrong directory.
 */
export async function loadExtensionProjectInfo(
  root: string = process.cwd()
): Promise<ExtensionProjectInfo> {
  const metaPath = path.resolve(root, "extension.json");
  let raw: string;
  try {
    raw = await readFile(metaPath, "utf-8");
  } catch {
    throw new Error(
      `Could not find extension.json in ${root}. Run this command from the root of your extension project (the directory create-seed-bible-extension scaffolded).`
    );
  }

  let meta: unknown;
  try {
    meta = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Failed to parse ${metaPath} as JSON: ${String(err)}`);
  }

  const id = (meta as { id?: unknown })?.id;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error(`${metaPath} is missing a non-empty string "id" field.`);
  }

  const translations = (meta as { translations?: unknown }).translations ?? {};
  const dependencies = (meta as { dependencies?: unknown }).dependencies as
    | string[]
    | undefined;
  const autoinstall = (meta as { autoinstall?: unknown }).autoinstall as
    | boolean
    | undefined;

  return {
    root,
    extensionId: id,
    meta: {
      id,
      translations: translations as Record<string, ExtensionTranslation>,
      dependencies,
      autoinstall,
    },
  };
}
