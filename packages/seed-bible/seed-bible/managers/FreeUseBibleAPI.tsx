export interface AvailableTranslations {
  /**
   * The list of translations.
   */
  translations: Translation[];
}

export interface Translation {
  /**
   * The ID of the translation.
   */
  id: string;

  /**
   * The name of the translation.
   * This is usually the name of the translation in the translation's language.
   */
  name: string;

  /**
   * The English name of the translation.
   */
  englishName: string;

  /**
   * The website for the translation.
   */
  website: string;

  /**
   * The URL that the license for the translation can be found.
   */
  licenseUrl: string;

  /**
   * The license notice for the translation.
   */
  licenseNotice?: string | null;

  /**
   * The short name for the translation.
   */
  shortName: string;

  /**
   * The ISO 639  3-letter language tag that the translation is primarily in.
   */
  language: string;

  /**
   * Gets the name of the language that the translation is in.
   * Null or undefined if the name of the language is not known.
   */
  languageName?: string;

  /**
   * Gets the name of the language in English.
   * Null or undefined if the language doesn't have an english name.
   */
  languageEnglishName?: string;

  /**
   * The direction that the language is written in.
   * "ltr" indicates that the text is written from the left side of the page to the right.
   * "rtl" indicates that the text is written from the right side of the page to the left.
   */
  textDirection: "ltr" | "rtl";

  /**
   * The available list of formats.
   */
  availableFormats: ("json" | "usfm")[];

  /**
   * The API link for the list of available books for this translation.
   */
  listOfBooksApiLink: string;

  /**
   * The number of books that are contained in this translation.
   *
   * Complete translations should have the same number of books as the Bible (66).
   */
  numberOfBooks: number;

  /**
   * The total number of chapters that are contained in this translation.
   *
   * Complete translations should have the same number of chapters as the Bible (1,189).
   */
  totalNumberOfChapters: number;

  /**
   * The total number of verses that are contained in this translation.
   *
   * Complete translations should have the same number of verses as the Bible (around 31,102 - some translations exclude verses based on the aparent likelyhood of existing in the original source texts).
   */
  totalNumberOfVerses: number;

  /**
   * The total number of apocryphal books that are contained in this translation.
   * Omitted if the translation does not include apocrypha.
   */
  numberOfApocryphalBooks?: number;

  /**
   * The total number of apocryphal chapters that are contained in this translation.
   * Omitted if the translation does not include apocrypha.
   */
  totalNumberOfApocryphalChapters?: number;

  /**
   * the total number of apocryphal verses that are contained in this translation.
   * Omitted if the translation does not include apocrypha.
   */
  totalNumberOfApocryphalVerses?: number;
}

export interface TranslationBooks {
  /**
   * The translation information for the books.
   */
  translation: Translation;

  /**
   * The list of books that are available for the translation.
   */
  books: TranslationBook[];
}

export interface TranslationBook {
  /**
   * The ID of the book.
   */
  id: string;

  /**
   * The name that the translation provided for the book.
   */
  name: string;

  /**
   * The common name for the book.
   */
  commonName: string;

  /**
   * The title of the book.
   * This is usually a more descriptive version of the book name.
   * If not available, then one was not provided by the translation.
   */
  title: string | null;

  /**
   * The numerical order of the book in the translation.
   */
  order: number;

  /**
   * The number of chapters that the book contains.
   */
  numberOfChapters: number;

  /**
   * The number of the first chapter in the book.
   */
  firstChapterNumber: number;

  /**
   * The link to the first chapter of the book.
   */
  firstChapterApiLink: string;

  /**
   * The number of the last chapter in the book.
   */
  lastChapterNumber: number;

  /**
   * The link to the last chapter of the book.
   */
  lastChapterApiLink: string;

  /**
   * The number of verses that the book contains.
   */
  totalNumberOfVerses: number;

  /**
   * Whether the book is an apocryphal book.
   * Omitted if the translation is canonical.
   */
  isApocryphal?: boolean;
}

export interface TranslationBookChapter {
  /**
   * The translation information for the book chapter.
   */
  translation: Translation;

  /**
   * The book information for the book chapter.
   */
  book: TranslationBook;

  /**
   * The link to the current chapter.
   */
  thisChapterLink: string;

  /**
   * The links to different audio versions for the chapter.
   */
  thisChapterAudioLinks: TranslationBookChapterAudioLinks;

  /**
   * The link to the next chapter.
   * Null if this is the last chapter in the translation.
   */
  nextChapterApiLink: string | null;

  /**
   * The links to different audio versions for the next chapter.
   * Null if this is the last chapter in the translation.
   */
  nextChapterAudioLinks: TranslationBookChapterAudioLinks | null;

  /**
   * The link to the previous chapter.
   * Null if this is the first chapter in the translation.
   */
  previousChapterApiLink: string | null;

  /**
   * The links to different audio versions for the previous chapter.
   * Null if this is the first chapter in the translation.
   */
  previousChapterAudioLinks: TranslationBookChapterAudioLinks | null;

  /**
   * The number of verses that the chapter contains.
   */
  numberOfVerses: number;

  /**
   * The information for the chapter.
   */
  chapter: ChapterData;
}

interface ChapterData {
  /**
   * The number of the chapter.
   */
  number: number;

  /**
   * The content of the chapter.
   */
  content: ChapterContent[];

  /**
   * The list of footnotes for the chapter.
   */
  footnotes: ChapterFootnote[];
}

/**
 * A union type that represents a single piece of chapter content.
 * A piece of chapter content can be one of the following things:
 * - A heading.
 * - A line break.
 * - A verse.
 * - A Hebrew Subtitle.
 */
export type ChapterContent =
  | ChapterHeading
  | ChapterLineBreak
  | ChapterVerse
  | ChapterHebrewSubtitle;

/**
 * A heading in a chapter.
 */
export interface ChapterHeading {
  /**
   * Indicates that the content represents a heading.
   */
  type: "heading";

  /**
   * The content for the heading.
   * If multiple strings are included in the array, they should be concatenated with a space.
   */
  content: string[];
}

/**
 * A line break in a chapter.
 */
export interface ChapterLineBreak {
  /**
   * Indicates that the content represents a line break.
   */
  type: "line_break";
}

/**
 * A Hebrew Subtitle in a chapter.
 * These are often used included as informational content that appeared in the original manuscripts.
 * For example, Psalms 49 has the Hebrew Subtitle "To the choirmaster. A Psalm of the Sons of Korah."
 */
export interface ChapterHebrewSubtitle {
  /**
   * Indicates that the content represents a Hebrew Subtitle.
   */
  type: "hebrew_subtitle";

  /**
   * The list of content that is contained in the subtitle.
   * Each element in the list could be a string, formatted text, or a footnote reference.
   */
  content: (string | FormattedText | VerseFootnoteReference)[];
}

/**
 * A verse in a chapter.
 */
export interface ChapterVerse {
  /**
   * Indicates that the content is a verse.
   */
  type: "verse";

  /**
   * The number of the verse.
   */
  number: number;

  /**
   * The list of content for the verse.
   * Each element in the list could be a string, formatted text, or a footnote reference.
   */
  content: (
    | string
    | FormattedText
    | InlineHeading
    | InlineLineBreak
    | VerseFootnoteReference
  )[];
}

/**
 * Formatted text. That is, text that is formated in a particular manner.
 */
export interface FormattedText {
  /**
   * The text that is formatted.
   */
  text: string;

  /**
   * Whether the text represents a poem.
   * The number indicates the level of indent.
   *
   * Common in Psalms.
   */
  poem?: number;

  /**
   * Whether the text represents the Words of Jesus.
   */
  wordsOfJesus?: boolean;
}

/**
 * Defines an interface that represents a heading that is embedded in a verse.
 */
export interface InlineHeading {
  /**
   * The text of the heading.
   */
  heading: string;
}

/**
 * Defines an interface that represents a line break that is embedded in a verse.
 */
export interface InlineLineBreak {
  lineBreak: true;
}

/**
 * A footnote reference in a verse or a Hebrew Subtitle.
 */
export interface VerseFootnoteReference {
  /**
   * The ID of the note.
   */
  noteId: number;
}

/**
 * Information about a footnote.
 */
export interface ChapterFootnote {
  /**
   * The ID of the note that is referenced.
   */
  noteId: number;

  /**
   * The text of the footnote.
   */
  text: string;

  /**
   * The verse reference for the footnote.
   */
  reference?: {
    chapter: number;
    verse: number;
  };

  /**
   * The caller that should be used for the footnote.
   * For footnotes, a "caller" is the character that is used in the text to reference to footnote.
   *
   * For example, in the text:
   * Hello (a) World
   *
   * ----
   * (a) This is a footnote.
   *
   * The "(a)" is the caller.
   *
   * If "+", then the caller should be autogenerated.
   * If null, then the caller should be empty.
   * If a string, then the caller should be that string.
   */
  caller: "+" | string | null;
}

/**
 * The audio links for a book chapter.
 */
export interface TranslationBookChapterAudioLinks {
  /**
   * The reader for the chapter and the URL link to the audio file.
   */
  [reader: string]: string;
}

export interface AvailableCommentaries {
  /**
   * The list of commentaries.
   */
  commentaries: Commentary[];
}

export interface Commentary {
  /**
   * The ID of the commentary.
   */
  id: string;

  /**
   * The name of the commentary.
   */
  name: string;

  /**
   * The website for the commentary.
   */
  website: string;

  /**
   * The URL that the license for the commentary can be found.
   */
  licenseUrl: string;

  /**
   * The english name for the commentary.
   */
  englishName: string;

  /**
   * The ISO 639 3-letter language tag that the translation is primarily in.
   */
  language: string;

  /**
   * The direction that the language is written in.
   * "ltr" indicates that the text is written from the left side of the page to the right.
   * "rtl" indicates that the text is written from the right side of the page to the left.
   */
  textDirection: "ltr" | "rtl";

  /**
   * The API link for the list of available books for this translation.
   */
  listOfBooksApiLink: string;

  /**
   * The available list of formats.
   */
  availableFormats: ("json" | "usfm")[];

  /**
   * The number of books that are contained in this commentary.
   *
   * Complete commentaries should have the same number of books as the Bible (66).
   */
  numberOfBooks: number;

  /**
   * The total number of chapters that are contained in this translation.
   *
   * Complete commentaries should have the same number of chapters as the Bible (1,189).
   */
  totalNumberOfChapters: number;

  /**
   * The total number of verses that are contained in this commentary.
   *
   * Complete commentaries should have the same number of verses as the Bible (around 31,102 - some commentaries exclude verses based on the aparent likelyhood of existing in the original source texts).
   */
  totalNumberOfVerses: number;

  /**
   * Gets the name of the language that the commentary is in.
   * Null or undefined if the name of the language is not known.
   */
  languageName?: string;

  /**
   * Gets the name of the language in English.
   * Null or undefined if the language doesn't have an english name.
   */
  languageEnglishName?: string;
}

export interface CommentaryBooks {
  /**
   * The commentary information for the books.
   */
  commentary: Commentary;

  /**
   * The list of books that are available for the commentary.
   */
  books: CommentaryBook[];
}

interface CommentaryBook {
  /**
   * The ID of the book.
   * Matches the ID of the corresponding book in the Bible (GEN, EXO, etc.).
   */
  id: string;

  /**
   * The name that the commentary provided for the book.
   */
  name: string;

  /**
   * The common name for the book.
   */
  commonName: string;

  /**
   * The commentary's introduction for the book.
   * Omitted if the commentary doesn't have an introduction for the book.
   */
  introduction?: string;

  /**
   * The order of the book in the Bible.
   */
  order: number;

  /**
   * The number of the first chapter in the book.
   *
   * Null if the comentary book has no chapters.
   */
  firstChapterNumber: number | null;

  /**
   * The link to the first chapter of the book.
   *
   * Null if the comentary book has no chapters.
   */
  firstChapterApiLink: string | null;

  /**
   * The number of the last chapter in the book.
   *
   * Null if the comentary book has no chapters.
   */
  lastChapterNumber: number | null;

  /**
   * The link to the last chapter of the book.
   *
   * Null if the comentary book has no chapters.
   */
  lastChapterApiLink: string | null;

  /**
   * The number of chapters that the book contains.
   */
  numberOfChapters: number;

  /**
   * The number of verses that the book contains.
   */
  totalNumberOfVerses: number;
}

export interface CommentaryBookChapter {
  /**
   * The commentary information for the book chapter.
   */
  commentary: Commentary;

  /**
   * The book information for the book chapter.
   */
  book: CommentaryBook;

  /**
   * The link to this chapter.
   */
  thisChapterLink: string;

  /**
   * The link to the next chapter.
   * Null if this is the last chapter in the commentary.
   */
  nextChapterApiLink: string | null;

  /**
   * The link to the previous chapter.
   * Null if this is the first chapter in the commentary.
   */
  previousChapterApiLink: string | null;

  /**
   * The number of verses that the chapter contains.
   */
  numberOfVerses: number;

  /**
   * The information for the chapter.
   */
  chapter: CommentaryChapterData;
}

interface CommentaryChapterData {
  /**
   * The number of the chapter.
   */
  number: number;

  /**
   * The introduction that the commentary provided to the chapter.
   * Not all commentaries provide an introduction to a chapter.
   */
  introduction?: string;

  /**
   * The content of the chapter.
   * This is the same type from the "Get a Chapter from a Translation" endpoint.
   */
  content: ChapterVerse[];
}

export interface CommentaryProfiles {
  /**
   * The commentary information for the books.
   */
  commentary: Commentary;

  /**
   * The list of profiles that are available for the commentary.
   */
  profiles: CommentaryProfile[];
}

interface VerseRef {
  /**
   * The ID of the book that is being referenced.
   */
  book: string;

  /**
   * The chapter being referenced.
   */
  chapter: number;

  /**
   * The verse being referenced.
   */
  verse: number;

  /**
   * The chapter that the reference ends at.
   * If omitted, then reference does not span multiple chapters.
   */
  endChapter?: number;

  /**
   * The verse that the reference ends at.
   * If omitted, then the reference does not span multiple verses.
   */
  endVerse?: number;
}

interface CommentaryProfile {
  /**
   * The ID of the profile.
   */
  id: string;

  /**
   * The subject of the profile.
   */
  subject: string;

  /**
   * The Bible reference that the profile is associated with.
   */
  reference: VerseRef | null;

  /**
   * The link to this profile.
   */
  thisProfileLink: string;

  /**
   * The link to the chapter that this profile references in the commentary.
   */
  referenceChapterLink: string | null;
}

export interface CommentaryProfileContent {
  /**
   * The commentary information for the profile.
   */
  commentary: Commentary;

  /**
   * The information about the profile.
   */
  profile: CommentaryProfile;

  /**
   * The content of the profile.
   */
  content: string[];
}

export interface AvailableDatasets {
  /**
   * The list of datasets.
   */
  datasets: Dataset[];
}

export interface Dataset {
  /**
   * The ID of the dataset.
   */
  id: string;

  /**
   * The name of the dataset.
   */
  name: string;

  /**
   * The website for the dataset.
   */
  website: string;

  /**
   * The URL that the license for the dataset can be found.
   */
  licenseUrl: string;

  /**
   * The english name for the dataset.
   */
  englishName: string;

  /**
   * The ISO 639 3-letter language tag that the dataset is primarily in.
   */
  language: string;

  /**
   * The direction that the language is written in.
   * "ltr" indicates that the text is written from the left side of the page to the right.
   * "rtl" indicates that the text is written from the right side of the page to the left.
   */
  textDirection: "ltr" | "rtl";

  /**
   * The API link for the list of available books for this dataset.
   */
  listOfBooksApiLink: string;

  /**
   * The available list of formats.
   */
  availableFormats: ("json" | "usfm")[];

  /**
   * The number of books that are contained in this dataset.
   */
  numberOfBooks: number;

  /**
   * The total number of chapters that are contained in this dataset.
   */
  totalNumberOfChapters: number;

  /**
   * The total number of verses that are contained in this dataset.
   */
  totalNumberOfVerses: number;

  /**
   * The total number of cross references that are contained in this dataset.
   */
  totalNumberOfReferences: number;

  /**
   * Gets the name of the language that the dataset is in.
   * Null or undefined if the name of the language is not known.
   */
  languageName?: string;

  /**
   * Gets the name of the language in English.
   * Null or undefined if the language doesn't have an english name.
   */
  languageEnglishName?: string;
}

export interface DatasetBooks {
  /**
   * The dataset information for the books.
   */
  dataset: Dataset;

  /**
   * The list of books that are available for the dataset.
   */
  books: DatasetBook[];
}

interface DatasetBook {
  /**
   * The ID of the book.
   * Matches the ID of the corresponding book in the Bible (GEN, EXO, etc.).
   */
  id: string;

  /**
   * The order of the book in the Bible.
   */
  order: number;

  /**
   * The number of the first chapter in the book.
   */
  firstChapterNumber: number;

  /**
   * The link to the first chapter of the book.
   */
  firstChapterApiLink: string | null;

  /**
   * The number of the last chapter in the book.
   */
  lastChapterNumber: number | null;

  /**
   * The link to the last chapter of the book.
   */
  lastChapterApiLink: string | null;

  /**
   * The number of chapters that the book contains.
   */
  numberOfChapters: number;

  /**
   * The number of verses that the book contains.
   */
  totalNumberOfVerses: number;

  /**
   * The total number of cross references that this book contains.
   */
  totalNumberOfReferences: number;
}

export interface DatasetBookChapter {
  /**
   * The dataset information for the book chapter.
   */
  dataset: Dataset;

  /**
   * The book information for the book chapter.
   */
  book: DatasetBook;

  /**
   * The link to this chapter.
   */
  thisChapterLink: string;

  /**
   * The link to the next chapter.
   * Null if this is the last chapter in the dataset.
   */
  nextChapterApiLink: string | null;

  /**
   * The link to the previous chapter.
   * Null if this is the first chapter in the dataset.
   */
  previousChapterApiLink: string | null;

  /**
   * The number of verses that the chapter contains.
   */
  numberOfVerses: number;

  /**
   * The information for the chapter.
   */
  chapter: DatasetChapterData;
}

interface DatasetChapterData {
  /**
   * The number of the chapter.
   */
  number: number;

  /**
   * The content of the chapter.
   */
  content: DatasetVerse[];
}

interface DatasetVerse {
  /**
   * The number of the verse.
   */
  verse: number;

  /**
   * The cross-references for the verse.
   *
   * Sorted by score, descending.
   */
  references: DatasetReference[];
}

interface DatasetReference {
  /**
   * The ID of the book that is being referenced.
   */
  book: string;

  /**
   * The chapter number.
   */
  chapter: number;

  /**
   * The verse number.
   * If `endVerse` is present, then this is the verse that the reference starts at.
   */
  verse: number;

  /**
   * The verse that the reference ends at.
   */
  endVerse?: number;

  /**
   * The relevence score for the reference.
   */
  score?: number;
}

export const FREE_USE_BIBLE_API_ENDPOINT = "https://bible.helloao.org/";
const PRIVATE_API_ENDPOINT = "https://vmfnri.helloao.org/";

export function getDefaultAPIEndpoint(url: URL): string {
  return url.searchParams.has("useFreeBibleAPI")
    ? FREE_USE_BIBLE_API_ENDPOINT
    : PRIVATE_API_ENDPOINT;
}

export class FreeUseBibleAPI {
  endpoint: string;
  private _responseCache = new Map<string, Promise<unknown>>();

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async getAvailableTranslations(
    endpoint?: string
  ): Promise<AvailableTranslations> {
    return this._getJson<AvailableTranslations>(
      "api/available_translations.json",
      endpoint
    );
  }

  async getTranslationBooks(
    translation: string,
    endpoint?: string
  ): Promise<TranslationBooks> {
    const encodedTranslation = encodeURIComponent(translation);
    return this._getJson<TranslationBooks>(
      `api/${encodedTranslation}/books.json`,
      endpoint
    );
  }

  async getTranslationBookChapter(
    translation: string,
    book: string,
    chapter: number | string,
    endpoint?: string
  ): Promise<TranslationBookChapter> {
    const encodedTranslation = encodeURIComponent(translation);
    const encodedBook = encodeURIComponent(book);
    const encodedChapter = encodeURIComponent(String(chapter));
    return this._getJson<TranslationBookChapter>(
      `api/${encodedTranslation}/${encodedBook}/${encodedChapter}.json`,
      endpoint
    );
  }

  async getNextChapter(
    chapter: TranslationBookChapter,
    endpoint?: string
  ): Promise<TranslationBookChapter | null> {
    if (!chapter.nextChapterApiLink) {
      return null;
    }
    return this._getJson<TranslationBookChapter>(
      chapter.nextChapterApiLink,
      endpoint
    );
  }

  async getPreviousChapter(
    chapter: TranslationBookChapter,
    endpoint?: string
  ): Promise<TranslationBookChapter | null> {
    if (!chapter.previousChapterApiLink) {
      return null;
    }
    return this._getJson<TranslationBookChapter>(
      chapter.previousChapterApiLink,
      endpoint
    );
  }

  private _getJson<T>(path: string, endpoint?: string): Promise<T> {
    const url = this._buildUrl(path, endpoint);
    const existing = this._responseCache.get(url) as Promise<T> | undefined;
    if (existing) {
      return existing;
    }

    const request: Promise<T> = fetch(url)
      .then(async (response) => {
        if (response.status < 200 || response.status >= 300) {
          throw new Error(
            `Failed request to ${url}. Status: ${response.status} ${response.statusText}`
          );
        }
        return await response.json();
      })
      .catch((error) => {
        this._responseCache.delete(url);
        throw error;
      });

    this._responseCache.set(url, request);
    return request;
  }

  private _buildUrl(path: string, endpoint?: string): string {
    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    const baseEndpoint = endpoint ?? this.endpoint;
    return new URL(path, baseEndpoint).href;
    // // const base = baseEndpoint.endsWith("/")
    // //   ? baseEndpoint.slice(0, -1)
    // //   : baseEndpoint;
    // // const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    // return `${base}${normalizedPath}`;
  }
}
