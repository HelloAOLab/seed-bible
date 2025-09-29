const bibleTabDataCache = new Map();

export function getCachedTabData(tabId) {
    return bibleTabDataCache.get(tabId);
}

export function setCachedTabData(tabId, data) {
    bibleTabDataCache.set(tabId, data);
}

function parseContent(content) {
    const sections = [];
    let currentSection = { heading: '', number: 1, verses: [] };
    let isNewSection = true;

    const parseText = (arr) =>
        arr.map((item) => (typeof item === 'object' ? item.text : item)).join(' ');

    content.forEach((item) => {
        const { type, number, content: sectionContent } = item;
        if (type === 'heading') {
            if (!isNewSection) {
                sections.push(currentSection);
                currentSection = { heading: '', number: currentSection.number + 1, verses: [] };
            }
            currentSection.heading = parseText(sectionContent);
            isNewSection = false;
        } else if (type === 'verse') {
            const verseText = parseText(sectionContent);
            currentSection.verses.push({ verseNumber: number, text: verseText });
        }
    });

    sections.push(currentSection);
    return sections;
}

export class BibleDataManager {
    constructor({ tabId = null, translation = 'BSB', bookId = 'GEN', chapter = 1, baseUrl = "https://bible.helloao.org" } = {}) {
        this.tabId = tabId;
        this.translation = translation;
        this.bookId = bookId;
        this.chapter = chapter;
        this.baseUrl = baseUrl;

        this.data = getCachedTabData(tabId) || { content: [] };
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
        if (!this.tabId) return;

        if (!Array.isArray(masks[this.tabId])) {
            masks[this.tabId] = [];
        }

        if (this._viewingTimer) clearTimeout(this._viewingTimer);

        this._viewingStart = Date.now();
        const keyAtScheduleTime = this._getKey();

        this._viewingTimer = setTimeout(() => {
            if (keyAtScheduleTime === this._getKey()) {
                if (this._lastRecordedKey !== keyAtScheduleTime) {
                    masks[this.tabId].push({
                        bookId: this.bookId,
                        chapter: this.chapter,
                        translation: this.translation,
                        recordedAt: new Date().toISOString(),
                        secondsOpen: Math.round((Date.now() - this._viewingStart) / 1000)
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

    async fetch(customUrl = null, forcedTranslation = null, forcedBaseUrl = null) {
        this.loading = true;
        this.error = null;

        try {
            const url = customUrl
                ? `${forcedBaseUrl || this.baseUrl}${customUrl}`
                : `${forcedBaseUrl || this.baseUrl}/api/${forcedTranslation || this.translation}/${this.bookId}/${this.chapter}.json`;
            console.log(url, customUrl, "firstChapterApiLink");

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
                    nextChapter: json?.data?.nextChapterApiLink || json?.nextChapterApiLink,
                    prevChapter: json?.data?.previousChapterApiLink || json?.previousChapterApiLink,
                    numberOfChapters: json?.data?.book?.numberOfChapters || json?.numberOfChapters,
                };

                this.footnotes = json?.data?.chapter?.footnotes || null;

                if (this.tabId) {
                    setCachedTabData(this.tabId, this.data);
                }

                // schedule the "open ≥ 1 min" record
                this._scheduleMaskRecord();
            }
        } catch (err) {
            this.error = err;
            console.error('Failed to fetch bible data:', err);
        } finally {
            this.loading = false;
        }
    }

    async open(bookId, chapter, translation = null, chapterUrl) {
        this.bookId = bookId;
        this.chapter = chapter;
        if (translation) this.translation = translation;
        await this.fetch(
            chapterUrl ? chapterUrl : `/api/${translation || this.translation}/${bookId}/${chapter}.json`,
            translation
        );
    }

    async openNext() {
        if (this.data?.nextChapter) {
            await this.fetch(this.data.nextChapter);
        }
    }

    async openPrevious() {
        if (this.data?.prevChapter) {
            await this.fetch(this.data.prevChapter);
        }
    }

    async changeTranslation(newTranslation, bookData, forcedBaseUrl) {
        console.log("changeTranslation tra");
        console.log("newTranslation: ", newTranslation, " bookData: ", bookData, " forcedBaseUrl: ", forcedBaseUrl);
        this.translation = newTranslation;

        // Update baseUrl only if provided
        if (forcedBaseUrl) {
            this.baseUrl = forcedBaseUrl;
        }

        // If we DON'T have a concrete book, do NOT default to GEN or chapter 1.
        // Just update translation/baseUrl and exit quietly.
        if (!bookData || !bookData.id) {
            return;
        }

        // We have a real book — set bookId and chapter safely
        this.bookId = bookData.id;

        // Try to infer chapter from the provided link; otherwise default to 1 for THIS book only
        let chapter = 1;
        if (bookData.firstChapterApiLink) {
            const m = /\/(\d+)\.json$/.exec(bookData.firstChapterApiLink);
            if (m) {
                const parsed = parseInt(m[1], 10);
                if (!Number.isNaN(parsed)) chapter = parsed;
            }
        }
        this.chapter = chapter;

        // Build a safe URL
        const href =
            bookData.firstChapterApiLink ||
            `/api/${newTranslation}/${bookData.id}/${chapter}.json`;

        await this.fetch(href, newTranslation, this.baseUrl);
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
