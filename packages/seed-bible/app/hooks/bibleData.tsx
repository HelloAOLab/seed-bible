const { useState, useEffect, useCallback } = os.appHooks;
import { useTabsContext } from "app.hooks.tabs";

const bibleTabDataCache = new Map();

export function getCachedTabData(tabId: any) {
  return bibleTabDataCache.get(tabId);
}

export function setCachedTabData(tabId: any, data) {
  bibleTabDataCache.set(tabId, data);
}

function parseContent(content: any) {
  const sections = [];
  let currentSection = { heading: "", number: 1, verses: [] };
  let isNewSection = true;

  const parseText = (arr: any) =>
    arr.map((item) => (typeof item === "object" ? item.text : item)).join(" ");

  content?.forEach((item: any) => {
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
    }
  });

  sections.push(currentSection);
  return sections;
}

function useBibleData({
  initialTranslation = "NASB95",
  initialBookId = "GEN",
  initialChapter = 1,
  tab = null,
}: any = {}) {
  const { updateTab } = useTabsContext();

  const [translation, setTranslation] = useState(initialTranslation);
  const [bookId, setBookId] = useState(initialBookId);
  const [chapter, setChapter] = useState(initialChapter);
  const [data, setData] = useState(
    () => getCachedTabData(tab?.id) || { content: [] }
  );
  const [footnotes, setFootnotes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBookData = useCallback(
    async (customUrl, forcedTranslation = null, setBook = false) => {
      setLoading(true);
      try {
        const url = customUrl
          ? `https://vmfnri.helloao.org${customUrl}`
          : `https://vmfnri.helloao.org/api/${
              forcedTranslation || translation
            }/${bookId}/${chapter}.json`;

        const response = await web.get(url);
        const json = response;

        const contentResponse = json?.data?.chapter?.content || json.content;
        if (contentResponse) {
          const parsedContent = parseContent(
            json?.data?.chapter?.content || json.content
          );
          const fullData = {
            book: json?.data?.book?.name || json.name,
            chapter: json?.data?.chapter?.number || json.chapter,
            content: parsedContent,
            bookId: json?.data?.book?.id || bookId,
            translation: forcedTranslation || translation,
            nextChapter:
              json?.data?.nextChapterApiLink || json?.nextChapterApiLink,
            prevChapter:
              json?.data?.previousChapterApiLink ||
              json?.previousChapterApiLink,
            numberOfChapters:
              json?.data?.book?.numberOfChapters || json?.numberOfChapters,
          };

          if (setBook) {
            if (globalThis.SetCurrentBook) {
              globalThis.SetCurrentBook(fullData);
              globalThis.CHAPTER_DATA = {
                ...fullData,
              };
            }
            globalThis.CurrentBookData = { ...fullData };
          }

          setData(fullData);
          setCachedTabData(tab?.id, fullData);
          setFootnotes(json?.data?.chapter?.footnotes);
        }
      } catch (err) {
        setError(err);
        console.error("Failed to fetch book data:", err);
      } finally {
        setLoading(false);
      }
    },
    [translation, bookId, chapter]
  );

  const open = useCallback(
    async (newBookId: any, newChapter: any, newTranslation = null) => {
      if (newTranslation) setTranslation(newTranslation);
      setBookId(newBookId);
      setChapter(newChapter);
      await fetchBookData(
        `/api/${newTranslation || translation}/${newBookId}/${newChapter}.json`,
        newTranslation,
        true
      );
    },
    [fetchBookData]
  );

  const openNextChapter = useCallback(() => {
    if (data?.nextChapter) fetchBookData(data.nextChapter, null, true);
  }, [data, fetchBookData]);

  const openPrevChapter = useCallback(() => {
    if (data?.prevChapter) fetchBookData(data.prevChapter, null, true);
  }, [data, fetchBookData]);

  const changeTranslation = useCallback(
    async (newTranslation: any) => {
      setTranslation(newTranslation);
      await fetchBookData(
        `/api/${newTranslation}/${bookId}/${chapter}.json`,
        newTranslation
      );
    },
    [fetchBookData]
  );

  // 🧠 Sync when `tab` changes (e.g., on space switch)
  useEffect(() => {
    if (tab?.id && tab?.data) {
      const cached = getCachedTabData(tab.id);
      if (cached) {
        setData(cached);
      } else {
        const newTranslation = tab.data.translation || initialTranslation;
        const newBookId = tab.data.bookId || initialBookId;
        const newChapter = tab.data.chapter || initialChapter;

        setTranslation(newTranslation);
        setBookId(newBookId);
        setChapter(newChapter);

        fetchBookData(
          `/api/${newTranslation}/${newBookId}/${newChapter}.json`,
          newTranslation,
          true
        );
      }
    }
  }, [tab?.id, tab?.data?.bookId, tab?.data?.chapter, tab?.data?.translation]);

  // 📌 Update context with current data
  useEffect(() => {
    if (tab?.id && data?.book && data?.chapter) {
      updateTab(tab.id, data);
    }
  }, [data]);

  return {
    data,
    footnotes,
    loading,
    error,
    open,
    openNextChapter,
    openPrevChapter,
    changeTranslation,
  };
}

export default useBibleData;
