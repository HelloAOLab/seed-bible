import { useSignal } from "@preact/signals";
import type { Pane } from "../managers/PanesManager";
import { DEFAULT_TRANSLATION_ID } from "seed-bible.managers.BibleReadingManager";
import type { ReaderTab } from "seed-bible.managers.TabsManager";
import { MobileSettingsIcon } from "seed-bible.components.icons";

const { useEffect } = os.appHooks;

interface TabsProps {
  tabs: ReaderTab[];
  selectedTabId: string;
  panes: Pane[];
  isSettingsOpen: boolean;
  isCollapsed: boolean;
  onSelectTab: (tabId: string) => void;
  onOpenInNewPane: (tabId: string) => void;
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
    onOpenInNewPane,
    onAddTab,
    onToggleCollapse,
    onOpenSettings,
  } = props;
  const openMenuTabId = useSignal<string | null>(null);
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
              const paneCount = panes.filter(
                (pane) => pane.tab.id === tab.id
              ).length;
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
                    onClick={() => {
                      openMenuTabId.value = null;
                      onSelectTab(tab.id);
                    }}
                    className={`sb-tab-button${
                      isSelected ? " sb-tab-button-selected" : ""
                    }`}
                  >
                    <span>{`${currentBookName} - ${currentChapter} • ${currentTranslation}`}</span>
                    {paneCount > 0 && (
                      <span className="sb-tab-pane-count">{paneCount}</span>
                    )}
                  </button>

                  <div className="sb-tab-menu-anchor">
                    <button
                      onClick={() => {
                        openMenuTabId.value =
                          openMenuTabId.value === tab.id ? null : tab.id;
                      }}
                      className="sb-tab-menu-button"
                      aria-label="Open tab menu"
                      title="Tab options"
                    >
                      <span className="material-symbols-outlined sb-tab-more-icon">
                        more_vert
                      </span>
                    </button>

                    {openMenuTabId.value === tab.id && (
                      <div className="sb-tab-menu">
                        <button
                          onClick={() => {
                            onOpenInNewPane(tab.id);
                            openMenuTabId.value = null;
                          }}
                          className="sb-tab-menu-item"
                        >
                          Open in new pane
                        </button>
                      </div>
                    )}
                  </div>
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
