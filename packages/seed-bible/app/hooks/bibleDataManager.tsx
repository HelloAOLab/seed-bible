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
    }

    async fetch(customUrl = null, forcedTranslation = null, forcedBaseUrl = null) {
        this.loading = true;
        this.error = null;

        try {
            // const url = customUrl
            //     ? `https://bible.helloao.org${customUrl}`
            //     : `https://bible.helloao.org/api/${forcedTranslation || this.translation}/${this.bookId}/${this.chapter}.json`;
            const url = customUrl
                ? `${forcedBaseUrl || this.baseUrl}${customUrl}`
                : `${forcedBaseUrl || this.baseUrl}/api/${forcedTranslation || this.translation}/${this.bookId}/${this.chapter}.json`;
            console.log(url, customUrl, "firstChapterApiLink")

            const response = await web.get(url);
            const json = response;

            const parsedContent = parseContent(json?.data?.chapter?.content || json.content);

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
        await this.fetch(chapterUrl ? chapterUrl : `/api/${translation || this.translation}/${bookId}/${chapter}.json`, translation);
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
        console.log("changeTranslation tra")
        this.translation = newTranslation;
        this.bookId = bookData?.id || 'GEN';
        if(forcedBaseUrl){
            this.chapter = 1;
        }
        this.baseUrl = forcedBaseUrl || this.baseUrl;
        await this.fetch(bookData ? bookData.firstChapterApiLink : `/api/${newTranslation}/${bookData?.id || 'GEN'}/1.json`, newTranslation, forcedBaseUrl);
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
