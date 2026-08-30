/**
 * Manually submits the site's chapter URLs to IndexNow (https://www.indexnow.org)
 * so participating search engines (Bing, Yandex, Naver, Seznam.cz, Yep) can pick
 * up new/changed pages without waiting for their own crawl schedule.
 *
 * For every chapter, the Free Use Bible API's per-chapter `sha256` is compared
 * against a local submission log (see `script/lib/indexNow.ts`); only chapters
 * that are new or whose hash changed since the last successful submission are
 * sent. The log is git-ignored and lives locally — re-running this script from
 * a clean checkout resubmits everything once, then goes back to incremental.
 *
 * IndexNow verification requires a `<key>.txt` file containing the key,
 * reachable at `keyLocation` on the same host as the submitted URLs.
 * `script/generate-sitemap.ts` ships that file automatically (alongside
 * robots.txt/sitemap.xml) whenever `INDEXNOW_KEY` is set at build time; the
 * same key must be passed here via `INDEXNOW_KEY` or `--key`.
 *
 * Usage:
 *   INDEXNOW_KEY=... pnpm index-sitemap-urls
 *   pnpm index-sitemap-urls --key=... --dry-run
 *   pnpm index-sitemap-urls --key=... --all-translations --concurrency=4
 */
import { program } from "commander";
import {
  FreeUseBibleAPI,
  getDefaultAPIEndpoint,
  type Translation,
  type TranslationBook,
} from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import {
  bibleLanguageToUiLocale,
  buildChapterUrl,
  buildTranslationParam,
  chunk,
  ensureTrailingSlash,
} from "./lib/sitemap";
import { mapWithConcurrency } from "./lib/concurrency";
import {
  DEFAULT_INDEXNOW_ENDPOINT,
  INDEXNOW_MAX_URLS_PER_REQUEST,
  buildIndexNowPayload,
  readSubmissionLog,
  submitIndexNowBatch,
  writeSubmissionLog,
} from "./lib/indexNow";

const DEFAULT_ORIGIN = "https://seedbible.org";
const DEFAULT_LOG_FILE = "script/.indexnow-log.json";
const DEFAULT_CONCURRENCY = 8;

interface Options {
  origin: string;
  endpoint: string;
  key: string;
  logFile: string;
  allTranslations: boolean;
  concurrency: number;
  dryRun: boolean;
  indexNowEndpoint: string;
}

function resolveOptions(cli: {
  baseUrl?: string;
  endpoint?: string;
  key?: string;
  log?: string;
  allTranslations?: boolean;
  concurrency?: string;
  dryRun?: boolean;
  indexnowEndpoint?: string;
}): Options {
  const origin = (
    cli.baseUrl ??
    process.env.SITE_ORIGIN ??
    DEFAULT_ORIGIN
  ).trim();

  // Mirrors generate-sitemap.ts: no `useFreeBibleAPI` param → the private
  // production mirror, so URLs match what the live site serves.
  const endpoint = (
    cli.endpoint ??
    process.env.BIBLE_API_ENDPOINT ??
    getDefaultAPIEndpoint(new URL(origin))
  ).trim();

  const key = (cli.key ?? process.env.INDEXNOW_KEY ?? "").trim();
  if (!key) {
    throw new Error(
      "An IndexNow key is required. Pass --key=<key> or set the INDEXNOW_KEY environment variable."
    );
  }

  const concurrency = cli.concurrency
    ? Math.max(1, Number.parseInt(cli.concurrency, 10) || DEFAULT_CONCURRENCY)
    : DEFAULT_CONCURRENCY;

  return {
    origin,
    endpoint,
    key,
    logFile: cli.log ?? DEFAULT_LOG_FILE,
    allTranslations: Boolean(cli.allTranslations),
    concurrency,
    dryRun: Boolean(cli.dryRun),
    indexNowEndpoint: cli.indexnowEndpoint ?? DEFAULT_INDEXNOW_ENDPOINT,
  };
}

interface ChapterCheck {
  path: string;
  url: string;
  sha256: string | null;
}

async function checkChapter(
  api: FreeUseBibleAPI,
  origin: string,
  translationParam: string,
  translation: Translation,
  book: TranslationBook,
  chapter: number,
  uiLocale: string | null
): Promise<ChapterCheck | null> {
  const url = buildChapterUrl(origin, {
    translationId: translationParam,
    bookId: book.id,
    chapter,
    uiLocale,
  });
  const path = new URL(url).pathname;

  let response;
  try {
    response = await api.getTranslationBookChapter(
      translation.id,
      book.id,
      chapter
    );
  } catch (error) {
    console.warn(
      `  ! Skipping ${translation.id}/${book.id}/${chapter}: failed to fetch chapter — ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return null;
  }

  return { path, url, sha256: response.sha256 ?? null };
}

async function main(): Promise<void> {
  program
    .name("index-sitemap-urls")
    .description(
      "Submits new/changed chapter URLs to IndexNow so search engines pick them up faster."
    )
    .option(
      "--base-url <origin>",
      `Site origin. Defaults to ${DEFAULT_ORIGIN} (or SITE_ORIGIN).`
    )
    .option(
      "--endpoint <url>",
      "Bible API endpoint. Defaults to the production default (or BIBLE_API_ENDPOINT)."
    )
    .option(
      "--key <key>",
      "IndexNow key. Defaults to the INDEXNOW_KEY environment variable."
    )
    .option(
      "--log <file>",
      `Path to the local submission log. Defaults to ${DEFAULT_LOG_FILE}.`
    )
    .option(
      "--all-translations",
      "Walk every translation instead of only ones mapped to a supported UI locale."
    )
    .option(
      "--concurrency <n>",
      `Max chapter fetches in flight at once. Defaults to ${DEFAULT_CONCURRENCY}.`
    )
    .option(
      "--dry-run",
      "Compute what would be submitted without submitting or touching the log."
    )
    .option(
      "--indexnow-endpoint <url>",
      `IndexNow submission endpoint. Defaults to ${DEFAULT_INDEXNOW_ENDPOINT}.`
    )
    .parse();

  const options = resolveOptions(program.opts());

  console.log(`Origin:            ${options.origin}`);
  console.log(`Endpoint:          ${options.endpoint}`);
  console.log(`Log file:          ${options.logFile}`);
  console.log(`All translations:  ${options.allTranslations}`);
  console.log(`Dry run:           ${options.dryRun}`);
  console.log("");

  const defaultEndpoint = getDefaultAPIEndpoint(new URL(options.origin));
  const api = new FreeUseBibleAPI(options.endpoint);
  const log = await readSubmissionLog(options.logFile);

  const { translations } = await api.getAvailableTranslations();
  console.log(`Fetched ${translations.length} translations.`);

  const targetTranslations = options.allTranslations
    ? translations
    : translations.filter((t) => bibleLanguageToUiLocale(t.language));
  console.log(
    `Walking ${targetTranslations.length} translation(s)${
      options.allTranslations ? "" : " (mapped to a supported UI locale)"
    }.`
  );

  let checked = 0;
  let skippedUnchanged = 0;
  const pending: ChapterCheck[] = [];

  for (const translation of targetTranslations) {
    const uiLocale = bibleLanguageToUiLocale(translation.language);

    let books: TranslationBook[];
    try {
      const response = await api.getTranslationBooks(translation.id);
      books = response.books;
    } catch (error) {
      console.warn(
        `  ! Skipping translation ${translation.id}: failed to load books — ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      continue;
    }

    const translationParam = buildTranslationParam(
      translation.id,
      options.endpoint,
      defaultEndpoint
    );

    const chapterRefs: { book: TranslationBook; chapter: number }[] = [];
    for (const book of books) {
      if (book.numberOfChapters <= 0) {
        continue;
      }
      for (let i = 0; i < book.numberOfChapters; i++) {
        chapterRefs.push({ book, chapter: book.firstChapterNumber + i });
      }
    }

    const results = await mapWithConcurrency(
      chapterRefs,
      options.concurrency,
      ({ book, chapter }) =>
        checkChapter(
          api,
          options.origin,
          translationParam,
          translation,
          book,
          chapter,
          uiLocale
        )
    );

    for (const result of results) {
      if (!result) {
        continue;
      }
      checked++;

      if (result.sha256 === null) {
        console.warn(
          `  ! ${result.path} has no sha256 in the API response; submitting anyway.`
        );
        pending.push(result);
        continue;
      }

      const previous = log[result.path];
      if (previous && previous.submittedSha256 === result.sha256) {
        skippedUnchanged++;
        continue;
      }

      pending.push(result);
    }
  }

  console.log("");
  console.log(`Checked ${checked} chapter(s).`);
  console.log(`  ${skippedUnchanged} unchanged (skipped).`);
  console.log(`  ${pending.length} new/changed.`);

  if (pending.length === 0) {
    console.log("Nothing to submit.");
    return;
  }

  if (options.dryRun) {
    console.log("");
    console.log("Dry run — would submit:");
    for (const entry of pending.slice(0, 20)) {
      console.log(`  ${entry.url}`);
    }
    if (pending.length > 20) {
      console.log(`  ... and ${pending.length - 20} more.`);
    }
    return;
  }

  const host = new URL(options.origin).host;
  const keyLocation = new URL(
    `${options.key}.txt`,
    ensureTrailingSlash(options.origin)
  ).toString();

  const batches = chunk(pending, INDEXNOW_MAX_URLS_PER_REQUEST);
  let submitted = 0;
  let failed = 0;

  for (const batch of batches) {
    const payload = buildIndexNowPayload({
      host,
      key: options.key,
      keyLocation,
      urlList: batch.map((entry) => entry.url),
    });

    try {
      await submitIndexNowBatch(payload, options.indexNowEndpoint);
    } catch (error) {
      failed += batch.length;
      console.error(
        `Batch of ${batch.length} URL(s) failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      continue;
    }

    const submittedAt = new Date().toISOString();
    for (const entry of batch) {
      if (entry.sha256 !== null) {
        log[entry.path] = {
          path: entry.path,
          submittedSha256: entry.sha256,
          submittedAt,
        };
      }
    }
    await writeSubmissionLog(options.logFile, log);
    submitted += batch.length;
    console.log(`  Submitted batch of ${batch.length} URL(s).`);
  }

  console.log("");
  console.log(`Submitted ${submitted} URL(s).`);
  if (failed > 0) {
    console.log(`${failed} URL(s) failed to submit.`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("IndexNow submission failed:", error);
  process.exitCode = 1;
});
