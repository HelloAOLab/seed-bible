import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { ExtensionProjectMeta } from "./project.js";

/** The image types Seed Bible shows as an extension's icon. */
export const ICON_TYPES: Readonly<Record<string, string>> = {
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

/** It's shown at most a few times larger than a list row's height. */
export const MAX_ICON_BYTES = 256 * 1024;

export interface IconFile {
  bytes: Uint8Array<ArrayBuffer>;
  mimeType: string;
  /** Including the dot, like `.png`. */
  extension: string;
}

const isUrl = (value: string) => /^https?:\/\//i.test(value);

/**
 * `extension.json`'s `icon` as a file in the project, or null when it has
 * none or names one by its full URL (which is published as it is).
 */
export async function readIcon(
  root: string,
  meta: ExtensionProjectMeta
): Promise<IconFile | null> {
  const icon = meta.icon;
  if (typeof icon !== "string" || isUrl(icon)) {
    return null;
  }
  const extension = path.extname(icon).toLowerCase();
  return {
    bytes: new Uint8Array(await readFile(path.resolve(root, icon))),
    mimeType: ICON_TYPES[extension] ?? "application/octet-stream",
    extension,
  };
}

/**
 * What would stop the icon showing, as messages for the developer. Empty
 * when there's nothing wrong, including when there's no icon.
 */
export async function checkIcon(
  root: string,
  meta: ExtensionProjectMeta
): Promise<string[]> {
  const icon = meta.icon;
  if (icon === undefined) {
    return [];
  }
  if (typeof icon !== "string" || icon.length === 0) {
    return [
      '"icon" must be the path to an image in your project, like "icon.png".',
    ];
  }
  if (isUrl(icon)) {
    return icon.toLowerCase().startsWith("https://")
      ? []
      : [
          `"icon" is ${icon}, but Seed Bible only shows icons from https: links.`,
        ];
  }
  const extension = path.extname(icon).toLowerCase();
  if (!ICON_TYPES[extension]) {
    return [
      `"icon" is ${icon}, but it must be one of: ${Object.keys(ICON_TYPES).join(", ")}.`,
    ];
  }
  let size: number;
  try {
    const file = await stat(path.resolve(root, icon));
    if (!file.isFile()) {
      throw new Error("not a file");
    }
    size = file.size;
  } catch {
    return [`"icon" is ${icon}, but there's no such file in the project.`];
  }
  if (size > MAX_ICON_BYTES) {
    return [
      `"icon" is ${Math.ceil(size / 1024)} KB; keep it under ${MAX_ICON_BYTES / 1024} KB. A square image 256 pixels across is plenty.`,
    ];
  }
  return [];
}
