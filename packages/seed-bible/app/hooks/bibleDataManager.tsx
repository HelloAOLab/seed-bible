import { saveUserReadingHistory } from "db.annotations.library";
const bibleDataCache = new Map();

// Cache key based on content (translation:bookId:chapter)
export function getCacheKey(translation, bookId, chapter) {
  return `${translation}:${bookId}:${chapter}`;
}

export function getCachedBibleData(translation, bookId, chapter) {
  const key = getCacheKey(translation, bookId, chapter);
  return bibleDataCache.get(key);
}

export function setCachedBibleData(translation, bookId, chapter, data) {
  const key = getCacheKey(translation, bookId, chapter);
  bibleDataCache.set(key, data);
}

// Keep old functions for backwards compatibility
export function getCachedTabData(tabId) {
  return null; // Deprecated - use getCachedBibleData instead
}

export function setCachedTabData(tabId, data) {
  // Deprecated - cache is now set automatically via setCachedBibleData
}

function parseContent(content) {
  const sections = [];
  let currentSection = { heading: "", number: 1, verses: [] };
  let isNewSection = true;

  const parseText = (arr) =>
    arr.map((item) => (typeof item === "object" ? item.text : item)).join(" ");

  content.forEach((item) => {
    const { type, number, content: sectionContent } = item;
    if (type === "heading") {
      if (!isNewSection) {
        sections.push(currentSection);
        currentSection = {
          heading: "",
          number: currentSection.number + 1,
          verses: [],
        };
      }
      currentSection.heading = parseText(sectionContent);
      isNewSection = false;
    } else if (type === "verse") {
      const verseText = parseText(sectionContent);
      currentSection.verses.push({ verseNumber: number, text: verseText });
    } else if (type === "line_break") {
      currentSection.verses.push({
        verseNumber: null,
        text: "\n",
        lineBreak: true,
      });
    } else if (type === "hebrew_subtitle") {
      console.log(sectionContent, "sectionContent");
      currentSection.hebrew_subtitle = parseText(sectionContent);
    }
  });

  sections.push(currentSection);
  return sections;
}

export class BibleDataManager {
  constructor({
    tabId = null,
    translation = "BSB",
    bookId = "GEN",
    chapter = 1,
    baseUrl = "https://bible.helloao.org",
  } = {}) {
    this.tabId = tabId;
    this.translation = translation;
    this.bookId = bookId;
    this.chapter = chapter;
    this.baseUrl = baseUrl;

    // Try to get cached data by content key (translation:bookId:chapter)
    this.data = getCachedBibleData(translation, bookId, chapter) || {
      content: [],
    };
    this.footnotes = null;
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
    if (globalThis.__lastHistorySchedule && now - globalThis.__lastHistorySchedule < 2000) {
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
    customUrl = null,
    forcedTranslation = null,
    forcedBaseUrl = null
  ) {
    this.loading = true;
    this.error = null;

    try {
      const url = customUrl
        ? `${forcedBaseUrl || this.baseUrl}${customUrl}`
        : `${forcedBaseUrl || this.baseUrl}/api/${
            forcedTranslation || this.translation
          }/${this.bookId}/${this.chapter}.json`;
      // console.log(url, customUrl, "firstChapterApiLink");

      const response = await web.get(url);
      const json = response;

      const contentResponse = json?.data?.chapter?.content || json.content;
      if (contentResponse) {
        const parsedContent = parseContent(contentResponse);

        this.data = {
          book: json?.data?.book?.name || json.name,
          chapter: json?.data?.chapter?.number || json.chapter,
          content: parsedContent,
          bookId: json?.data?.book?.id || this.bookId,
          translation: forcedTranslation || this.translation,
          nextChapter:
            json?.data?.nextChapterApiLink || json?.nextChapterApiLink,
          prevChapter:
            json?.data?.previousChapterApiLink || json?.previousChapterApiLink,
          numberOfChapters:
            json?.data?.book?.numberOfChapters || json?.numberOfChapters,
        };

        this.footnotes = json?.data?.chapter?.footnotes || null;

        // Cache by content key (translation:bookId:chapter)
        setCachedBibleData(
          this.data.translation,
          this.data.bookId,
          this.data.chapter,
          this.data
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

  async open(bookId, chapter, translation = null, chapterUrl) {
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

      if (match) {
        const [, , bookId, chapter] = match;
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

      if (match) {
        const [, , bookId, chapter] = match;
        this.bookId = bookId;
        this.chapter = Number(chapter);
      }

      await this.fetch(this.data.prevChapter);
    }
  }

  async changeTranslation(newTranslation, bookData, forcedBaseUrl) {
    console.log("changeTranslation tra");
    this.translation = newTranslation;
    this.bookId = bookData?.id || "GEN";
    if (forcedBaseUrl) {
      this.chapter = 1;
    }
    this.baseUrl = forcedBaseUrl || this.baseUrl;
    await this.fetch(
      bookData
        ? bookData.firstChapterApiLink
        : `/api/${newTranslation}/${bookData?.id || "GEN"}/1.json`,
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
