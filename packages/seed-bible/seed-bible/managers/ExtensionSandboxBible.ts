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
import {
  adjacentChapterRef,
  type ChapterRef,
  type OfflineTranslationsManager,
} from "./OfflineTranslationsManager";
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

/** Something `sb.bible` couldn't load: offline, or no such thing. */
export class SandboxBibleUnavailableError extends Error {}

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
  const load = async <T>(what: string, read: () => Promise<T>) => {
    try {
      return await read();
    } catch {
      throw new SandboxBibleUnavailableError(`Couldn't load ${what}.`);
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

  /**
   * The chapters around this one, by the translation's own book order. A
   * catalog that can't be loaded just leaves them unknown: the chapter
   * itself loaded, and that's what was asked for.
   */
  const neighbours = async (
    books: () => Promise<Parameters<typeof adjacentChapterRef>[0]>,
    bookId: string,
    chapter: number
  ) => {
    const toRef = (ref: ChapterRef | null): SandboxChapterRef | null =>
      ref && { bookId: ref.book, chapter: ref.chapter };
    try {
      const catalog = await books();
      return {
        next: toRef(adjacentChapterRef(catalog, bookId, chapter, "next")),
        previous: toRef(
          adjacentChapterRef(catalog, bookId, chapter, "previous")
        ),
      };
    } catch {
      return { next: null, previous: null };
    }
  };

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
    "bible.translations": () =>
      load("the list of translations", async () =>
        (await bibleData.getTranslationCatalog()).map(translation)
      ),

    "bible.books": ({ translationId }) =>
      load(`the books of ${translationId}`, async () => {
        const data = await bibleData.getTranslationBooks(translationId);
        return {
          translation: translation(data.translation),
          books: data.books.map(book),
        };
      }),

    "bible.chapter": ({ translationId, bookId, chapter }) =>
      load(`${translationId} ${bookId} ${chapter}`, async () => {
        const data = await bibleData.getTranslationBookChapter(
          translationId,
          bookId,
          chapter
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
          content: data.chapter.content.map(chapterContent),
          footnotes: (data.chapter.footnotes ?? []).map((note) => ({
            id: note.noteId,
            text: note.text,
            caller: note.caller ?? null,
            verse: note.reference?.verse ?? null,
          })),
          ...(await neighbours(
            async () =>
              (await bibleData.getTranslationBooks(translationId)).books,
            bookId,
            chapter
          )),
        };
      }),

    "bible.commentaries": () =>
      load("the list of commentaries", async () =>
        (await bibleData.getCommentaries()).map(commentary)
      ),

    "bible.commentaryBooks": ({ commentaryId }) =>
      load(`the books of ${commentaryId}`, async () => {
        const data = await bibleData.getCommentaryBooks(commentaryId);
        return {
          commentary: commentary(data.commentary),
          books: data.books.map(commentaryBook),
        };
      }),

    "bible.commentaryChapter": ({ commentaryId, bookId, chapter }) =>
      load(`${commentaryId} ${bookId} ${chapter}`, async () => {
        const data = await bibleData.getCommentaryBookChapter(
          commentaryId,
          bookId,
          chapter
        );
        return {
          commentaryId,
          bookId,
          chapter,
          introduction: data.chapter.introduction ?? null,
          verses: data.chapter.content
            .filter((item) => item.type === "verse")
            .map((verse) => ({
              number: verse.number,
              text: extractContentText(verse.content),
            })),
          ...(await neighbours(
            async () =>
              (await bibleData.getCommentaryBooks(commentaryId)).books,
            bookId,
            chapter
          )),
        };
      }),

    "bible.commentaryProfiles": ({ commentaryId }) =>
      load(`the profiles of ${commentaryId}`, async () =>
        (await bibleData.getCommentaryProfiles(commentaryId)).map(profile)
      ),

    "bible.commentaryProfile": ({ commentaryId, profileId }) =>
      load(`${commentaryId} profile ${profileId}`, async () => {
        const data = await bibleData.getCommentaryProfile(
          commentaryId,
          profileId
        );
        return { ...profile(data.profile), content: data.content };
      }),

    "bible.search": ({
      translationId,
      query,
      bookId,
      chapter,
      page,
      perPage,
    }) =>
      load(`search results for "${query}"`, async () => {
        // The index has a collection per language, so the translation's own
        // language decides where to look. Its catalog is cached (or
        // downloaded), so this rarely costs a request.
        const { language } = (
          await bibleData.getTranslationBooks(translationId)
        ).translation;
        const response = await search.searchVerses(
          language,
          translationId,
          query,
          { book: bookId, chapter },
          { page, perPage }
        );
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
      }),

    "bible.datasets": () =>
      load("the list of datasets", async () =>
        (await bibleData.getDatasets()).map(dataset)
      ),

    "bible.datasetBooks": ({ datasetId }) =>
      load(`the books of ${datasetId}`, async () => {
        const data = await bibleData.getDatasetBooks(datasetId);
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
      }),

    "bible.datasetChapter": ({ datasetId, bookId, chapter }) =>
      load(`${datasetId} ${bookId} ${chapter}`, async () => {
        const data = await bibleData.getDatasetBookChapter(
          datasetId,
          bookId,
          chapter
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
      }),
  };
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

function chapterContent(item: ChapterContent): SandboxChapterContent {
  switch (item.type) {
    case "heading":
      return { type: "heading", text: extractContentText(item.content) };
    case "line_break":
      return { type: "lineBreak" };
    case "hebrew_subtitle":
      return {
        type: "hebrewSubtitle",
        text: extractContentText(item.content),
      };
    case "verse":
      return {
        type: "verse",
        number: item.number,
        text: extractContentText(item.content),
        footnotes: item.content.flatMap((part) =>
          typeof part === "object" && "noteId" in part ? [part.noteId] : []
        ),
      };
  }
}
