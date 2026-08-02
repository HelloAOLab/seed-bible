import { readFile } from "node:fs/promises";
import path from "node:path";

export interface ExtensionProjectInfo {
  root: string;
  extensionId: string;
}

/**
 * Reads `extension.json` from an extension project's root to learn its
 * `id` — used to build the `?autoinstall-<id>=true` dev URL and to name the
 * monorepo-ready build output. Every command in this toolkit is meant to be
 * run from the root of a scaffolded extension project, so a missing
 * `extension.json` most likely means the command was run from the wrong
 * directory.
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

  return { root, extensionId: id };
}
