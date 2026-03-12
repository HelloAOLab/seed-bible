import { signal } from "@preact/signals";
import { FreeUseBibleAPI } from "seed-bible.managers.FreeUseBibleAPI";
import {
  DEFAULT_BOOK_ID,
  DEFAULT_CHAPTER_NUMBER,
  DEFAULT_TRANSLATION_ID,
  useBibleReadingState,
  type BibleReadingState,
} from "seed-bible.managers.BibleReadingManager";

export interface ReaderTab {
  id: string;
  title: string;
  readingState: BibleReadingState;
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

function createInitialTabs(api: FreeUseBibleAPI): ReaderTab[] {
  return [
    {
      id: "tab-1",
      title: "Tab 1",
      readingState: useBibleReadingState(api, {
        initialTranslationId: getInitialTranslationId(),
        initialBookId: getInitialFirstTabBookId(),
        initialChapterNumber: getInitialFirstTabChapter(),
      }),
    },
    {
      id: "tab-2",
      title: "Tab 2",
      readingState: useBibleReadingState(api),
    },
  ];
}

const tabs = signal<ReaderTab[]>([]);
const selectedTabId = signal<string>("");
let hasConfigBotListener = false;
let isInitialized = false;
let sharedApi: FreeUseBibleAPI | null = null;

function ensureInitialized(api: FreeUseBibleAPI) {
  if (isInitialized) {
    if (sharedApi !== api) {
      console.warn(
        "useTabs() received a different FreeUseBibleAPI instance after initialization. Reusing the first instance."
      );
    }
    return;
  }

  sharedApi = api;
  const initialTabs = createInitialTabs(api);
  tabs.value = initialTabs;
  selectedTabId.value = initialTabs[0]?.id ?? "";
  isInitialized = true;
}

async function syncSelectedTabFromConfig() {
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
}

function ensureConfigBotListener() {
  if (hasConfigBotListener) {
    return;
  }

  hasConfigBotListener = true;
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
}

export type TabsManager = ReturnType<typeof useTabs>;

export function useTabs(api: FreeUseBibleAPI) {
  ensureInitialized(api);
  ensureConfigBotListener();

  const addTab = () => {
    const currentTabs = tabs.value;
    const nextNumber = currentTabs.length + 1;
    const nextTab: ReaderTab = {
      id: `tab-${nextNumber}`,
      title: `Tab ${nextNumber}`,
      readingState: useBibleReadingState(sharedApi ?? api),
    };
    tabs.value = [...currentTabs, nextTab];
    selectedTabId.value = nextTab.id;
    return nextTab;
  };

  const selectTab = (tabId: string) => {
    selectedTabId.value = tabId;
  };

  return {
    tabs,
    selectedTabId,
    addTab,
    selectTab,
  };
}
