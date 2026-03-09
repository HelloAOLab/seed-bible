import type { ReaderTab } from "seed-bible.managers.TabsManager";
import { useEffect } from "https://esm.sh/preact@10.28.4/hooks";
import { DEFAULT_TRANSLATION_ID } from "seed-bible.managers.BibleReadingManager";

interface TabsProps {
  tabs: ReaderTab[];
  selectedTabId: string;
  onSelectTab: (tabId: string) => void;
  onAddTab: () => void;
}

export function Tabs(props: TabsProps) {
  const { tabs, selectedTabId, onSelectTab, onAddTab } = props;
  const selectedTab = tabs.find((tab) => tab.id === selectedTabId) ?? null;
  const selectedBookId = selectedTab?.readingState.bookId.value ?? null;
  const selectedChapter = selectedTab?.readingState.chapterNumber.value ?? null;
  const selectedTranslation =
    selectedTab?.readingState.translationId.value ?? null;

  useEffect(() => {
    configBot.tags.book = selectedBookId;
    configBot.tags.chapter = selectedChapter;

    if (
      configBot.tags.translation ||
      selectedTranslation !== DEFAULT_TRANSLATION_ID
    ) {
      configBot.tags.translation = selectedTranslation;
    }
  }, [selectedBookId, selectedChapter, selectedTranslation]);

  return (
    <aside className="sb-tabs-sidebar">
      {tabs.map((tab) => {
        const isSelected = tab.id === selectedTabId;
        const currentBookId = tab.readingState.bookId.value;
        const currentBookName =
          tab.readingState.translationBooks.value?.books.find(
            (book) => book.id === currentBookId
          )?.name ??
          currentBookId ??
          "-";
        const currentChapter = tab.readingState.chapterNumber.value;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`sb-tab-button${isSelected ? " sb-tab-button-selected" : ""}`}
          >
            <div className="sb-tab-title">{tab.title}</div>
            <div>{`${currentBookName} ${currentChapter}`}</div>
          </button>
        );
      })}

      <button onClick={onAddTab} className="sb-tab-add-button">
        + New Tab
      </button>
    </aside>
  );
}
