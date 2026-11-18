import type { BibleDataManager } from "./BibleDataManager";
import { extractContentText } from "./ChapterText";
import type {
  ChapterContent,
  ChapterVerse,
  Commentary,
  CommentaryBook,
  CommentaryProfile,
  Dataset,
  Translation,
  TranslationBook,
} from "./FreeUseBibleAPI";
import type { SearchManager } from "./SearchManager";
import type { OfflineTranslationsManager } from "./OfflineTranslationsManager";
import { SandboxBrokerError } from "./ExtensionSandboxErrors";
import type {
  SandboxBook,
  SandboxChapterContent,
  SandboxChapterRef,
  SandboxCommentary,
  SandboxCommentaryBook,
  SandboxCommentaryProfile,
  SandboxDataset,
  SandboxMethod,
  SandboxMethods,
  SandboxReference,
  SandboxTranslation,
} from "../extensions/protocol";

/** What `sb.bible` reads from the app: all of it through `BibleDataManager`. */
export type SandboxBibleData = Pick<
  BibleDataManager,
  | "getTranslationCatalog"
  | "getTranslationBooks"
  | "getTranslationBookChapter"
  | "getCommentaries"
  | "getCommentaryBooks"
  | "getCommentaryBookChapter"
  | "getCommentaryProfiles"
  | "getCommentaryProfile"
  | "getDatasets"
  | "getDatasetBooks"
  | "getDatasetBookChapter"
> & { offline: Pick<OfflineTranslationsManager, "isDownloaded"> };

type BibleMethod = Extract<SandboxMethod, `bible.${string}`>;

export type SandboxBibleHandlers = {
  [M in BibleMethod]: (
    params: SandboxMethods[M]["params"]
  ) => Promise<SandboxMethods[M]["result"]>;
};

/**
 * Turns the API's responses into the plain shapes `sb.bible` promises, so an
 * extension never sees API links (which, for a downloaded translation, point
 * at nothing) or a change in the API's format.
 */
export function createSandboxBible(
  bibleData: SandboxBibleData,
  search: Pick<SearchManager, "searchVerses">
): SandboxBibleHandlers {
  /**
   * Reads from the app's data, passing on a failure (offline, or no such
   * thing) as `unavailable`. Only the read is covered: a mistake in turning
   * the result into the extension's shape is a bug, which the broker logs
   * and reports as `internal`.
   */
  const load = async <T>(what: string, read: () => Promise<T>) => {
    try {
      return await read();
    } catch {
      throw new SandboxBrokerError("unavailable", `Couldn't load ${what}.`);
    }
  };

  const translation = (value: Translation): SandboxTranslation => ({
    id: value.id,
    name: value.name,
    englishName: value.englishName,
    shortName: value.shortName,
    language: value.language,
    languageName: value.languageName ?? null,
    languageEnglishName: value.languageEnglishName ?? null,
    textDirection: value.textDirection,
    website: value.website,
    licenseUrl: value.licenseUrl,
    licenseNotice: value.licenseNotice ?? null,
    numberOfBooks: value.numberOfBooks,
    totalNumberOfChapters: value.totalNumberOfChapters,
    totalNumberOfVerses: value.totalNumberOfVerses,
    downloaded: bibleData.offline.isDownloaded(value.id),
  });

  const commentary = (value: Commentary): SandboxCommentary => ({
    id: value.id,
    name: value.name,
    englishName: value.englishName,
    language: value.language,
    languageName: value.languageName ?? null,
    languageEnglishName: value.languageEnglishName ?? null,
    textDirection: value.textDirection,
    website: value.website,
    licenseUrl: value.licenseUrl,
    numberOfBooks: value.numberOfBooks,
    totalNumberOfChapters: value.totalNumberOfChapters,
    totalNumberOfVerses: value.totalNumberOfVerses,
  });

  const profile = (value: CommentaryProfile): SandboxCommentaryProfile => ({
    id: value.id,
    subject: value.subject,
    reference: value.reference && {
      bookId: value.reference.book,
      chapter: value.reference.chapter,
      verse: value.reference.verse,
      ...optionalRange(value.reference),
    },
  });

  const dataset = (value: Dataset): SandboxDataset => ({
    id: value.id,
    name: value.name,
    englishName: value.englishName,
    language: value.language,
    languageName: value.languageName ?? null,
    languageEnglishName: value.languageEnglishName ?? null,
    textDirection: value.textDirection,
    website: value.website,
    licenseUrl: value.licenseUrl,
    numberOfBooks: value.numberOfBooks,
    totalNumberOfChapters: value.totalNumberOfChapters,
    totalNumberOfVerses: value.totalNumberOfVerses,
    totalNumberOfReferences: value.totalNumberOfReferences,
  });

  return {
    "bible.translations": async () =>
      (
        await load("the list of translations", () =>
          bibleData.getTranslationCatalog()
        )
      ).map(translation),

    "bible.books": async ({ translationId }) => {
      const data = await load(`the books of ${translationId}`, () =>
        bibleData.getTranslationBooks(translationId)
      );
      return {
        translation: translation(data.translation),
        books: data.books.map(book),
      };
    },

    "bible.chapter": async ({ translationId, bookId, chapter }) => {
      const data = await load(`${translationId} ${bookId} ${chapter}`, () =>
        bibleData.getTranslationBookChapter(translationId, bookId, chapter)
      );
      const verses = data.chapter.content.filter(
        (item): item is ChapterVerse => item.type === "verse"
      );
      return {
        translationId,
        bookId,
        chapter,
        verses: verses.map((verse) => ({
          number: verse.number,
          text: extractContentText(verse.content),
        })),
        content: data.chapter.content.flatMap(chapterContent),
        footnotes: (data.chapter.footnotes ?? []).map((note) => ({
          id: note.noteId,
          text: note.text,
          caller: note.caller ?? null,
          verse: note.reference?.verse ?? null,
        })),
        next: chapterRefFromLink(data.nextChapterApiLink),
        previous: chapterRefFromLink(data.previousChapterApiLink),
      };
    },

    "bible.commentaries": async () =>
      (
        await load("the list of commentaries", () =>
          bibleData.getCommentaries()
        )
      ).map(commentary),

    "bible.commentaryBooks": async ({ commentaryId }) => {
      const data = await load(`the books of ${commentaryId}`, () =>
        bibleData.getCommentaryBooks(commentaryId)
      );
      return {
        commentary: commentary(data.commentary),
        books: data.books.map(commentaryBook),
      };
    },

    "bible.commentaryChapter": async ({ commentaryId, bookId, chapter }) => {
      const data = await load(`${commentaryId} ${bookId} ${chapter}`, () =>
        bibleData.getCommentaryBookChapter(commentaryId, bookId, chapter)
      );
      return {
        commentaryId,
        bookId,
        chapter,
        introduction: data.chapter.introduction ?? null,
        verses: data.chapter.content.map((verse) => ({
          number: verse.number,
          text: extractContentText(verse.content),
        })),
        next: chapterRefFromLink(data.nextChapterApiLink),
        previous: chapterRefFromLink(data.previousChapterApiLink),
      };
    },

    "bible.commentaryProfiles": async ({ commentaryId }) =>
      (
        await load(`the profiles of ${commentaryId}`, () =>
          bibleData.getCommentaryProfiles(commentaryId)
        )
      ).map(profile),

    "bible.commentaryProfile": async ({ commentaryId, profileId }) => {
      const data = await load(`${commentaryId} profile ${profileId}`, () =>
        bibleData.getCommentaryProfile(commentaryId, profileId)
      );
      return { ...profile(data.profile), content: data.content };
    },

    "bible.search": async ({
      translationId,
      query,
      bookId,
      chapter,
      page,
      perPage,
    }) => {
      const response = await load(`search results for "${query}"`, async () => {
        // The index has a collection per language, so the translation's own
        // language decides where to look. Its catalog is cached (or
        // downloaded), so this rarely costs a request.
        const { language } = (
          await bibleData.getTranslationBooks(translationId)
        ).translation;
        return search.searchVerses(
          language,
          translationId,
          query,
          { book: bookId, chapter },
          { page, perPage }
        );
      });
      return {
        results: (response.hits ?? []).map(({ document }) => ({
          translationId: document.translation,
          bookId: document.book,
          chapter: document.chapter,
          verse: document.verse,
          text: document.text,
          reference: document.reference,
        })),
        found: response.found,
        page: response.page,
      };
    },

    "bible.datasets": async () =>
      (await load("the list of datasets", () => bibleData.getDatasets())).map(
        dataset
      ),

    "bible.datasetBooks": async ({ datasetId }) => {
      const data = await load(`the books of ${datasetId}`, () =>
        bibleData.getDatasetBooks(datasetId)
      );
      return {
        dataset: dataset(data.dataset),
        books: data.books.map((entry) => ({
          id: entry.id,
          order: entry.order,
          numberOfChapters: entry.numberOfChapters,
          firstChapterNumber: entry.firstChapterNumber,
          lastChapterNumber: entry.lastChapterNumber,
          totalNumberOfVerses: entry.totalNumberOfVerses,
          totalNumberOfReferences: entry.totalNumberOfReferences,
        })),
      };
    },

    "bible.datasetChapter": async ({ datasetId, bookId, chapter }) => {
      const data = await load(`${datasetId} ${bookId} ${chapter}`, () =>
        bibleData.getDatasetBookChapter(datasetId, bookId, chapter)
      );
      return {
        datasetId,
        bookId,
        chapter,
        verses: data.chapter.content.map((entry) => ({
          verse: entry.verse,
          references: entry.references.map((reference) => ({
            bookId: reference.book,
            chapter: reference.chapter,
            verse: reference.verse,
            ...optionalRange(reference),
            ...(reference.score === undefined
              ? {}
              : { score: reference.score }),
          })),
        })),
      };
    },
  };
}

/**
 * The book and chapter an API chapter link names, like `GEN 2` from
 * `/api/BSB/GEN/2.json` or `/api/c/adam-clarke/GEN/2.json`. The API's own
 * next/previous links skip what doesn't exist (such as a commentary book
 * with only an introduction), and a downloaded chapter's links follow the
 * same pattern, so this is always the real neighbour.
 */
function chapterRefFromLink(link: string | null): SandboxChapterRef | null {
  const match = link?.match(/\/([^/]+)\/(\d+)\.json$/);
  return match
    ? { bookId: decodeURIComponent(match[1]!), chapter: Number(match[2]) }
    : null;
}

function book(value: TranslationBook): SandboxBook {
  return {
    id: value.id,
    name: value.name,
    commonName: value.commonName,
    title: value.title ?? null,
    order: value.order,
    numberOfChapters: value.numberOfChapters,
    firstChapterNumber: value.firstChapterNumber,
    lastChapterNumber: value.lastChapterNumber,
    totalNumberOfVerses: value.totalNumberOfVerses,
    isApocryphal: value.isApocryphal ?? false,
  };
}

function commentaryBook(value: CommentaryBook): SandboxCommentaryBook {
  return {
    id: value.id,
    name: value.name,
    commonName: value.commonName,
    order: value.order,
    introduction: value.introduction ?? null,
    numberOfChapters: value.numberOfChapters,
    firstChapterNumber: value.firstChapterNumber,
    lastChapterNumber: value.lastChapterNumber,
    totalNumberOfVerses: value.totalNumberOfVerses,
  };
}

/** `endChapter`/`endVerse`, left out rather than `undefined` when absent. */
function optionalRange(value: {
  endChapter?: number;
  endVerse?: number;
}): Pick<SandboxReference, "endChapter" | "endVerse"> {
  return {
    ...(value.endChapter === undefined ? {} : { endChapter: value.endChapter }),
    ...(value.endVerse === undefined ? {} : { endVerse: value.endVerse }),
  };
}

/** The ids of the footnotes marked in a verse or subtitle. */
function footnoteIds(parts: readonly (string | object)[]): number[] {
  return parts.flatMap((part) =>
    typeof part === "object" &&
    "noteId" in part &&
    typeof part.noteId === "number"
      ? [part.noteId]
      : []
  );
}

/** One piece of a chapter; none for a kind the API adds later. */
function chapterContent(item: ChapterContent): SandboxChapterContent[] {
  switch (item.type) {
    case "heading":
      return [{ type: "heading", text: extractContentText(item.content) }];
    case "line_break":
      return [{ type: "lineBreak" }];
    case "hebrew_subtitle":
      return [
        {
          type: "hebrewSubtitle",
          text: extractContentText(item.content),
          footnotes: footnoteIds(item.content),
        },
      ];
    case "verse":
      return [
        {
          type: "verse",
          number: item.number,
          text: extractContentText(item.content),
          footnotes: footnoteIds(item.content),
        },
      ];
    default:
      return [];
  }
}
