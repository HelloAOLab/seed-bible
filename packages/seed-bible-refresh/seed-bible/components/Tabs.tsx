import type { ReaderTab } from "seed-bible.managers.TabsManager";
import type { Pane } from "../managers/PanesManager";
import { DEFAULT_TRANSLATION_ID } from "seed-bible.managers.BibleReadingManager";
// import { MobileSettingsIcon } from "./icons";
import { MobileSettingsIcon } from "seed-bible.components.icons";

const { useEffect } = os.appHooks;

interface TabsProps {
  tabs: ReaderTab[];
  selectedTabId: string;
  panes: Pane[];
  isSettingsOpen: boolean;
  isCollapsed: boolean;
  onSelectTab: (tabId: string) => void;
  onTogglePane: (tabId: string) => void;
  onAddTab: () => void;
  onToggleCollapse: () => void;
  onOpenSettings: () => void;
}

export function Tabs(props: TabsProps) {
  const {
    tabs,
    selectedTabId,
    panes,
    isSettingsOpen,
    isCollapsed,
    onSelectTab,
    onTogglePane,
    onAddTab,
    onToggleCollapse,
    onOpenSettings,
  } = props;
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
      className={`sb-tabs-sidebar${isCollapsed ? " sb-tabs-sidebar-collapsed" : ""}`}
    >
      <div className="sb-sidebar-top-row">
        <button
          onClick={onToggleCollapse}
          className="sb-sidebar-collapse-button"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="material-symbols-outlined">
            {isCollapsed ? "menu" : "menu_open"}
          </span>
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className="sb-sidebar-tabs-header">
            <h3 className="sb-sidebar-tabs-title">Tabs</h3>
            <button
              onClick={onAddTab}
              className="sb-tab-add-button"
              aria-label="Create new tab"
              title="New tab"
            >
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>

          <div className="sb-sidebar-tab-list">
            {tabs.map((tab) => {
              const isSelected = tab.id === selectedTabId;
              const isPaneVisible = panes.some(
                (pane) => pane.tab.id === tab.id
              );
              const currentBookId = tab.readingState.bookId.value;
              const currentBookName =
                tab.readingState.translationBooks.value?.books.find(
                  (book) => book.id === currentBookId
                )?.name ??
                currentBookId ??
                "-";
              const currentChapter = tab.readingState.chapterNumber.value;
              const currentTranslation =
                tab.readingState.translationId.value ?? DEFAULT_TRANSLATION_ID;
              return (
                <div key={tab.id} className="sb-tab-row">
                  <button
                    onClick={() => onSelectTab(tab.id)}
                    className={`sb-tab-button${
                      isSelected ? " sb-tab-button-selected" : ""
                    }`}
                  >
                    <span>{`${currentBookName} - ${currentChapter} • ${currentTranslation}`}</span>
                    <span className="material-symbols-outlined sb-tab-more-icon">
                      more_vert
                    </span>
                  </button>
                  <button
                    onClick={() => onTogglePane(tab.id)}
                    className={`sb-tab-pane-button${
                      isPaneVisible ? " sb-tab-pane-button-active" : ""
                    }`}
                    aria-label={
                      isPaneVisible
                        ? "Hide tab from panes"
                        : "Show tab in panes"
                    }
                    title={
                      isPaneVisible
                        ? "Hide tab from panes"
                        : "Show tab in panes"
                    }
                  >
                    <span className="material-symbols-outlined">
                      {isPaneVisible ? "splitscreen" : "add_to_home_screen"}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      <button
        onClick={onOpenSettings}
        className={`sb-sidebar-icon-button${
          isSettingsOpen ? " sb-sidebar-icon-button-selected" : ""
        }`}
        aria-label="Open settings"
        title="Settings"
      >
        <MobileSettingsIcon />
      </button>
    </aside>
  );
}
