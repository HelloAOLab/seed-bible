import { signal } from "https://esm.sh/@preact/signals?deps=preact@10.28.4?externals=preact";
import {
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
    : "GEN";
}

function getInitialTranslationId(): string {
  return typeof configBot.tags.translation === "string" &&
    configBot.tags.translation.trim()
    ? configBot.tags.translation
    : "BSB";
}

function getInitialFirstTabChapter(): number {
  const value = Number(configBot.tags.chapter);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

function createInitialTabs(): ReaderTab[] {
  return [
    {
      id: "tab-1",
      title: "Tab 1",
      readingState: useBibleReadingState({
        initialTranslationId: getInitialTranslationId(),
        initialBookId: getInitialFirstTabBookId(),
        initialChapterNumber: getInitialFirstTabChapter(),
      }),
    },
    { id: "tab-2", title: "Tab 2", readingState: useBibleReadingState() },
  ];
}

const initialTabs = createInitialTabs();
const tabs = signal<ReaderTab[]>(initialTabs);
const selectedTabId = signal<string>(initialTabs[0]?.id ?? "");

export function useTabs() {
  const addTab = () => {
    const currentTabs = tabs.value;
    const nextNumber = currentTabs.length + 1;
    const nextTab: ReaderTab = {
      id: `tab-${nextNumber}`,
      title: `Tab ${nextNumber}`,
      readingState: useBibleReadingState(),
    };
    tabs.value = [...currentTabs, nextTab];
    selectedTabId.value = nextTab.id;
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
