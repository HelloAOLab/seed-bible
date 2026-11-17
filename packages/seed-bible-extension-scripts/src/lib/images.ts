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

export const SCREENSHOT_TYPES: Readonly<Record<string, string>> = {
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

export const MAX_SCREENSHOT_BYTES = 1024 * 1024;
export const MAX_SCREENSHOTS = 8;

export interface ImageFile {
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
): Promise<ImageFile | null> {
  const icon = meta.icon;
  if (typeof icon !== "string" || isUrl(icon)) {
    return null;
  }
  return readImage(root, icon, "icon");
}

/**
 * What would stop the icon showing, as messages for the developer. Empty
 * when there's nothing wrong, including when there's no icon.
 */
export async function checkIcon(
  root: string,
  meta: ExtensionProjectMeta
): Promise<string[]> {
  return meta.icon === undefined
    ? []
    : checkImage(root, meta.icon, "icon", '"icon"');
}

type ImageKind = "icon" | "screenshot";

interface ImageRules {
  types: Readonly<Record<string, string>>;
  limit: number;
  pathMessage: string;
  tooLarge?: (size: number) => string;
}

const IMAGE_RULES: Record<ImageKind, ImageRules> = {
  icon: {
    types: ICON_TYPES,
    limit: MAX_ICON_BYTES,
    pathMessage:
      'must be the path to an image in your project, like "icon.png".',
    tooLarge: (size) =>
      `"icon" is ${Math.ceil(size / 1024)} KB; keep it under ${MAX_ICON_BYTES / 1024} KB. A square image 256 pixels across is plenty.`,
  },
  screenshot: {
    types: SCREENSHOT_TYPES,
    limit: MAX_SCREENSHOT_BYTES,
    pathMessage: "must be the path to an image in the project.",
  },
};

function isInsideRoot(root: string, src: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(root, src));
  return (
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

export function withScreenshotSrcs(
  screenshots: NonNullable<ExtensionProjectMeta["screenshots"]>,
  srcs: (string | null)[]
): NonNullable<ExtensionProjectMeta["screenshots"]> {
  return screenshots.map((shot, index) => ({
    ...shot,
    src: srcs[index] ?? shot.src,
  }));
}

function hasEnglishCaption(
  translations: ExtensionProjectMeta["translations"] | undefined,
  key: unknown
): boolean {
  return (
    typeof key === "string" &&
    Object.hasOwn(translations?.en ?? {}, key) &&
    typeof translations?.en?.[key] === "string" &&
    translations.en[key].trim().length > 0
  );
}

/** Reads a local image, or returns null for URLs and paths outside the project. */
export async function readImage(
  root: string,
  src: string,
  kind: ImageKind
): Promise<ImageFile | null> {
  if (isUrl(src)) return null;
  if (!isInsideRoot(root, src)) return null;
  const absolute = path.resolve(root, src);
  const extension = path.extname(src).toLowerCase();
  const { types } = IMAGE_RULES[kind];
  return {
    bytes: new Uint8Array(await readFile(absolute)),
    mimeType: types[extension] ?? "application/octet-stream",
    extension,
  };
}

export async function readScreenshots(
  root: string,
  meta: ExtensionProjectMeta
): Promise<(ImageFile | null)[]> {
  return Promise.all(
    (meta.screenshots ?? []).map((shot) =>
      readImage(root, shot.src, "screenshot")
    )
  );
}

/** Reports invalid icons, screenshots and caption keys in the manifest. */
export async function checkImages(
  root: string,
  meta: ExtensionProjectMeta
): Promise<string[]> {
  const messages = await checkIcon(root, meta);

  if (meta.screenshots === undefined) {
    return messages;
  }
  if (!Array.isArray(meta.screenshots)) {
    messages.push('"screenshots" must be a list.');
    return messages;
  }
  if (meta.screenshots.length > MAX_SCREENSHOTS) {
    messages.push(
      `"screenshots" has ${meta.screenshots.length} entries; the limit is ${MAX_SCREENSHOTS}.`
    );
  }
  for (const [index, shot] of meta.screenshots.entries()) {
    const entry = `"screenshots[${index}]"`;
    if (typeof shot !== "object" || shot === null || Array.isArray(shot)) {
      messages.push(
        `${entry} must be an object with an image src and optional caption key.`
      );
      continue;
    }
    const { src, caption } = shot;
    messages.push(
      ...(await checkImage(root, src, "screenshot", `${entry}.src`))
    );
    if (
      caption !== undefined &&
      !hasEnglishCaption(meta.translations, caption)
    ) {
      messages.push(
        `${entry}.caption is ${JSON.stringify(caption)}, but has no English text in translations.en.`
      );
    }
  }
  return messages;
}

async function checkImage(
  root: string,
  src: unknown,
  kind: ImageKind,
  entry: string
): Promise<string[]> {
  const { types, limit, pathMessage, tooLarge } = IMAGE_RULES[kind];
  if (typeof src !== "string" || src.length === 0) {
    return [`${entry} ${pathMessage}`];
  }
  if (isUrl(src)) {
    return /^https:\/\//i.test(src)
      ? []
      : [
          `${entry} is ${src}, but Seed Bible only shows ${kind}s from https: links.`,
        ];
  }
  if (/[?#]/.test(src)) {
    return [`${entry} is ${src}, but filenames must not contain ? or #.`];
  }
  if (
    !isInsideRoot(root, src) ||
    path.isAbsolute(src) ||
    /^[a-z][a-z\d+.-]*:/i.test(src)
  ) {
    return [`${entry} is ${src}, but must name a file inside the project.`];
  }
  if (!Object.hasOwn(types, path.extname(src).toLowerCase())) {
    return [
      `${entry} is ${src}, but it must be one of: ${Object.keys(types).join(", ")}.`,
    ];
  }
  let size: number;
  try {
    const file = await stat(path.resolve(root, src));
    if (!file.isFile()) throw new Error("not a file");
    size = file.size;
  } catch {
    return [`${entry} is ${src}, but there's no such file in the project.`];
  }
  if (size >= limit) {
    return [
      tooLarge?.(size) ??
        `${entry} is ${src} (${size} bytes); keep it under ${limit / 1024} KB (${limit} bytes).`,
    ];
  }
  return [];
}
