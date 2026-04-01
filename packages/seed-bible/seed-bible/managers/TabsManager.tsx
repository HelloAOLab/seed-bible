import { signal } from "@preact/signals";
import type { BibleDataManager } from "./BibleDataManager";
import type { BibleReadingSession } from "seed-bible.managers.SessionsManager";
import {
  DEFAULT_BOOK_ID,
  DEFAULT_CHAPTER_NUMBER,
  DEFAULT_TRANSLATION_ID,
  createBibleReadingState,
  type BibleReadingState,
} from "seed-bible.managers.BibleReadingManager";
import type { HighlightsManager } from "seed-bible.managers.HighlightsManager";

export interface ReaderTab {
  id: string;
  title: string;
  readingState: BibleReadingState;
  sharedSession: BibleReadingSession | null;
}

function getInitialFirstTabBookId(): string {
  return typeof configBot.tags.book === "string" && configBot.tags.book.trim()
    ? configBot.tags.book
    : DEFAULT_BOOK_ID;
}

function getInitialTranslationId(): string {
  return (
    configBot.tags.translation ??
    configBot.tags.translationId ??
    DEFAULT_TRANSLATION_ID
  );
}

function getInitialFirstTabChapter(): number {
  const value = Number(configBot.tags.chapter);
  return Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : DEFAULT_CHAPTER_NUMBER;
}

function createInitialTabs(
  dataManager: BibleDataManager,
  highlightsManager: HighlightsManager
): ReaderTab[] {
  return [
    {
      id: "tab-1",
      title: "Tab 1",
      readingState: createBibleReadingState(dataManager, highlightsManager, {
        initialTranslationId: getInitialTranslationId(),
        initialBookId: getInitialFirstTabBookId(),
        initialChapterNumber: getInitialFirstTabChapter(),
      }),
      sharedSession: null,
    },
    {
      id: "tab-2",
      title: "Tab 2",
      readingState: createBibleReadingState(dataManager, highlightsManager),
      sharedSession: null,
    },
  ];
}

type NewTabSource = BibleReadingState | BibleReadingSession;

function isBibleReadingSession(
  value: NewTabSource | undefined
): value is BibleReadingSession {
  return !!value && "document" in value && "readingState" in value;
}

export type TabsManager = ReturnType<typeof createTabs>;

export function createTabs(
  dataManager: BibleDataManager,
  highlightsManager: HighlightsManager
) {
  const tabs = signal<ReaderTab[]>(
    createInitialTabs(dataManager, highlightsManager)
  );
  const selectedTabId = signal<string>(tabs.value[0]?.id ?? "");

  const syncSelectedTabFromConfig = async () => {
    const selectedTab =
      tabs.value.find((tab) => tab.id === selectedTabId.value) ?? null;
    if (!selectedTab) {
      return;
    }

    const requestedTranslation = getInitialTranslationId();
    const requestedBookId = getInitialFirstTabBookId();
    const requestedChapter = getInitialFirstTabChapter();
    const readingState = selectedTab.readingState;

    if (readingState.translationId.value !== requestedTranslation) {
      await readingState.selectTranslation(requestedTranslation);
    }

    const books = readingState.translationBooks.value?.books ?? [];
    const selectedBook =
      books.find((book) => book.id === requestedBookId) ?? null;
    if (!selectedBook) {
      return;
    }

    const firstChapterNumber =
      selectedBook.firstChapterNumber ?? DEFAULT_CHAPTER_NUMBER;
    const maxChapterNumber =
      firstChapterNumber + selectedBook.numberOfChapters - 1;
    const nextChapter =
      requestedChapter >= firstChapterNumber &&
      requestedChapter <= maxChapterNumber
        ? requestedChapter
        : firstChapterNumber;

    if (
      readingState.bookId.value === requestedBookId &&
      readingState.chapterNumber.value === nextChapter
    ) {
      return;
    }

    await readingState.selectChapter(requestedBookId, nextChapter);
  };

  os.addBotListener(configBot, "onBotChanged", async (that: unknown) => {
    const changedTagsSource =
      that && typeof that === "object" && "tags" in that
        ? (that as { tags?: unknown }).tags
        : null;
    const changedTags = Array.isArray(changedTagsSource)
      ? changedTagsSource
      : [];
    const hasReadingStateTagChange =
      changedTags.includes("translation") ||
      changedTags.includes("book") ||
      changedTags.includes("chapter");

    if (!hasReadingStateTagChange) {
      return;
    }

    await syncSelectedTabFromConfig();
  });

  const addTab = (source?: NewTabSource) => {
    const currentTabs = tabs.value;
    const nextNumber = currentTabs.length + 1;
    const sharedSession = isBibleReadingSession(source) ? source : null;
    const readingState = !isBibleReadingSession(source) ? source : null;
    const nextTab: ReaderTab = {
      id: `tab-${nextNumber}`,
      title: `Tab ${nextNumber}`,
      readingState:
        sharedSession?.readingState ??
        readingState ??
        createBibleReadingState(dataManager, highlightsManager),
      sharedSession,
    };
    tabs.value = [...currentTabs, nextTab];
    selectedTabId.value = nextTab.id;
    return nextTab;
  };

  const removeTab = (tabId: string) => {
    const tab = tabs.value.find((t) => t.id === tabId);
    if (tab?.sharedSession) {
      tab.sharedSession.dispose();
    }

    const nextTabs = tabs.value.filter((tab) => tab.id !== tabId);
    tabs.value = nextTabs;

    if (selectedTabId.value === tabId) {
      selectedTabId.value = nextTabs[0]?.id ?? "";
    }
  };

  const selectTab = (tabId: string) => {
    selectedTabId.value = tabId;
  };

  return {
    tabs,
    selectedTabId,
    addTab,
    removeTab,
    selectTab,
  };
}
