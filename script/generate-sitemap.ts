/**
 * Generates the Seed Bible sitemap: one child sitemap per translation (every
 * chapter of every book) plus a sitemap index and a robots.txt.
 *
 * Each chapter URL carries the UI locale (`?lang=`) that maps to the
 * translation's Bible language — Spanish translations get the Spanish UI,
 * English translations the English UI — so we never emit the full
 * translation × every-UI-language cross product. Translations in a language
 * with no supported UI locale are still listed, but without `?lang=` (the app
 * then resolves the visitor's language). Pass `--mapped-only` to emit only
 * translations that map to a supported UI locale.
 *
 * Output lands in the client build directory (`standalone/dist/client/` by
 * default), which the CD workflow's main-only sync uploads to the bucket root;
 * the host server already reverse-proxies `.xml`/`.txt` requests to the CDN, so
 * `/sitemap.xml`, `/sitemaps/*.xml`, and `/robots.txt` are served with no extra
 * server route.
 *
 * The Bible catalog is external, so the run is best-effort: a fetch failure
 * logs a warning and exits 0 (so a deploy is never blocked) unless `--strict`
 * is passed.
 *
 * Usage:
 *   pnpm sitemap
 *   pnpm sitemap --base-url=https://seedbible.org --endpoint=https://bible.helloao.org/
 *   pnpm sitemap --mapped-only --strict --out=standalone/dist/client
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  FreeUseBibleAPI,
  getDefaultAPIEndpoint,
  type Translation,
} from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import {
  bibleLanguageToUiLocale,
  buildTranslationParam,
  chapterUrlsForTranslation,
  chunk,
  renderSitemapIndex,
  renderUrlset,
  trimTrailingSlash,
  uniqueSitemapName,
  MAX_URLS_PER_SITEMAP,
  type BookChapters,
  type SitemapIndexEntry,
} from "./lib/sitemap";

const DEFAULT_ORIGIN = "https://seedbible.org";
const DEFAULT_OUT_DIR = path.join("standalone", "dist", "client");
const SITEMAPS_SUBDIR = "sitemaps";
const DEFAULT_CONCURRENCY = 8;

interface Options {
  origin: string;
  endpoint: string;
  outDir: string;
  mappedOnly: boolean;
  strict: boolean;
  concurrency: number;
}

function parseArgValue(flag: string): string | null {
  const prefix = `${flag}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function printUsage(): void {
  console.log(
    "Usage: pnpm sitemap [--base-url=<origin>] [--endpoint=<url>] [--out=<dir>] [--mapped-only] [--strict] [--concurrency=<n>]"
  );
  console.log("");
  console.log("Defaults:");
  console.log(`  --base-url   ${DEFAULT_ORIGIN} (or SITE_ORIGIN)`);
  console.log(
    "  --endpoint   the production default Bible API (or BIBLE_API_ENDPOINT)"
  );
  console.log(`  --out        ${DEFAULT_OUT_DIR}`);
  console.log(`  --concurrency ${DEFAULT_CONCURRENCY}`);
}

function resolveOptions(): Options {
  const origin = (
    parseArgValue("--base-url") ??
    process.env.SITE_ORIGIN ??
    DEFAULT_ORIGIN
  ).trim();

  // Mirror the app: no `useFreeBibleAPI` param → the private production mirror,
  // so translation IDs in the sitemap match what the live site serves.
  const endpoint = (
    parseArgValue("--endpoint") ??
    process.env.BIBLE_API_ENDPOINT ??
    getDefaultAPIEndpoint(new URL(origin))
  ).trim();

  const outDir = (parseArgValue("--out") ?? DEFAULT_OUT_DIR).trim();

  const concurrencyRaw = parseArgValue("--concurrency");
  const concurrency = concurrencyRaw
    ? Math.max(1, Number.parseInt(concurrencyRaw, 10) || DEFAULT_CONCURRENCY)
    : DEFAULT_CONCURRENCY;

  return {
    origin,
    endpoint,
    outDir,
    mappedOnly: hasFlag("--mapped-only"),
    strict: hasFlag("--strict"),
    concurrency,
  };
}

/**
 * Decides whether to skip generation, returning a human-readable reason or
 * `null` to proceed.
 *
 * Only the `main` deploy build's public files are synced to the bucket root, so
 * generating anywhere else just hammers the Bible API for output that is never
 * uploaded. Two cases skip:
 *   - A deploy build for a non-main branch (`DEPLOY_BRANCH` set and != "main").
 *   - Any other CI build. `ci.yml` runs `pnpm build` — twice per PR — with no
 *     `DEPLOY_BRANCH` set, purely to lint/test/size the bundle; it uploads
 *     nothing. Without this, every CI run would make live catalog fetches,
 *     adding an external-service dependency to an otherwise hermetic build.
 * Direct or local runs (not in CI, no `DEPLOY_BRANCH`) still generate, so
 * `pnpm sitemap` works for development.
 */
function skipReason(): string | null {
  const branch = process.env.DEPLOY_BRANCH?.trim();
  if (branch) {
    return branch === "main" ? null : `deploy build for branch "${branch}"`;
  }
  if (process.env.CI) {
    return "CI build without DEPLOY_BRANCH=main";
  }
  return null;
}

interface TranslationSitemap {
  translationId: string;
  urls: string[];
}

/** Runs `worker` over `items` with at most `limit` in flight at once. */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function run(): Promise<void> {
    while (true) {
      const index = cursor++;
      if (index >= items.length) {
        return;
      }
      results[index] = await worker(items[index]!, index);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
    run()
  );
  await Promise.all(workers);
  return results;
}

async function buildTranslationSitemap(
  api: FreeUseBibleAPI,
  origin: string,
  translation: Translation,
  mappedOnly: boolean,
  endpoint: string,
  defaultEndpoint: string
): Promise<TranslationSitemap | null> {
  const uiLocale = bibleLanguageToUiLocale(translation.language);
  if (mappedOnly && !uiLocale) {
    return null;
  }

  let books: BookChapters[];
  try {
    const response = await api.getTranslationBooks(translation.id);
    books = response.books.map((book) => ({
      bookId: book.id,
      firstChapterNumber: book.firstChapterNumber,
      numberOfChapters: book.numberOfChapters,
    }));
  } catch (error) {
    console.warn(
      `  ! Skipping ${translation.id} (${translation.language}): failed to load books — ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return null;
  }

  // Match the app's canonical `translation` param exactly (bare id for the
  // default endpoint, full books.json URL otherwise); the filename keeps the
  // raw id.
  const translationParam = buildTranslationParam(
    translation.id,
    endpoint,
    defaultEndpoint
  );

  const urls = chapterUrlsForTranslation(
    origin,
    translationParam,
    uiLocale,
    books
  );
  if (urls.length === 0) {
    return null;
  }

  return { translationId: translation.id, urls };
}

async function generate(options: Options): Promise<void> {
  const { origin, endpoint, outDir } = options;

  console.log(`Origin:      ${origin}`);
  console.log(`Endpoint:    ${endpoint}`);
  console.log(`Output:      ${outDir}`);
  console.log(`Mapped only: ${options.mappedOnly}`);
  console.log("");

  const defaultEndpoint = getDefaultAPIEndpoint(new URL(origin));

  const api = new FreeUseBibleAPI(endpoint);
  const { translations } = await api.getAvailableTranslations();
  console.log(`Fetched ${translations.length} translations.`);

  const built = await mapWithConcurrency(
    translations,
    options.concurrency,
    (translation) =>
      buildTranslationSitemap(
        api,
        origin,
        translation,
        options.mappedOnly,
        endpoint,
        defaultEndpoint
      )
  );

  const sitemaps = built.filter(
    (entry): entry is TranslationSitemap => entry !== null
  );

  if (sitemaps.length === 0) {
    throw new Error(
      "No translation sitemaps could be built (every translation failed or was filtered out)."
    );
  }

  // Write fresh: clear any stale child sitemaps from a previous run.
  const sitemapsDir = path.join(outDir, SITEMAPS_SUBDIR);
  await rm(sitemapsDir, { recursive: true, force: true });
  await mkdir(sitemapsDir, { recursive: true });

  const usedNames = new Set<string>();
  const indexEntries: SitemapIndexEntry[] = [];
  let totalUrls = 0;

  for (const sitemap of sitemaps) {
    totalUrls += sitemap.urls.length;
    // A single translation is well under the 50k cap, but chunk defensively so
    // any file we emit stays spec-compliant.
    const parts = chunk(sitemap.urls, MAX_URLS_PER_SITEMAP);
    const multi = parts.length > 1;

    for (let i = 0; i < parts.length; i++) {
      const suffix = multi ? `-${i + 1}` : "";
      const name = uniqueSitemapName(
        `${sitemap.translationId}${suffix}`,
        usedNames
      );
      const fileName = `${name}.xml`;
      await writeFile(
        path.join(sitemapsDir, fileName),
        renderUrlset(parts[i]!),
        "utf-8"
      );
      indexEntries.push({
        loc: `${trimTrailingSlash(origin)}/${SITEMAPS_SUBDIR}/${fileName}`,
      });
    }
  }

  // The index itself must also stay under the 50k-entry cap.
  const indexChunks = chunk(indexEntries, MAX_URLS_PER_SITEMAP);
  if (indexChunks.length <= 1) {
    await writeFile(
      path.join(outDir, "sitemap.xml"),
      renderSitemapIndex(indexEntries),
      "utf-8"
    );
  } else {
    // Fan out into sitemap-1.xml … and a root index-of-indexes.
    const rootEntries: SitemapIndexEntry[] = [];
    for (let i = 0; i < indexChunks.length; i++) {
      const fileName = `sitemap-${i + 1}.xml`;
      await writeFile(
        path.join(outDir, fileName),
        renderSitemapIndex(indexChunks[i]!),
        "utf-8"
      );
      rootEntries.push({
        loc: `${trimTrailingSlash(origin)}/${fileName}`,
      });
    }
    await writeFile(
      path.join(outDir, "sitemap.xml"),
      renderSitemapIndex(rootEntries),
      "utf-8"
    );
  }

  await writeFile(
    path.join(outDir, "robots.txt"),
    renderRobots(origin),
    "utf-8"
  );

  console.log("");
  console.log(
    `Wrote ${indexEntries.length} child sitemap(s), ${totalUrls} URLs total.`
  );
  console.log(`  ${path.join(outDir, "sitemap.xml")}`);
  console.log(`  ${path.join(outDir, "robots.txt")}`);
}

function renderRobots(origin: string): string {
  return (
    `User-agent: *\n` +
    `Allow: /\n` +
    `\n` +
    `Sitemap: ${trimTrailingSlash(origin)}/sitemap.xml\n`
  );
}

async function main(): Promise<void> {
  if (hasFlag("--help") || hasFlag("-h")) {
    printUsage();
    return;
  }

  const skip = skipReason();
  if (skip) {
    console.log(
      `Skipping sitemap generation (${skip}); only the main build's public files are deployed.`
    );
    return;
  }

  const options = resolveOptions();

  try {
    await generate(options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (options.strict) {
      throw error;
    }
    console.warn(`Sitemap generation failed (non-fatal): ${message}`);
    console.warn(
      "Continuing without a sitemap. Pass --strict to fail instead."
    );
  }
}

main().catch((error) => {
  console.error("Failed to generate sitemap:", error);
  process.exitCode = 1;
});
