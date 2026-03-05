import { saveUserReadingHistory } from "db.annotations.library";
const bibleDataCache = new Map<string, BibleDataManagerData>();
const footnotesCache = new Map<string, ChapterFootnote[]>();

// Cache key based on content (translation:bookId:chapter)
export function getCacheKey(
  translation: string,
  bookId: string,
  chapter: number
) {
  return `${translation}:${bookId}:${chapter}`;
}

export function getCachedBibleData(
  translation: string,
  bookId: string,
  chapter: number
): BibleDataManagerData | undefined {
  const key = getCacheKey(translation, bookId, chapter);
  return bibleDataCache.get(key);
}

export function setCachedBibleData(
  translation: string,
  bookId: string,
  chapter: number,
  data: BibleDataManagerData
) {
  const key = getCacheKey(translation, bookId, chapter);
  bibleDataCache.set(key, data);
}

export function getCachedFootnotes(
  translation: string,
  bookId: string,
  chapter: number
) {
  const key = getCacheKey(translation, bookId, chapter);
  return footnotesCache.get(key) || null;
}

export function setCachedFootnotes(
  translation: string,
  bookId: string,
  chapter: number,
  footnotes: ChapterFootnote[]
) {
  const key = getCacheKey(translation, bookId, chapter);
  if (footnotes) {
    footnotesCache.set(key, footnotes);
  }
}

// Keep old functions for backwards compatibility
export function getCachedTabData(tabId: any) {
  return null; // Deprecated - use getCachedBibleData instead
}

export function setCachedTabData(tabId: any, data: any) {
  // Deprecated - cache is now set automatically via setCachedBibleData
}

export interface ParsedChapterContent {
  heading: string;
  number: number;
  verses: {
    verseNumber: number | null;
    text: string;
    lineBreak?: boolean;
  }[];
  hebrew_subtitle?: string;
}

function parseContent(content: TranslationBookChapter["chapter"]["content"]) {
  const sections = [] as ParsedChapterContent[];
  let currentSection: ParsedChapterContent = {
    heading: "",
    number: 1,
    verses: [],
  };
  let isNewSection = true;

  const parseText = (arr: string[] | ChapterVerse["content"]) =>
    arr
      .map((item): string => {
        if (typeof item === "object") {
          if ("text" in item) {
            return item.text;
          } else if ("heading" in item) {
            return item.heading;
          } else {
            return "";
          }
        } else {
          return item;
        }
      })
      .join(" ");

  content.forEach((item) => {
    // const { type, number, content: sectionContent } = item;
    if (item.type === "heading") {
      if (!isNewSection) {
        sections.push(currentSection);
        currentSection = {
          heading: "",
          number: currentSection.number + 1,
          verses: [],
        };
      }
      currentSection.heading = parseText(item.content);
      isNewSection = false;
    } else if (item.type === "verse") {
      const verseText = parseText(item.content);
      currentSection.verses.push({ verseNumber: item.number, text: verseText });
    } else if (item.type === "line_break") {
      currentSection.verses.push({
        verseNumber: null,
        text: "\n",
        lineBreak: true,
      });
    } else if (item.type === "hebrew_subtitle") {
      console.log(item.content, "sectionContent");
      currentSection.hebrew_subtitle = parseText(item.content);
    }
  });

  sections.push(currentSection);
  return sections;
}

export interface BibleDataManagerData {
  book: string;
  chapter: number;
  content: ParsedChapterContent[];
  bookId: string;
  translation: string;
  nextChapter: string | null;
  prevChapter: string | null;
  numberOfChapters: number | null;
  baseUrl: string;
  shortName: string;
}

export class BibleDataManager {
  _lastRecordedKey: any;
  _viewingStart: any;
  _viewingTimer: any;
  error: any;
  loading: boolean;
  footnotes: ChapterFootnote[] | null | undefined;
  data: BibleDataManagerData | null | undefined;
  baseUrl: string;
  chapter: number;
  bookId: string;
  translation: string;
  tabId: string | null;

  constructor({
    tabId = null,
    translation = "NASB95",
    bookId = "GEN",
    chapter = 1,
    baseUrl = "https://vmfnri.helloao.org",
  } = {}) {
    this.tabId = tabId;
    this.translation = translation;
    this.bookId = bookId;
    this.chapter = chapter;
    this.baseUrl = baseUrl;

    // Try to get cached data by content key (translation:bookId:chapter)
    this.data = getCachedBibleData(translation, bookId, chapter);
    this.footnotes = getCachedFootnotes(translation, bookId, chapter);
    this.loading = false;
    this.error = null;

    // Timer and tracking
    this._viewingTimer = null;
    this._viewingStart = null;
    this._lastRecordedKey = null;

    // Ensure masks entry exists for this tab
    if (this.tabId && !Array.isArray(masks[this.tabId])) {
      masks[this.tabId] = [];
    }
  }

  _getKey() {
    return `${this.translation}:${this.bookId}:${this.chapter}`;
  }

  _scheduleMaskRecord() {
    // Clear any existing reading history interval first
    if (thisBot.masks.readingHistoryInterval) {
      clearInterval(thisBot.masks.readingHistoryInterval);
      thisBot.masks.readingHistoryInterval = null;
    }

    // Debounce: don't start new interval if we just started one
    const now = Date.now();
    if (
      globalThis.__lastHistorySchedule &&
      now - globalThis.__lastHistorySchedule < 2000
    ) {
      return;
    }
    globalThis.__lastHistorySchedule = now;

    // Capture current values at schedule time (not `this` which can change)
    const scheduledBookId = this.bookId;
    const scheduledChapter = this.chapter;

    // Validate before scheduling
    if (!scheduledBookId || !scheduledChapter) {
      console.log("_scheduleMaskRecord: skipping - invalid bookId or chapter");
      return;
    }

    // Use captured values directly in the interval, not `this`
    const readingHistoryInterval = setInterval(() => {
      // Double-check values are still valid
      if (scheduledBookId && scheduledChapter) {
        saveUserReadingHistory(scheduledBookId, scheduledChapter);
      }
    }, 5000); // every 5 seconds
    setTagMask(thisBot, "readingHistoryInterval", readingHistoryInterval);

    if (!this.tabId) return;

    if (!Array.isArray(masks[this.tabId])) {
      masks[this.tabId] = [];
    }

    if (this._viewingTimer) clearTimeout(this._viewingTimer);

    this._viewingStart = Date.now();
    const keyAtScheduleTime = this._getKey();
    const tabIdCapture = this.tabId;
    const translationCapture = this.translation;

    this._viewingTimer = setTimeout(() => {
      if (keyAtScheduleTime === this._getKey()) {
        if (this._lastRecordedKey !== keyAtScheduleTime) {
          masks[tabIdCapture].push({
            bookId: scheduledBookId,
            chapter: scheduledChapter,
            translation: translationCapture,
            recordedAt: new Date().toISOString(),
            secondsOpen: Math.round((Date.now() - this._viewingStart) / 1000),
          });
          this._lastRecordedKey = keyAtScheduleTime;
        }
      }
    }, 60_000); // 1 min
  }

  dispose() {
    if (this._viewingTimer) clearTimeout(this._viewingTimer);
    this._viewingTimer = null;
  }

  async fetch(
    customUrl: string | null = null,
    forcedTranslation: string | null = null,
    forcedBaseUrl: string | null = null
  ) {
    this.loading = true;
    this.error = null;

    try {
      const url = customUrl
        ? `${forcedBaseUrl || this.baseUrl}${customUrl}`
        : `${forcedBaseUrl || this.baseUrl}/api/${
            forcedTranslation || this.translation
          }/${this.bookId}/${this.chapter}.json`;
      console.log(url, customUrl, "firstChapterApiLink");

      const response = await web.get(url);
      const data: TranslationBookChapter | null = response.data;

      const contentResponse = data?.chapter?.content;
      if (contentResponse) {
        const parsedContent = parseContent(contentResponse);

        this.data = {
          book: data?.book?.name,
          chapter: data?.chapter?.number,
          content: parsedContent,
          bookId: data?.book?.id || this.bookId,
          translation: forcedTranslation || this.translation,
          nextChapter: data?.nextChapterApiLink,
          prevChapter: data?.previousChapterApiLink,
          numberOfChapters: data?.book?.numberOfChapters,
          baseUrl: forcedBaseUrl || this.baseUrl,
          shortName: data?.translation?.shortName || "",
        };

        this.footnotes = data?.chapter?.footnotes || null;

        // Cache by content key (translation:bookId:chapter)
        setCachedBibleData(
          this.data.translation,
          this.data.bookId,
          this.data.chapter,
          this.data
        );

        // Cache footnotes alongside the bible data
        setCachedFootnotes(
          this.data.translation,
          this.data.bookId,
          this.data.chapter,
          this.footnotes
        );

        // schedule the "open ≥ 1 min" record
        this._scheduleMaskRecord();
      }
    } catch (err) {
      this.error = err;
      console.error("Failed to fetch bible data:", err);
    } finally {
      this.loading = false;
    }
  }

  async open(
    bookId: string,
    chapter: number,
    translation: string | null = null,
    chapterUrl: string | null = null
  ) {
    this.bookId = bookId;
    this.chapter = chapter;
    if (translation) this.translation = translation;
    await this.fetch(
      chapterUrl
        ? chapterUrl
        : `/api/${translation || this.translation}/${bookId}/${chapter}.json`,
      translation
    );
  }

  async openNext() {
    if (this.data?.nextChapter) {
      const match = this.data.nextChapter.match(
        /^\/api\/([^/]+)\/([^/]+)\/(\d+)\.json$/
      );

      const codexMatch = this.data.nextChapter.match(
        /([^/]+)\/api\/([^/]+)\/([^/]+)\/(\d+)\.json$/
      );

      if (match) {
        const [, , bookId, chapter] = match;
        this.bookId = bookId;
        this.chapter = Number(chapter);
      } else if (codexMatch) {
        const [, , , bookId, chapter] = codexMatch;
        this.bookId = bookId;
        this.chapter = Number(chapter);
      }

      await this.fetch(this.data.nextChapter);
    }
  }

  async openPrevious() {
    if (this.data?.prevChapter) {
      const match = this.data.prevChapter.match(
        /^\/api\/([^/]+)\/([^/]+)\/(\d+)\.json$/
      );

      const codexMatch = this.data.prevChapter.match(
        /([^/]+)\/api\/([^/]+)\/([^/]+)\/(\d+)\.json$/
      );

      if (match) {
        const [, , bookId, chapter] = match;
        this.bookId = bookId;
        this.chapter = Number(chapter);
      } else if (codexMatch) {
        const [, , , bookId, chapter] = codexMatch;
        this.bookId = bookId;
        this.chapter = Number(chapter);
      }

      await this.fetch(this.data.prevChapter);
    }
  }

  async changeTranslation(
    newTranslation: any,
    booksData: any,
    forcedBaseUrl: any
  ) {
    console.log(
      newTranslation,
      booksData,
      forcedBaseUrl,
      this.getState(),
      "changeTranslation"
    );
    this.translation = newTranslation;
    const bookData =
      booksData.find((book: any) => book.id === this.bookId) || booksData[0];
    if (this.bookId !== bookData.id) {
      this.bookId = bookData.id;
      this.chapter = 1;
    }
    // this.bookId = bookData?.id || "GEN";
    // if (forcedBaseUrl) {
    //   this.chapter = 1;
    // }
    this.baseUrl = forcedBaseUrl || this.baseUrl;
    await this.fetch(
      bookData
        ? bookData.firstChapterApiLink.replace("1.json", `${this.chapter}.json`)
        : `/api/${newTranslation}/${this.bookId}/${this.chapter}.json`,
      newTranslation,
      forcedBaseUrl
    );
  }

  getState() {
    return {
      data: this.data,
      footnotes: this.footnotes,
      loading: this.loading,
      error: this.error,
    };
  }
}

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
