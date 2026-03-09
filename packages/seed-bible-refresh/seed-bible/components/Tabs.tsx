import type { ReaderTab } from "seed-bible.managers.TabsManager";
import { useEffect } from "https://esm.sh/preact@10.28.4/hooks";
import { DEFAULT_TRANSLATION_ID } from "seed-bible.managers.BibleReadingManager";
import { useTheme } from "seed-bible.managers.ThemeManager";

interface TabsProps {
  tabs: ReaderTab[];
  selectedTabId: string;
  onSelectTab: (tabId: string) => void;
  onAddTab: () => void;
}

export function Tabs(props: TabsProps) {
  const { tabs, selectedTabId, onSelectTab, onAddTab } = props;
  const { currentTheme } = useTheme();
  const theme = currentTheme.variables;
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
    <aside
      style={{
        width: "180px",
        borderRight: `1px solid ${theme.secondaryColor}`,
        padding: "12px 8px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        background: theme.sidebarBackground,
        color: theme.fontColor,
      }}
    >
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
            style={{
              textAlign: "left",
              border: `1px solid ${theme.secondaryColor}`,
              borderRadius: "8px",
              padding: "8px 10px",
              background: isSelected ? theme.primaryColor : theme.tertiaryColor,
              fontWeight: isSelected ? 700 : 400,
              cursor: "pointer",
              color: theme.fontColor,
            }}
          >
            <div style={{ fontSize: "12px", opacity: 0.75 }}>{tab.title}</div>
            <div>{`${currentBookName} ${currentChapter}`}</div>
          </button>
        );
      })}

      <button
        onClick={onAddTab}
        style={{
          textAlign: "left",
          border: `1px dashed ${theme.secondaryColor}`,
          borderRadius: "8px",
          padding: "8px 10px",
          background: theme.tertiaryColor,
          cursor: "pointer",
          color: theme.fontColor,
        }}
      >
        + New Tab
      </button>
    </aside>
  );
}
