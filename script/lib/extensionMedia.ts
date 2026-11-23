import { stat } from "node:fs/promises";
import path from "node:path";

export const ICON_TYPES: Readonly<Record<string, string>> = {
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

export const SCREENSHOT_TYPES: Readonly<Record<string, string>> = {
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

export const MAX_ICON_BYTES = 256 * 1024;
export const MAX_SCREENSHOT_BYTES = 1024 * 1024;
export const MAX_SCREENSHOTS = 8;

interface ExtensionMedia {
  icon?: unknown;
  screenshots?: unknown;
  translations?: Record<string, Record<string, unknown>>;
}

function hasEnglishCaption(
  translations: ExtensionMedia["translations"],
  key: unknown
): boolean {
  return (
    typeof key === "string" &&
    Object.hasOwn(translations?.en ?? {}, key) &&
    typeof translations?.en?.[key] === "string" &&
    translations.en[key].trim().length > 0
  );
}

export async function checkExtensionMedia(
  dir: string,
  meta: ExtensionMedia
): Promise<string[]> {
  const messages: string[] = [];
  const checkFile = async (
    entry: string,
    src: unknown,
    types: Readonly<Record<string, string>>,
    limit: number
  ) => {
    if (typeof src !== "string" || src.length === 0) {
      messages.push(
        `${entry} must be the path to an image in the extension package.`
      );
      return;
    }
    if (/[?#]/.test(src)) {
      messages.push(
        `${entry} is ${src}, but filenames must not contain ? or #.`
      );
      return;
    }
    const relative = path.relative(dir, path.resolve(dir, src));
    if (
      path.isAbsolute(src) ||
      relative === ".." ||
      relative.startsWith(`..${path.sep}`) ||
      /^[a-z][a-z\d+.-]*:/i.test(src)
    ) {
      messages.push(
        `${entry} is ${src}, but must name a file inside the extension package.`
      );
      return;
    }
    if (!Object.hasOwn(types, path.extname(src).toLowerCase())) {
      messages.push(
        `${entry} is ${src}, but it must be one of: ${Object.keys(types).join(", ")}.`
      );
      return;
    }
    let size: number;
    try {
      const file = await stat(path.resolve(dir, src));
      if (!file.isFile()) {
        throw new Error("not a file");
      }
      size = file.size;
    } catch {
      messages.push(
        `${entry} is ${src}, but there's no such file in the extension package.`
      );
      return;
    }
    if (size >= limit) {
      messages.push(
        `${entry} is ${src} (${size} bytes); keep it under ${limit / 1024} KB (${limit} bytes).`
      );
    }
  };

  if (meta.icon !== undefined) {
    await checkFile('"icon"', meta.icon, ICON_TYPES, MAX_ICON_BYTES);
  }
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
    await checkFile(
      `${entry}.src`,
      src,
      SCREENSHOT_TYPES,
      MAX_SCREENSHOT_BYTES
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
