import { useSignal } from "@preact/signals";
import { DEFAULT_TRANSLATION_ID } from "seed-bible.managers.BibleReadingManager";
import {
  PANE_LAYOUT_OPTIONS,
  type PaneLayoutId,
} from "seed-bible.managers.PanesManager";
import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";
import { MobileSettingsIcon } from "seed-bible.components.icons";

const { useEffect } = os.appHooks;

interface TabsProps {
  state: SeedBibleState;
}

function renderLayoutPreview(layoutId: PaneLayoutId) {
  const slotCount =
    PANE_LAYOUT_OPTIONS.find((layout) => layout.id === layoutId)?.slotCount ??
    1;

  return (
    <div className="sb-pane-layout-preview" data-layout={layoutId}>
      {Array.from({ length: slotCount }, (_, index) => (
        <div
          key={`${layoutId}-${index + 1}`}
          className={`sb-pane-layout-preview-cell sb-pane-layout-preview-cell-${index + 1}`}
        >
          {index + 1}
        </div>
      ))}
    </div>
  );
}

export function Tabs(props: TabsProps) {
  const { state } = props;
  const { app, panes, sidebar, tabs: tabsManager } = state;
  const tabs = tabsManager.tabs.value;
  const selectedTabId = tabsManager.selectedTabId.value;
  const paneLayout = app.panelsEnabled.value ? panes.layout.value : "single";
  const panelsEnabled = app.panelsEnabled.value;
  const isSettingsOpen = sidebar.isSettingsOpen.value;
  const isCollapsed = sidebar.isSidebarCollapsed.value;
  const isMobileOpen = sidebar.isMobileOpen.value;
  const effectivelyCollapsed = isCollapsed && !isMobileOpen;
  const openMenuTabId = useSignal<string | null>(null);
  const isLayoutMenuOpen = useSignal(false);
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
      className={`sb-tabs-sidebar${effectivelyCollapsed ? " sb-tabs-sidebar-collapsed" : ""}${isMobileOpen ? " sb-tabs-sidebar-mobile-open" : ""}`}
    >
      <div className="sb-sidebar-top-row">
        <button
          onClick={sidebar.toggleSidebarCollapsed}
          className="sb-sidebar-collapse-button"
          aria-label={
            effectivelyCollapsed ? "Expand sidebar" : "Collapse sidebar"
          }
          title={effectivelyCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="material-symbols-outlined">
            {effectivelyCollapsed ? "menu" : "menu_open"}
          </span>
        </button>

        {panelsEnabled && (
          <div className="sb-sidebar-top-actions">
            <div className="sb-pane-layout-anchor">
              <button
                onClick={() => {
                  openMenuTabId.value = null;
                  isLayoutMenuOpen.value = !isLayoutMenuOpen.value;
                }}
                className="sb-sidebar-top-icon-button"
                aria-label="Select pane layout"
                title="Pane layout"
              >
                <span className="material-symbols-outlined">dashboard</span>
              </button>

              {isLayoutMenuOpen.value && (
                <div className="sb-pane-layout-menu">
                  <div className="sb-pane-layout-menu-title">Panels</div>
                  <div className="sb-pane-layout-options">
                    {PANE_LAYOUT_OPTIONS.map((layout) => (
                      <button
                        key={layout.id}
                        onClick={() => {
                          panes.setLayout(layout.id);
                          isLayoutMenuOpen.value = false;
                        }}
                        className={`sb-pane-layout-option${
                          paneLayout === layout.id
                            ? " sb-pane-layout-option-selected"
                            : ""
                        }`}
                        aria-label={layout.label}
                        title={layout.label}
                      >
                        {renderLayoutPreview(layout.id)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        <button
          onClick={sidebar.closeSidebar}
          className="sb-sidebar-close-button"
          aria-label="Close sidebar"
          title="Close sidebar"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {!effectivelyCollapsed && (
        <>
          <div className="sb-sidebar-tabs-header">
            <h3 className="sb-sidebar-tabs-title">Tabs</h3>
            <button
              onClick={app.addTab}
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
                      isLayoutMenuOpen.value = false;
                      app.selectTab(tab.id);
                    }}
                    className={`sb-tab-button${
                      isSelected ? " sb-tab-button-selected" : ""
                    }`}
                  >
                    <span>{`${currentBookName} - ${currentChapter} • ${currentTranslation}`}</span>
                  </button>

                  <div className="sb-tab-menu-anchor">
                    <button
                      onClick={() => {
                        isLayoutMenuOpen.value = false;
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

                    {panelsEnabled && openMenuTabId.value === tab.id && (
                      <div className="sb-tab-menu">
                        <button
                          onClick={() => {
                            app.openInNewPane(tab.id);
                            openMenuTabId.value = null;
                          }}
                          className="sb-tab-menu-item"
                        >
                          Open in new pane
                        </button>
                        <button
                          onClick={() => {
                            app.openInDetachedPane(tab.id);
                            openMenuTabId.value = null;
                          }}
                          className="sb-tab-menu-item"
                        >
                          Open in detached pane
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
        onClick={sidebar.openSettings}
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
