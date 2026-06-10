import type {
  AvailableTranslations,
  Translation,
  TranslationBookChapter,
  TranslationBooks,
} from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import { DEFAULT_API_ENDPOINT } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";

export type WebResponse = Pick<Response, "status" | "statusText" | "json">;

export type WebResponseMap = Record<string, WebResponse>;

export const EXAMPLE_API_ENDPOINT = "https://example.test";
export const ALT_API_ENDPOINT = "https://alt.example";

const AAB_TRANSLATION: Translation = {
  id: "AAB",
  name: "Accessible Ancients Bible",
  englishName: "Accessible Ancients Bible",
  website: "https://example.com",
  licenseUrl: "https://example.com/license",
  shortName: "AAB",
  language: "eng",
  textDirection: "ltr",
  availableFormats: ["json"],
  listOfBooksApiLink: "/api/AAB/books.json",
  numberOfBooks: 66,
  totalNumberOfChapters: 1189,
  totalNumberOfVerses: 31102,
};

const BSB_TRANSLATION: Translation = {
  id: "BSB",
  name: "Bible Standard Bible",
  englishName: "Bible Standard Bible",
  website: "https://example.com",
  licenseUrl: "https://example.com/license",
  shortName: "BSB",
  language: "eng",
  textDirection: "ltr",
  availableFormats: ["json"],
  listOfBooksApiLink: "/api/BSB/books.json",
  numberOfBooks: 66,
  totalNumberOfChapters: 1189,
  totalNumberOfVerses: 31102,
};

const NIV_TRANSLATION: Translation = {
  id: "NIV",
  name: "New International Version",
  englishName: "New International Version",
  website: "https://example.com",
  licenseUrl: "https://example.com/license",
  shortName: "NIV",
  language: "eng",
  textDirection: "ltr",
  availableFormats: ["json"],
  listOfBooksApiLink: "/api/NIV/books.json",
  numberOfBooks: 66,
  totalNumberOfChapters: 1189,
  totalNumberOfVerses: 31102,
};

export const translations: AvailableTranslations = {
  translations: [AAB_TRANSLATION, NIV_TRANSLATION],
};

export const aabBooks: TranslationBooks = {
  translation: AAB_TRANSLATION,
  books: [
    {
      id: "GEN",
      name: "Genesis",
      commonName: "Genesis",
      title: null,
      order: 1,
      numberOfChapters: 50,
      firstChapterNumber: 1,
      firstChapterApiLink: "/api/AAB/GEN/1.json",
      lastChapterNumber: 50,
      lastChapterApiLink: "/api/AAB/GEN/50.json",
      totalNumberOfVerses: 1533,
    },
    {
      id: "EXO",
      name: "Exodus",
      commonName: "Exodus",
      title: null,
      order: 2,
      numberOfChapters: 40,
      firstChapterNumber: 1,
      firstChapterApiLink: "/api/AAB/EXO/1.json",
      lastChapterNumber: 40,
      lastChapterApiLink: "/api/AAB/EXO/40.json",
      totalNumberOfVerses: 1213,
    },
    {
      id: "MAT",
      name: "Matthew",
      commonName: "Matthew",
      title: null,
      order: 40,
      numberOfChapters: 28,
      firstChapterNumber: 1,
      firstChapterApiLink: "/api/AAB/MAT/1.json",
      lastChapterNumber: 28,
      lastChapterApiLink: "/api/AAB/MAT/28.json",
      totalNumberOfVerses: 1071,
    },
  ],
};

export const bsbBooks: TranslationBooks = {
  translation: BSB_TRANSLATION,
  books: [
    {
      id: "GEN",
      name: "Genesis",
      commonName: "Genesis",
      title: null,
      order: 1,
      numberOfChapters: 50,
      firstChapterNumber: 1,
      firstChapterApiLink: "/api/BSB/GEN/1.json",
      lastChapterNumber: 50,
      lastChapterApiLink: "/api/BSB/GEN/50.json",
      totalNumberOfVerses: 1533,
    },
    {
      id: "EXO",
      name: "Exodus",
      commonName: "Exodus",
      title: null,
      order: 2,
      numberOfChapters: 40,
      firstChapterNumber: 1,
      firstChapterApiLink: "/api/BSB/EXO/1.json",
      lastChapterNumber: 40,
      lastChapterApiLink: "/api/BSB/EXO/40.json",
      totalNumberOfVerses: 1213,
    },
    {
      id: "MAT",
      name: "Matthew",
      commonName: "Matthew",
      title: null,
      order: 40,
      numberOfChapters: 28,
      firstChapterNumber: 1,
      firstChapterApiLink: "/api/BSB/MAT/1.json",
      lastChapterNumber: 28,
      lastChapterApiLink: "/api/BSB/MAT/28.json",
      totalNumberOfVerses: 1071,
    },
  ],
};

export const nivBooks: TranslationBooks = {
  translation: translations.translations[1]!,
  books: [
    {
      id: "MAT",
      name: "Matthew",
      commonName: "Matthew",
      title: null,
      order: 40,
      numberOfChapters: 28,
      firstChapterNumber: 1,
      firstChapterApiLink: "/api/NIV/MAT/1.json",
      lastChapterNumber: 28,
      lastChapterApiLink: "/api/NIV/MAT/28.json",
      totalNumberOfVerses: 1071,
    },
  ],
};

export const altTranslations: AvailableTranslations = {
  translations: [
    {
      ...translations.translations[1]!,
      listOfBooksApiLink: "/api/NIV/books.json",
    },
    {
      ...translations.translations[0]!,
      id: "BSB",
      shortName: "BSB",
      listOfBooksApiLink: "/api/BSB/books.json",
    },
  ],
};

export function createResponse<T>(
  payload: T,
  status: number = 200,
  statusText: string = "OK"
): WebResponse {
  return {
    status,
    statusText,
    json: () => Promise.resolve(payload),
  };
}

export function makeUrl(
  path: string,
  endpoint: string = DEFAULT_API_ENDPOINT.slice(0, -1)
): string {
  return `${endpoint}${path}`;
}

export function makeAltUrl(path: string): string {
  return makeUrl(path, ALT_API_ENDPOINT);
}

export function makeExampleUrl(path: string): string {
  return makeUrl(path, EXAMPLE_API_ENDPOINT);
}

export function makeChapter(
  translationBooks: TranslationBooks,
  book: string,
  chapter: number
): TranslationBookChapter {
  const selectedBook =
    translationBooks.books.find((entry) => entry.id === book) ??
    translationBooks.books[0]!;

  return {
    translation: translationBooks.translation,
    book: selectedBook,
    thisChapterLink: `/api/${translationBooks.translation.id}/${book}/${chapter}.json`,
    thisChapterAudioLinks: {},
    nextChapterApiLink: `/api/${translationBooks.translation.id}/${book}/${chapter + 1}.json`,
    nextChapterAudioLinks: {},
    previousChapterApiLink:
      chapter > 1
        ? `/api/${translationBooks.translation.id}/${book}/${chapter - 1}.json`
        : null,
    previousChapterAudioLinks: chapter > 1 ? {} : null,
    numberOfVerses: 2,
    chapter: {
      number: chapter,
      content: [
        { type: "verse", number: 1, content: ["Verse 1"] },
        { type: "verse", number: 2, content: ["Verse 2"] },
      ],
      footnotes: [],
    },
  };
}

export function createDefaultManagerResponseMap(): WebResponseMap {
  return {
    [makeUrl("/api/available_translations.json")]: createResponse(translations),
    [makeUrl("/api/AAB/books.json")]: createResponse(aabBooks),
    [makeUrl("/api/NIV/books.json")]: createResponse(nivBooks),
    [makeUrl("/api/AAB/GEN/1.json")]: createResponse(
      makeChapter(aabBooks, "GEN", 1)
    ),
    [makeUrl("/api/AAB/EXO/2.json")]: createResponse(
      makeChapter(aabBooks, "EXO", 2)
    ),
    [makeUrl("/api/NIV/MAT/1.json")]: createResponse(
      makeChapter(nivBooks, "MAT", 1)
    ),
  };
}

export function createDefaultSelectorManagerResponseMap(): WebResponseMap {
  return {
    [makeUrl("/api/available_translations.json")]: createResponse({
      translations: [AAB_TRANSLATION, BSB_TRANSLATION, NIV_TRANSLATION],
    }),
    [makeUrl("/api/AAB/books.json")]: createResponse(aabBooks),
    [makeUrl("/api/BSB/books.json")]: createResponse(bsbBooks),
    [makeUrl("/api/NIV/books.json")]: createResponse(nivBooks),
    [makeUrl("/api/AAB/GEN/1.json")]: createResponse(
      makeChapter(aabBooks, "GEN", 1)
    ),
    [makeUrl("/api/AAB/EXO/2.json")]: createResponse(
      makeChapter(aabBooks, "EXO", 2)
    ),
    [makeUrl("/api/BSB/GEN/1.json")]: createResponse(
      makeChapter(bsbBooks, "GEN", 1)
    ),
    [makeUrl("/api/BSB/EXO/2.json")]: createResponse(
      makeChapter(bsbBooks, "EXO", 2)
    ),
    [makeUrl("/api/NIV/MAT/1.json")]: createResponse(
      makeChapter(nivBooks, "MAT", 1)
    ),
  };
}

export function createExampleManagerResponseMap(): WebResponseMap {
  return {
    [makeExampleUrl("/api/available_translations.json")]:
      createResponse(translations),
    [makeExampleUrl("/api/AAB/books.json")]: createResponse(aabBooks),
    [makeExampleUrl("/api/NIV/books.json")]: createResponse(nivBooks),
    [makeExampleUrl("/api/AAB/GEN/1.json")]: createResponse(
      makeChapter(aabBooks, "GEN", 1)
    ),
    [makeExampleUrl("/api/AAB/EXO/2.json")]: createResponse(
      makeChapter(aabBooks, "EXO", 2)
    ),
    [makeExampleUrl("/api/NIV/MAT/1.json")]: createResponse(
      makeChapter(nivBooks, "MAT", 1)
    ),
  };
}

export function createReadingManagerResponseMap(): WebResponseMap {
  return {
    [makeExampleUrl("/api/available_translations.json")]:
      createResponse(translations),
    [makeExampleUrl("/api/AAB/books.json")]: createResponse(aabBooks),
    [makeExampleUrl("/api/AAB/GEN/1.json")]: createResponse(
      makeChapter(aabBooks, "GEN", 1)
    ),
    [makeExampleUrl("/api/AAB/GEN/2.json")]: createResponse(
      makeChapter(aabBooks, "GEN", 2)
    ),
    [makeExampleUrl("/api/AAB/GEN/5.json")]: createResponse(
      makeChapter(aabBooks, "GEN", 5)
    ),
    [makeExampleUrl("/api/AAB/EXO/1.json")]: createResponse(
      makeChapter(aabBooks, "EXO", 1)
    ),
  };
}
