
const { useState, useEffect, useCallback } = os.appHooks;
const localStorage = getBot('system', 'app.localStorage')

import { useTabsContext } from 'app.hooks.tabs';
/**
 * useBibleData fetches Bible chapter data from an API with a simple transition effect.
 *
 * @param {Object} options - Initial options for the hook.
 * @param {string} options.initialTranslation - The initial Bible translation (default: 'BSB').
 * @param {string} options.initialBookId - The initial book identifier (default: 'GEN').
 * @param {number} options.initialChapter - The initial chapter number (default: 1).
 * @returns {Object} An object with data, loading and error states, and helper methods.
 */
function useBibleData({
    initialTranslation,
    initialBookId,
    initialChapter,
    tab = null
} = {}) {
    const { activeTab, updateTab } = useTabsContext()
    // os.log(CurrentTab, 'CurrentTab')
    const [translation, setTranslation] = useState('BSB');
    const [bookId, setBookId] = useState();
    const [chapter, setChapter] = useState();
    useEffect(() => {
        os.log(bookId, chapter, translation)
    }, [translation, bookId, chapter])
    const [data, setData] = useState({ content: [] });
    const [footnotes, setFootnotes] = useState(null);
    const [loading, setLoading] = useState(false);
    const [transitioning, setTransitioning] = useState(false);
    const [error, setError] = useState(null);
    const [baseUrl, setBaseUrl] = useState("https://bible.helloao.org")

    // Helper function to parse API chapter content into sections and verses.
    const parseContent = (content) => {
        const sections = [];
        let currentSection = { heading: '', number: 1, verses: [] };
        let isNewSection = true;

        const parseText = (arr) =>
            arr.map((item) => (typeof item === 'object' ? item.text : item)).join(' ');

        content.forEach((item) => {
            const { type, number, content: sectionContent } = item;
            if (type === 'heading') {
                // When a new heading is encountered, push the previous section.
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
        // Push the last section.
        sections.push(currentSection);
        return sections;
    };

    /**
     * fetchBookData retrieves the chapter data from the Bible API.
     * Optionally, you can pass a custom URL to load a different chapter.
     */
    const fetchBookData = useCallback(
        async (customUrl, ForcedTranslation) => {
            console.log(customUrl, 'custom dev')
            setLoading(true);
            setTransitioning(true);
            try {
                // const response = await web.get(url);
                // if (!response.ok) {
                //     throw new Error(`Error fetching data: ${response.statusText}`);
                // }
                const url = customUrl ? `${baseUrl}${customUrl}` : `${baseUrl}/api/${ForcedTranslation || translation || initialTranslation}/${bookId || initialBookId}/${chapter || initialChapter}.json`;
                const  response
                // os.log(url);
                // if (localStorage.tags[thisBot.id + `${bookId} ${chapter} ${translation}`] && !customUrl) {
                //     response = localStorage.tags[thisBot.id + `${bookId} ${chapter} ${translation}`]
                // } else if (localStorage.tags[thisBot.id + `${customUrl}`] && customUrl) {
                //     response = localStorage.tags[thisBot.id + `${customUrl}`]
                // } else {

                response = await web.get(url);
                // }
                // const response = await web.get(url);
                const json = response;

                os.log('stared', json)
                const parsedContent = parseContent(json?.data?.chapter?.content || json.content);
                const fullData = {
                    book: json?.data?.book?.name || json.name,
                    chapter: json?.data?.chapter?.number || json.chapter,
                    content: parsedContent,
                    bookId: json?.data?.book?.id,
                    translation: ForcedTranslation || translation || initialTranslation,
                    nextChapter: json?.data?.nextChapterApiLink || json?.nextChapterApiLink,
                    prevChapter: json?.data?.previousChapterApiLink || json?.previousChapterApiLink,
                    numberOfChapters: json?.data?.book.numberOfChapters || json?.numberOfChapters,
                    textDirection: json?.data?.translation?.textDirection || "ltr"
                }
                // localStorage.tags[thisBot.id + `${bookId} ${chapter} ${translation}`] = fullData
                // os.log(fullData)
                setData(fullData);
                setFootnotes(json?.data?.chapter.footnotes);
            } catch (err) {
                setError(err);
                console.log(err)
            } finally {
                setTransitioning(false);
                setLoading(false);
            }
        },
        [translation, bookId, chapter, baseUrl]
    );

    /**
     * openNextChapter loads the next chapter if available.
     */
    const openNextChapter = useCallback(() => {
        if (data && data.nextChapter) {
            fetchBookData(data.nextChapter);
        }
    }, [data]);

    /**
     * openPrevChapter loads the previous chapter if available.
     */
    const openPrevChapter = useCallback(() => {
        if (data && data.prevChapter) {
            fetchBookData(data.prevChapter);
        }
    }, [data]);

    /**
     * changeTranslation sets a new Bible translation, resets to Genesis 1,
     * and fetches the updated data.
     */
    // const changeTranslation = useCallback(
    //     async (newTranslation) => {
    //         setTranslation(newTranslation);
    //         await fetchBookData(`/api/${newTranslation || translation}/${`GEN`}/${`1`}.json`, newTranslation);
    //     },
    //     []
    // );

    const changeTranslation = useCallback((newTranslation, bookData) => {
        setBookId(bookData?.id || 'GEN');
        setChapter(1);
        setTranslation(newTranslation);
    }, []);


    const preloadSurroundingChapters = useCallback(async () => {
        const range = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5];
        range.forEach(async (offset) => {
            const targetChapter = chapter + offset;
            if (targetChapter < 1 || targetChapter > data?.numberOfChapters) return;

            const url = `${baseUrl}/api/${translation}/${bookId}/${targetChapter}.json`;
            if (!localStorage.tags[thisBot.id + `${bookId} ${targetChapter} ${translation}`]) {
                try {
                    const response = await web.get(url);
                    localStorage.tags[thisBot.id + `${bookId} ${targetChapter} ${translation}`] = response;
                } catch (err) {
                    console.error(`Failed to preload chapter ${targetChapter}:`, err);
                }
            }
        });
    }, [translation, bookId, chapter, data, baseUrl]);

    const open = useCallback(
        async (newBookId, newChapter, newTranslation = false) => {
            if (newTranslation) globalThis.STORED_TRANSLATION = newTranslation;
            globalThis.CHAPTER_DATA = {
                id: newBookId,
                chapterNo: newChapter,
                bookName: newBookId,
            };
            if (newTranslation) setTranslation(newTranslation);
            setBookId(newBookId);
            setChapter(newChapter);
            await fetchBookData(`/api/${newTranslation || translation}/${newBookId}/${newChapter}.json`);
        },
        []
    );

    // Automatically load the initial chapter when the hook mounts.
    useEffect(() => {
        if (!tab)
            return

        if (tab?.data?.first) {
            updateTab(tab?.id, { first: false })
            fetchBookData()
        }
        os.log('the tab bible data', tab)

    }, [tab]);

    useEffect(() => {
        if (translation) {
            fetchBookData();
        }
    }, [translation, baseUrl])

    return {
        data,
        footnotes,
        loading,
        error,
        transitioning,
        fetchBookData,
        open,
        openNextChapter,
        openPrevChapter,
        changeTranslation,
        preloadSurroundingChapters,
        baseUrl,
        setBaseUrl
    };
}

export default useBibleData;
