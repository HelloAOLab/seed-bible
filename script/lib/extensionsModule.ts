/**
 * Source generation for the `virtual:@extensions` module family.
 *
 * Kept separate from the Vite plugin so it can be unit tested without running
 * a build, the same split `precacheManifest.ts` uses.
 */

export interface ExtensionTranslationFile {
  title: string;
  description: string;
  [key: string]: string;
}

export interface ExtensionMetaFile {
  id: string;
  translations: Record<string, ExtensionTranslationFile>;
  dependencies?: string[];
  autoinstall?: boolean;
}

/** An extension package discovered under `packages/`, with its parsed meta. */
export interface DiscoveredExtension {
  /** The directory name under `packages/`, used to build import specifiers. */
  folder: string;
  meta: ExtensionMetaFile;
}

export const VIRTUAL_ID = "virtual:@extensions";
export const RESOLVED_ID = "\0" + VIRTUAL_ID;

/** `virtual:@extensions/locale/es` → one chunk of list strings for Spanish. */
export const LOCALE_VIRTUAL_PREFIX = "virtual:@extensions/locale/";
export const RESOLVED_LOCALE_PREFIX = "\0" + LOCALE_VIRTUAL_PREFIX;

/**
 * The language of a resolved locale-module id, or null if the id is not one.
 * Only well-formed language subtags are accepted, so a stray id cannot make
 * the plugin emit a module for it.
 */
export function parseLocaleModuleId(resolvedId: string): string | null {
  if (!resolvedId.startsWith(RESOLVED_LOCALE_PREFIX)) {
    return null;
  }
  const lang = resolvedId.slice(RESOLVED_LOCALE_PREFIX.length);
  return /^[A-Za-z]{2,3}(-[A-Za-z0-9]+)*$/.test(lang) ? lang : null;
}

// U+2028/U+2029 are valid JSON string characters but, unescaped, are illegal
// in JS string literals in some contexts — escape them before inlining.
function toJsLiteral(value: unknown): string {
  return JSON.stringify(value)
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Every language any extension has strings for, sorted. Extensions do not all
 * carry the same set, so this is a union rather than the first one's keys.
 */
export function listExtensionLanguages(
  extensions: DiscoveredExtension[]
): string[] {
  const languages = new Set<string>();
  for (const { meta } of extensions) {
    for (const lang of Object.keys(meta.translations ?? {})) {
      languages.add(lang);
    }
  }
  return [...languages].sort();
}

/**
 * The `title`/`description` every extension offers in one language — the only
 * strings the Settings extensions list needs before anything is installed.
 *
 * This is its own module per language so a reader downloads one language's
 * worth of list strings on demand instead of all of them at boot. Inlining
 * every language cost 138 KB (72.5 KB gzipped) in the entry chunk.
 *
 * Extensions with no entry for the language are omitted rather than emitted as
 * `undefined`, so the caller can register the result as-is.
 */
export function generateLocaleModuleSource(
  extensions: DiscoveredExtension[],
  language: string
): string {
  const entries: Record<string, { title: string; description: string }> = {};
  for (const { meta } of extensions) {
    const translation = meta.translations?.[language];
    if (!translation) {
      continue;
    }
    entries[meta.id] = {
      title: translation.title,
      description: translation.description,
    };
  }
  return `export default ${toJsLiteral(entries)};\n`;
}

/** The English fallback baked into the entry chunk. */
export const FALLBACK_LANGUAGE = "en";

/**
 * Reduces an extension's meta to what the boot path actually needs:
 * `id`/`dependencies`/`autoinstall`, which resolve install order and
 * auto-install eligibility, plus English `title`/`description`.
 *
 * English stays inline for two reasons: `ExtensionMeta` requires it (it is
 * i18next's `fallbackLng`, so it is what renders when a language has no string
 * of its own), and it means the extensions list shows real titles rather than
 * raw ids in the moment before a locale chunk arrives. One language costs
 * about 1.8 KB; it was all 77 of them that cost 138 KB.
 *
 * Every other language lives in the per-language modules above, and every key
 * beyond `title`/`description` is behind `loadFullTranslations`.
 */
export function trimMeta(meta: ExtensionMetaFile): ExtensionMetaFile {
  const english = meta.translations?.[FALLBACK_LANGUAGE];
  return {
    id: meta.id,
    translations: {
      // An extension.json with no English block is malformed, but failing the
      // whole build over it helps nobody — degrade to the id.
      [FALLBACK_LANGUAGE]: {
        title: english?.title ?? meta.id,
        description: english?.description ?? "",
      },
    },
    ...(meta.dependencies ? { dependencies: meta.dependencies } : {}),
    ...(meta.autoinstall !== undefined
      ? { autoinstall: meta.autoinstall }
      : {}),
  };
}

/**
 * The `virtual:@extensions` entry module: the `ExtensionSet` for the app.
 *
 * Each extension's code and full translations are `() => import(...)` thunks so
 * Vite code-splits them, and `loadListTranslations` does the same per language.
 */
export function generateEntryModuleSource(
  extensions: DiscoveredExtension[],
  setId: string
): string {
  const entries = extensions
    .map(
      ({ folder, meta }) => `  {
    meta: ${toJsLiteral(trimMeta(meta))},
    loadFullTranslations: () => import("@packages/${folder}/extension.json").then((m) => m.default.translations),
    import: () => import("@packages/${folder}/index"),
  },`
    )
    .join("\n");

  const localeEntries = listExtensionLanguages(extensions)
    // English is already inline via `trimMeta`, so there is nothing to fetch
    // for it — which is also the common case.
    .filter((lang) => lang !== FALLBACK_LANGUAGE)
    .map(
      (lang) =>
        `  ${toJsLiteral(lang)}: () => import(${toJsLiteral(
          LOCALE_VIRTUAL_PREFIX + lang
        )}).then((m) => m.default),`
    )
    .join("\n");

  return `const extensions = [
${entries}
];

const loadListTranslations = {
${localeEntries}
};

export default { id: ${JSON.stringify(setId)}, extensions, loadListTranslations };
`;
}
