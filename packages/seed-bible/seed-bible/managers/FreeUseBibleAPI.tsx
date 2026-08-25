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
   * The SHA-256 hash of the translation's entire contents.
   *
   * Two translations with the same hash contain identical text, so comparing a
   * locally downloaded copy's hash against the one in
   * `available_translations.json` is how we detect that a download is stale.
   *
   * Null or undefined if the API did not report a hash.
   */
  sha256?: string;

  /**
   * The available list of formats.
   */
  availableFormats: ("json" | "usfm")[];

  /**
   * The API link for the list of available books for this translation.
   */
  listOfBooksApiLink: string;

  /**
   * The API link for the entire translation (every book and chapter) in a
   * single file. Used to download a translation for offline reading.
   *
   * Null or undefined if the API does not offer a complete download.
   */
  completeTranslationApiLink?: string;

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

export interface ChapterData {
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

/**
 * An entire translation — every book and every chapter — as returned by the
 * `api/{translation}/complete.json` endpoint.
 *
 * This is the shape used to download a translation for offline reading. It is
 * not the same shape as the per-chapter endpoint: chapters are nested inside
 * their book, and the cross-chapter navigation links (`nextChapterApiLink` and
 * friends) are absent because everything is already present in the one file.
 */
export interface CompleteTranslation {
  /**
   * The translation information.
   */
  translation: Translation;

  /**
   * Every book in the translation, in canonical order, with its chapters.
   */
  books: CompleteTranslationBook[];
}

export interface CompleteTranslationBook {
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
   * The title of the book, or null/undefined when the translation didn't
   * provide one.
   */
  title?: string | null;

  /**
   * The numerical order of the book in the translation.
   */
  order: number;

  /**
   * The number of chapters that the book contains.
   */
  numberOfChapters: number;

  /**
   * The number of verses that the book contains.
   */
  totalNumberOfVerses: number;

  /**
   * Whether the book is an apocryphal book.
   * Omitted if the book is canonical.
   */
  isApocryphal?: boolean;

  /**
   * Every chapter in the book, in order.
   */
  chapters: CompleteTranslationChapter[];
}

export interface CompleteTranslationChapter {
  /**
   * The number of verses that the chapter contains.
   */
  numberOfVerses: number;

  /**
   * The links to different audio versions for the chapter.
   */
  thisChapterAudioLinks: TranslationBookChapterAudioLinks;

  /**
   * The information for the chapter.
   */
  chapter: ChapterData;
}

/**
 * Options for downloading an entire translation.
 */
export interface GetCompleteTranslationOptions {
  /**
   * The API endpoint to download from. Defaults to the API's own endpoint.
   */
  endpoint?: string;

  /**
   * Signal used to abort an in-flight download.
   */
  signal?: AbortSignal;

  /**
   * Called as bytes arrive. `totalBytes` is null when the server didn't report
   * a `Content-Length`.
   */
  onProgress?: (receivedBytes: number, totalBytes: number | null) => void;
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

/** The conventional path to a translation's complete-download file. */
function completeTranslationPath(translationId: string): string {
  return `api/${encodeURIComponent(translationId)}/complete.json`;
}

/**
 * Options accepted by every `FreeUseBibleAPI` request method. `signal` lets a
 * caller cancel its own in-flight request (e.g. when the user navigates
 * again before a previous request resolved). See `_getJson` for how this
 * interacts with the shared response cache.
 */
export interface ApiRequestOptions {
  signal?: AbortSignal;
  refresh?: boolean;
}

/** Per-URL bookkeeping for an in-flight request shared by multiple callers. */
interface PendingRequestSubscription {
  /** Owns the actual `fetch()` call — never a caller's own signal. */
  controller: AbortController;
  /**
   * Number of callers still relying on this request, including ones that
   * passed no `signal` (and so can never voluntarily walk away — their
   * presence permanently keeps this above zero until the request settles
   * naturally). Only reaches zero once every caller who *could* cancel has
   * done so, at which point the real request is safe to cancel too.
   */
  subscriberCount: number;
}

export class FreeUseBibleAPI {
  endpoint: string;
  private _responseCache = new Map<string, Promise<unknown>>();
  private _requestSubscriptions = new Map<string, PendingRequestSubscription>();
  /**
   * Successfully resolved responses, keyed the same as `_responseCache`. Kept
   * separate from that cache of promises because a promise can't be read back
   * out synchronously — this is what `snapshotResponseCache` hands the SSR
   * render for embedding in the page.
   */
  private _resolvedResponses = new Map<string, unknown>();

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  /**
   * Snapshot of every response fetched (and resolved) so far, keyed by full
   * request URL. The SSR render embeds this in the page so the client's own
   * `FreeUseBibleAPI` — a separate instance with an empty cache — can seed
   * itself via `seedResponseCache` instead of re-fetching data the response
   * already contains.
   */
  snapshotResponseCache(): Record<string, unknown> {
    return Object.fromEntries(this._resolvedResponses);
  }

  /**
   * Pre-populates the response cache from a snapshot produced by
   * `snapshotResponseCache`, so a later request for one of these URLs
   * resolves immediately instead of hitting the network. Never overwrites a
   * URL this instance already has an answer (or in-flight request) for.
   */
  seedResponseCache(responses: Record<string, unknown>): void {
    for (const [url, value] of Object.entries(responses)) {
      if (this._responseCache.has(url)) {
        continue;
      }
      this._responseCache.set(url, Promise.resolve(value));
      this._resolvedResponses.set(url, value);
    }
  }

  /**
   * Gets the translations the API offers.
   *
   * @param endpoint The endpoint to read from. Defaults to this API's endpoint.
   * @param options Pass `refresh: true` to discard the cached response and hit
   * the network again. Needed when the caller cares about values that change
   * over time — notably each translation's `sha256`, which is how a downloaded
   * copy is found to be out of date.
   */
  async getAvailableTranslations(
    endpoint?: string,
    options?: ApiRequestOptions
  ): Promise<AvailableTranslations> {
    return this._getJson<AvailableTranslations>(
      "api/available_translations.json",
      endpoint,
      options
    );
  }

  async getTranslationBooks(
    translation: string,
    endpoint?: string,
    options?: ApiRequestOptions
  ): Promise<TranslationBooks> {
    const encodedTranslation = encodeURIComponent(translation);
    return this._getJson<TranslationBooks>(
      `api/${encodedTranslation}/books.json`,
      endpoint,
      options
    );
  }

  async getTranslationBookChapter(
    translation: string,
    book: string,
    chapter: number | string,
    endpoint?: string,
    options?: ApiRequestOptions
  ): Promise<TranslationBookChapter> {
    const encodedTranslation = encodeURIComponent(translation);
    const encodedBook = encodeURIComponent(book);
    const encodedChapter = encodeURIComponent(String(chapter));
    return this._getJson<TranslationBookChapter>(
      `api/${encodedTranslation}/${encodedBook}/${encodedChapter}.json`,
      endpoint,
      options
    );
  }

  /**
   * Downloads an entire translation in one request.
   *
   * Unlike the other methods this deliberately skips the response cache — the
   * payload is several megabytes, so holding it forever would be a large,
   * permanent memory cost for something the caller immediately writes to disk.
   *
   * @param translation The translation to download. Passing the full
   * {@link Translation} uses the API-provided `completeTranslationApiLink`;
   * passing just an ID falls back to the conventional path.
   * @param options Endpoint override, abort signal, and progress callback.
   */
  async getCompleteTranslation(
    translation: string | Translation,
    options?: GetCompleteTranslationOptions
  ): Promise<CompleteTranslation> {
    const path =
      typeof translation === "string"
        ? completeTranslationPath(translation)
        : (translation.completeTranslationApiLink ??
          completeTranslationPath(translation.id));
    const url = this._buildUrl(path, options?.endpoint);

    const response = await fetch(url, { signal: options?.signal });
    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `Failed request to ${url}. Status: ${response.status} ${response.statusText}`
      );
    }

    const onProgress = options?.onProgress;
    const body = response.body;
    if (!onProgress || !body) {
      return (await response.json()) as CompleteTranslation;
    }

    // `Content-Length` counts the bytes on the wire, which for a compressed
    // response is fewer than the bytes the reader hands back. Callers therefore
    // treat the total as an estimate and clamp their own progress display.
    const contentLength = Number(response.headers.get("content-length"));
    const totalBytes =
      Number.isFinite(contentLength) && contentLength > 0
        ? contentLength
        : null;

    // Each chunk is decoded as it arrives and then dropped, rather than keeping
    // every chunk and joining them into one big buffer at the end. A complete
    // translation is several megabytes, and this feature is aimed at low-end
    // phones on poor connections — the buffer-then-decode version held the raw
    // bytes, the merged copy, and the decoded text all at once, roughly four
    // times the payload at peak, which is enough to run a cheap device out of
    // memory. `stream: true` is what makes per-chunk decoding safe: it holds back
    // a partial character split across a chunk boundary instead of corrupting it.
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    let receivedBytes = 0;

    onProgress(0, totalBytes);
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        text += decoder.decode(value, { stream: true });
        receivedBytes += value.byteLength;
        onProgress(receivedBytes, totalBytes);
      }
    }
    text += decoder.decode();

    return JSON.parse(text) as CompleteTranslation;
  }

  async getNextChapter(
    chapter: TranslationBookChapter,
    endpoint?: string,
    options?: ApiRequestOptions
  ): Promise<TranslationBookChapter | null> {
    if (!chapter.nextChapterApiLink) {
      return null;
    }
    return this._getJson<TranslationBookChapter>(
      chapter.nextChapterApiLink,
      endpoint,
      options
    );
  }

  async getPreviousChapter(
    chapter: TranslationBookChapter,
    endpoint?: string,
    options?: ApiRequestOptions
  ): Promise<TranslationBookChapter | null> {
    if (!chapter.previousChapterApiLink) {
      return null;
    }
    return this._getJson<TranslationBookChapter>(
      chapter.previousChapterApiLink,
      endpoint,
      options
    );
  }

  private _getJson<T>(
    path: string,
    endpoint?: string,
    options?: ApiRequestOptions
  ): Promise<T> {
    const url = this._buildUrl(path, endpoint);
    if (options?.refresh) {
      this._responseCache.delete(url);
      this._resolvedResponses.delete(url);
    }
    const existing = this._responseCache.get(url) as Promise<T> | undefined;
    if (existing) {
      return this._subscribeToRequest(url, existing, options?.signal);
    }

    // Own controller for the real fetch — deliberately never a caller's own
    // signal, so one caller aborting can't tear down the network request
    // other callers sharing this URL are still relying on. It's only
    // aborted once every subscriber has walked away (see
    // `_subscribeToRequest`).
    const controller = new AbortController();
    this._requestSubscriptions.set(url, { controller, subscriberCount: 0 });

    const request: Promise<T> = fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (response.status < 200 || response.status >= 300) {
          throw new Error(
            `Failed request to ${url}. Status: ${response.status} ${response.statusText}`
          );
        }
        const json = await response.json();
        this._resolvedResponses.set(url, json);
        return json;
      })
      .catch((error) => {
        this._responseCache.delete(url);
        throw error;
      })
      .finally(() => {
        this._requestSubscriptions.delete(url);
      });

    this._responseCache.set(url, request);
    return this._subscribeToRequest(url, request, options?.signal);
  }

  /**
   * Hands a caller its own view of a shared in-flight request. A caller with
   * no `signal` (or one requesting an already-settled response) just gets
   * the shared promise directly. A caller with a `signal` gets a wrapper
   * promise that rejects the moment *its own* signal aborts — without
   * affecting any other subscriber — and, only once every subscriber has
   * done the same, aborts the real underlying request.
   */
  private _subscribeToRequest<T>(
    url: string,
    sharedPromise: Promise<T>,
    signal?: AbortSignal
  ): Promise<T> {
    const subscription = this._requestSubscriptions.get(url);
    if (!subscription) {
      // Already settled — nothing left to subscribe to or cancel.
      return sharedPromise;
    }

    subscription.subscriberCount++;

    if (!signal) {
      return sharedPromise;
    }

    return new Promise<T>((resolve, reject) => {
      let settled = false;

      const onAbort = () => {
        if (settled) {
          return;
        }
        settled = true;
        subscription.subscriberCount--;
        if (subscription.subscriberCount <= 0) {
          // Reaching zero means every caller that *could* walk away has, so
          // nobody is waiting on this request any more and it is safe to
          // cancel. Drop it from both maps first, synchronously: the rejection
          // — and the cache eviction that rides on it — only land a microtask
          // later, and a caller arriving in between would otherwise be handed
          // this doomed promise and inherit an abort it never asked for.
          // Reachable by navigating back to a chapter whose request was just
          // superseded. Both deletes are idempotent with the ones in
          // `_getJson`.
          this._requestSubscriptions.delete(url);
          this._responseCache.delete(url);
          subscription.controller.abort();
        }
        reject(this._abortError());
      };

      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });

      sharedPromise.then(
        (value) => {
          if (settled) {
            return;
          }
          settled = true;
          signal.removeEventListener("abort", onAbort);
          resolve(value);
        },
        (error) => {
          if (settled) {
            return;
          }
          settled = true;
          signal.removeEventListener("abort", onAbort);
          reject(error);
        }
      );
    });
  }

  private _abortError(): DOMException {
    return new DOMException("The operation was aborted.", "AbortError");
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
