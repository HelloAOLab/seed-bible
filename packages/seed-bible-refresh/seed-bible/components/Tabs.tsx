import { BibleReader } from "seed-bible.components.BibleReader";
import { FreeUseBibleAPI } from "seed-bible.managers.FreeUseBibleAPI";
import type { BibleReadingState } from "seed-bible.managers.BibleReadingManager";
import {
  TabsManager,
  type ReaderTab,
  type ReaderTabReadingData,
} from "../managers/TabsManager";

const { useEffect, useMemo, useState } = os.appHooks;

export function Tabs() {
  const tabsManager = useMemo(() => new TabsManager(), []);
  const api = useMemo(() => new FreeUseBibleAPI(), []);
  const initialTabs = useMemo(
    () => tabsManager.createInitialTabs(),
    [tabsManager]
  );

  const [tabs, setTabs] = useState<ReaderTab[]>(initialTabs);
  const [selectedTabId, setSelectedTabId] = useState<string>(
    tabsManager.getInitialSelectedTabId(initialTabs) ?? ""
  );

  const selectedTab = tabs.find((tab) => tab.id === selectedTabId) ?? null;
  const selectedReading = selectedTab?.reading ?? null;

  const updateTabReading = (
    tabId: string,
    updater: (reading: ReaderTabReadingData) => ReaderTabReadingData
  ) => {
    setTabs((currentTabs) =>
      currentTabs.map((tab) =>
        tab.id === tabId ? { ...tab, reading: updater(tab.reading) } : tab
      )
    );
  };

  const loadInitialDataForTab = async (
    tabId: string,
    preferredTranslationId: string | null
  ) => {
    updateTabReading(tabId, (reading) => ({
      ...reading,
      loading: true,
      error: null,
    }));

    try {
      const translations = await api.getAvailableTranslations();
      const selectedTranslation =
        translations.translations.find(
          (t) => t.id === preferredTranslationId
        ) ?? translations.translations[0];

      if (!selectedTranslation) {
        throw new Error("No translations available.");
      }

      const books = await api.getTranslationBooks(selectedTranslation.id);
      const firstBook = books.books[0];
      if (!firstBook) {
        throw new Error("No books available for selected translation.");
      }

      const firstChapterNumber = firstBook.firstChapterNumber ?? 1;
      const chapterData = await api.getTranslationBookChapter(
        selectedTranslation.id,
        firstBook.id,
        firstChapterNumber
      );

      updateTabReading(tabId, (reading) => ({
        ...reading,
        translationId: selectedTranslation.id,
        bookId: firstBook.id,
        chapterNumber: firstChapterNumber,
        availableTranslations: translations,
        translationBooks: books,
        chapterData,
        loading: false,
        error: null,
        isInitialized: true,
      }));
    } catch (error) {
      updateTabReading(tabId, (reading) => ({
        ...reading,
        loading: false,
        error:
          error instanceof Error ? error.message : "Failed to load Bible data.",
        isInitialized: true,
      }));
    }
  };

  useEffect(() => {
    if (
      !selectedTab ||
      selectedTab.reading.isInitialized ||
      selectedTab.reading.loading
    ) {
      return;
    }

    void loadInitialDataForTab(
      selectedTab.id,
      selectedTab.reading.translationId
    );
  }, [selectedTabId, selectedTab]);

  const addTab = () => {
    setTabs((currentTabs) => {
      const nextTab = tabsManager.createNextTab(currentTabs);
      setSelectedTabId(nextTab.id);
      return [...currentTabs, nextTab];
    });
  };

  const selectTranslation = async (translation: string) => {
    if (!selectedTab) {
      return;
    }

    updateTabReading(selectedTab.id, (reading) => ({
      ...reading,
      loading: true,
      error: null,
    }));

    try {
      const books = await api.getTranslationBooks(translation);
      const firstBook = books.books[0];
      if (!firstBook) {
        throw new Error("No books available for selected translation.");
      }

      const firstChapterNumber = firstBook.firstChapterNumber ?? 1;
      const chapterData = await api.getTranslationBookChapter(
        translation,
        firstBook.id,
        firstChapterNumber
      );

      updateTabReading(selectedTab.id, (reading) => ({
        ...reading,
        translationId: translation,
        bookId: firstBook.id,
        chapterNumber: firstChapterNumber,
        translationBooks: books,
        chapterData,
        loading: false,
        error: null,
      }));
    } catch (error) {
      updateTabReading(selectedTab.id, (reading) => ({
        ...reading,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to select translation.",
      }));
    }
  };

  const selectBook = async (book: string) => {
    if (
      !selectedTab ||
      !selectedReading?.translationId ||
      !selectedReading.translationBooks
    ) {
      return;
    }

    const selectedBook = selectedReading.translationBooks.books.find(
      (entry) => entry.id === book
    );
    if (!selectedBook) {
      return;
    }

    updateTabReading(selectedTab.id, (reading) => ({
      ...reading,
      loading: true,
      error: null,
    }));

    try {
      const nextChapterNumber = selectedBook.firstChapterNumber ?? 1;
      const chapterData = await api.getTranslationBookChapter(
        selectedReading.translationId,
        book,
        nextChapterNumber
      );

      updateTabReading(selectedTab.id, (reading) => ({
        ...reading,
        bookId: book,
        chapterNumber: nextChapterNumber,
        chapterData,
        loading: false,
        error: null,
      }));
    } catch (error) {
      updateTabReading(selectedTab.id, (reading) => ({
        ...reading,
        loading: false,
        error:
          error instanceof Error ? error.message : "Failed to select book.",
      }));
    }
  };

  const selectChapter = async (book: string, chapter: number) => {
    if (!selectedTab || !selectedReading?.translationId) {
      return;
    }

    updateTabReading(selectedTab.id, (reading) => ({
      ...reading,
      loading: true,
      error: null,
    }));

    try {
      const chapterData = await api.getTranslationBookChapter(
        selectedReading.translationId,
        book,
        chapter
      );

      updateTabReading(selectedTab.id, (reading) => ({
        ...reading,
        bookId: book,
        chapterNumber: chapter,
        chapterData,
        loading: false,
        error: null,
      }));
    } catch (error) {
      updateTabReading(selectedTab.id, (reading) => ({
        ...reading,
        loading: false,
        error:
          error instanceof Error ? error.message : "Failed to select chapter.",
      }));
    }
  };

  const syncStateFromChapter = async (
    tabId: string,
    reading: ReaderTabReadingData,
    chapterData: NonNullable<ReaderTabReadingData["chapterData"]>
  ) => {
    let nextBooks = reading.translationBooks;
    if (reading.translationId !== chapterData.translation.id || !nextBooks) {
      nextBooks = await api.getTranslationBooks(chapterData.translation.id);
    }

    updateTabReading(tabId, (current) => ({
      ...current,
      translationId: chapterData.translation.id,
      bookId: chapterData.book.id,
      chapterNumber: chapterData.chapter.number,
      translationBooks: nextBooks,
      chapterData,
      loading: false,
      error: null,
    }));
  };

  const loadPreviousChapter = async () => {
    if (!selectedTab || !selectedReading?.chapterData) {
      return;
    }

    updateTabReading(selectedTab.id, (reading) => ({
      ...reading,
      loading: true,
      error: null,
    }));

    try {
      const chapterData = await api.getPreviousChapter(
        selectedReading.chapterData
      );
      if (!chapterData) {
        updateTabReading(selectedTab.id, (reading) => ({
          ...reading,
          loading: false,
        }));
        return;
      }
      await syncStateFromChapter(selectedTab.id, selectedReading, chapterData);
    } catch (error) {
      updateTabReading(selectedTab.id, (reading) => ({
        ...reading,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load previous chapter.",
      }));
    }
  };

  const loadNextChapter = async () => {
    if (!selectedTab || !selectedReading?.chapterData) {
      return;
    }

    updateTabReading(selectedTab.id, (reading) => ({
      ...reading,
      loading: true,
      error: null,
    }));

    try {
      const chapterData = await api.getNextChapter(selectedReading.chapterData);
      if (!chapterData) {
        updateTabReading(selectedTab.id, (reading) => ({
          ...reading,
          loading: false,
        }));
        return;
      }
      await syncStateFromChapter(selectedTab.id, selectedReading, chapterData);
    } catch (error) {
      updateTabReading(selectedTab.id, (reading) => ({
        ...reading,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load next chapter.",
      }));
    }
  };

  const currentState: BibleReadingState = {
    translationId: selectedReading?.translationId ?? null,
    bookId: selectedReading?.bookId ?? null,
    chapterNumber: selectedReading?.chapterNumber ?? 1,
    availableTranslations: selectedReading?.availableTranslations ?? null,
    translationBooks: selectedReading?.translationBooks ?? null,
    chapterData: selectedReading?.chapterData ?? null,
    loading: selectedReading?.loading ?? false,
    error: selectedReading?.error ?? null,
    selectTranslation,
    selectBook,
    selectChapter,
    loadPreviousChapter,
    loadNextChapter,
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: "180px",
          borderRight: "1px solid #ddd",
          padding: "12px 8px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          background: "#f8f8f8",
        }}
      >
        {tabs.map((tab) => {
          const isSelected = tab.id === selectedTabId;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedTabId(tab.id)}
              style={{
                textAlign: "left",
                border: "1px solid #d0d0d0",
                borderRadius: "8px",
                padding: "8px 10px",
                background: isSelected ? "#e7e7e7" : "#fff",
                fontWeight: isSelected ? 700 : 400,
                cursor: "pointer",
              }}
            >
              {tab.title}
            </button>
          );
        })}

        <button
          onClick={addTab}
          style={{
            textAlign: "left",
            border: "1px dashed #c0c0c0",
            borderRadius: "8px",
            padding: "8px 10px",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          + New Tab
        </button>
      </aside>

      <main style={{ flex: 1 }}>
        <BibleReader {...currentState} />
      </main>
    </div>
  );
}
