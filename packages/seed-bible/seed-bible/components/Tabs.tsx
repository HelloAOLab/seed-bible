import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import { DEFAULT_TRANSLATION_ID } from "seed-bible.managers.BibleReadingManager";
import {
  PANE_LAYOUT_OPTIONS,
  type PaneLayoutId,
} from "seed-bible.managers.PanesManager";
import {
  closeContextMenus,
  ContextMenuItem,
  ContextMenuWithButton,
} from "seed-bible.components.ContextMenu";
import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";
import { MobileSettingsIcon } from "seed-bible.components.icons";
import { SettingsPage } from "seed-bible.components.SettingsPage";
import type { UserProfile } from "seed-bible.managers.LoginManager";
import type { ConnectedSessionUser } from "seed-bible.managers.SessionsManager";
import { useI18n } from "seed-bible.i18n.I18nManager";
import type { ReaderTab } from "seed-bible.managers.TabsManager";

interface SidebarProps {
  state: SeedBibleState;
}

interface TabsProps {
  state: SeedBibleState;
  closeLayoutMenu: () => void;
}

interface TabsHeaderProps {
  state: SeedBibleState;
  effectivelyCollapsed: boolean;
  panelsEnabled: boolean;
  paneLayout: PaneLayoutId | "single";
  isLayoutMenuOpen: boolean;
  toggleLayoutMenu: () => void;
  setLayout: (layout: PaneLayoutId) => void;
  createSharedSession: () => void;
  openJoinSessionModal: () => void;
}

interface SettingsProps {
  state: SeedBibleState;
}

interface SidebarSearchResult {
  id: string;
  translationId: string;
  translationLabel: string;
  bookId: string;
  bookLabel: string;
  chapterNumber: number;
  verseNumber: number | null;
  reference: string;
  text: string;
}

function getOrCreateSearchTargetTab(state: SeedBibleState): ReaderTab {
  const selectedTab = state.app.selectedTab.value;
  if (selectedTab) {
    state.app.selectTab(selectedTab.id);
    return selectedTab;
  }

  const tab = state.tabs.addTab();
  state.panes.setSelectedPaneTab(tab.id);
  return tab;
}

function getUserDisplayName(user: ConnectedSessionUser): string {
  return (
    user.profile?.name ??
    `User ${(user.userId ?? user.connectionId).slice(0, 8)}`
  );
}

function getUserImageUrl(profile: UserProfile | null): string | null {
  return profile?.pictureUrl ?? null;
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

export function TabsHeader(props: TabsHeaderProps) {
  const {
    state,
    effectivelyCollapsed,
    panelsEnabled,
    paneLayout,
    isLayoutMenuOpen,
    toggleLayoutMenu,
    setLayout,
    createSharedSession,
    openJoinSessionModal,
  } = props;
  const { sidebar } = state;

  return (
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

      <div className="sb-sidebar-top-actions">
        {panelsEnabled && (
          <div className="sb-pane-layout-anchor">
            <button
              onClick={toggleLayoutMenu}
              className="sb-sidebar-top-icon-button"
              aria-label="Select pane layout"
              title="Pane layout"
            >
              <span className="material-symbols-outlined">dashboard</span>
            </button>

            {isLayoutMenuOpen && (
              <div className="sb-pane-layout-menu">
                <div className="sb-pane-layout-menu-title">Panels</div>
                <div className="sb-pane-layout-options">
                  {PANE_LAYOUT_OPTIONS.map((layout) => (
                    <button
                      key={layout.id}
                      onClick={() => setLayout(layout.id)}
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
        )}

        <ContextMenuWithButton
          onClick={() => {
            closeContextMenus();
          }}
          buttonClassName="sb-sidebar-top-icon-button"
          aria-label="Session options"
          title="Session options"
        >
          <ContextMenuItem
            onClick={() => {
              createSharedSession();
            }}
          >
            New shared session
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              openJoinSessionModal();
            }}
          >
            Join shared session
          </ContextMenuItem>
        </ContextMenuWithButton>
      </div>

      <button
        onClick={sidebar.closeSidebar}
        className="sb-sidebar-close-button"
        aria-label="Close sidebar"
        title="Close sidebar"
      >
        <span className="material-symbols-outlined">close</span>
      </button>
    </div>
  );
}

export function Settings(props: SettingsProps) {
  const { state } = props;
  const { sidebar } = state;
  const { t } = useI18n();

  return (
    <div className="sb-sidebar-settings-view">
      <div className="sb-sidebar-tabs-header">
        <h3 className="sb-sidebar-tabs-title">{t("settings")}</h3>
        <button
          onClick={sidebar.closeSettings}
          className="sb-sidebar-settings-close-button"
          aria-label={t("close-settings", { defaultValue: "Close Settings" })}
          title={t("close-settings", { defaultValue: "Close Settings" })}
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="sb-sidebar-settings-content">
        <SettingsPage state={state} />
      </div>
    </div>
  );
}

export function Tabs(props: TabsProps) {
  const { state, closeLayoutMenu } = props;
  const { app, tabs: tabsManager } = state;
  const tabs = tabsManager.tabs.value;
  const selectedTabId = tabsManager.selectedTabId.value;
  const panelsEnabled = app.panelsEnabled.value;
  const { t } = useI18n();
  const searchQuery = useSignal("");
  const searchResults = useSignal<SidebarSearchResult[]>([]);
  const searchLoading = useSignal(false);
  const searchError = useSignal<string | null>(null);
  const isSearchPanelOpen = useSignal(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const latestSearchRequestRef = useRef(0);
  const searchDebounceTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (searchContainerRef.current?.contains(target)) {
        return;
      }

      isSearchPanelOpen.value = false;
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (searchDebounceTimeoutRef.current !== null) {
        window.clearTimeout(searchDebounceTimeoutRef.current);
      }
    };
  }, []);

  const runSearch = (nextQuery: string) => {
    searchQuery.value = nextQuery;

    if (searchDebounceTimeoutRef.current !== null) {
      window.clearTimeout(searchDebounceTimeoutRef.current);
      searchDebounceTimeoutRef.current = null;
    }

    const query = nextQuery.trim();
    const requestId = ++latestSearchRequestRef.current;

    if (!query) {
      searchResults.value = [];
      searchLoading.value = false;
      searchError.value = null;
      isSearchPanelOpen.value = false;
      return;
    }

    searchLoading.value = true;
    searchError.value = null;
    isSearchPanelOpen.value = true;

    searchDebounceTimeoutRef.current = window.setTimeout(() => {
      state.search
        .search("verses", query)
        .then((response) => {
          if (latestSearchRequestRef.current !== requestId) {
            return;
          }

          searchResults.value = (response.hits ?? []).map((hit) => ({
            id: hit.document.id,
            translationId: hit.document.translation,
            translationLabel: hit.document.translation,
            bookId: hit.document.book,
            bookLabel: hit.document.book,
            chapterNumber: hit.document.chapter,
            verseNumber: hit.document.verse,
            reference: hit.document.reference,
            text: hit.document.text,
          }));
          searchLoading.value = false;
        })
        .catch((error: unknown) => {
          if (latestSearchRequestRef.current !== requestId) {
            return;
          }

          searchResults.value = [];
          searchLoading.value = false;
          searchError.value =
            error instanceof Error ? error.message : "Unable to search verses.";
        });
    }, 180);
  };

  const openSearchResult = async (result: SidebarSearchResult) => {
    closeContextMenus();
    closeLayoutMenu();
    isSearchPanelOpen.value = false;

    const targetTab = getOrCreateSearchTargetTab(state);
    await targetTab.readingState.selectTranslationAndChapter(
      result.translationId,
      result.bookId,
      result.chapterNumber
    );
  };

  return (
    <>
      <div className="sb-sidebar-tabs-header">
        <h3 className="sb-sidebar-tabs-title">
          {t("tabs", { defaultValue: "Tabs" })}
        </h3>
        <button
          onClick={() => {
            app.addTab();
          }}
          className="sb-tab-add-button"
          aria-label={t("create-new-tab", { defaultValue: "Create new tab" })}
          title={t("new-tab", { defaultValue: "New tab" })}
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>

      <div className="sb-sidebar-search-shell" ref={searchContainerRef}>
        <label className="sb-sidebar-search-bar">
          <span className="material-symbols-outlined sb-sidebar-search-icon">
            search
          </span>
          <input
            value={searchQuery.value}
            onInput={(event) => {
              runSearch((event.currentTarget as HTMLInputElement).value);
            }}
            onFocus={() => {
              if (searchQuery.value.trim()) {
                isSearchPanelOpen.value = true;
              }
            }}
            className="sb-sidebar-search-input"
            placeholder="Search verses"
            aria-label="Search verses"
          />
          {searchQuery.value.trim().length > 0 && (
            <button
              onClick={() => {
                runSearch("");
              }}
              className="sb-sidebar-search-clear-button"
              aria-label="Clear search"
              title="Clear search"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </label>

        {isSearchPanelOpen.value && searchQuery.value.trim().length > 0 && (
          <div className="sb-sidebar-search-panel">
            {searchLoading.value && (
              <div className="sb-sidebar-search-status">Searching...</div>
            )}

            {!searchLoading.value && searchError.value && (
              <div className="sb-sidebar-search-status sb-sidebar-search-status-error">
                {searchError.value}
              </div>
            )}

            {!searchLoading.value &&
              !searchError.value &&
              searchResults.value.length === 0 && (
                <div className="sb-sidebar-search-status">
                  No matching verses.
                </div>
              )}

            {!searchLoading.value &&
              !searchError.value &&
              searchResults.value.length > 0 && (
                <div className="sb-sidebar-search-results-list">
                  {searchResults.value.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => {
                        void openSearchResult(result);
                      }}
                      className="sb-sidebar-search-result-button"
                    >
                      <div className="sb-sidebar-search-result-reference">
                        {result.reference}
                      </div>
                      <div className="sb-sidebar-search-result-meta">
                        <span>{result.translationLabel}</span>
                        {result.verseNumber !== null && (
                          <span>{`${result.bookLabel} ${result.chapterNumber}:${result.verseNumber}`}</span>
                        )}
                      </div>
                      <div className="sb-sidebar-search-result-text">
                        {result.text || "Open chapter"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
          </div>
        )}
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
          const title = tab.sharedSession
            ? t("shared-tab_title", {
                book: currentBookName,
                defaultValue: "Shared",
              })
            : currentBookName;
          const connectedUsers = tab.sharedSession?.connectedUsers.value ?? [];

          return (
            <div
              key={tab.id}
              className={`sb-tab-row${isSelected ? " sb-tab-row-selected" : ""}`}
              dir={tab.readingState.translation.value?.textDirection ?? "auto"}
            >
              <button
                onClick={() => {
                  closeContextMenus();
                  closeLayoutMenu();
                  app.selectTab(tab.id);
                }}
                className={`sb-tab-button`}
              >
                <div className="sb-tab-main-content">
                  <span>{`${title} - ${currentChapter} • ${currentTranslation}`}</span>
                </div>

                {tab.sharedSession && connectedUsers.length > 0 && (
                  <div className="sb-tab-users-section">
                    <div className="sb-tab-users-list">
                      {connectedUsers.map((user) => {
                        const imageUrl = getUserImageUrl(user.profile);
                        const displayName = getUserDisplayName(user);
                        const style = imageUrl
                          ? {
                              borderColor: user.color,
                              backgroundImage: `url(${imageUrl})`,
                            }
                          : {
                              borderColor: user.color,
                              backgroundColor: user.color,
                            };

                        return (
                          <span
                            key={user.connectionId}
                            className={`sb-tab-user-icon${
                              imageUrl ? " sb-tab-user-icon-has-image" : ""
                            }${user.isSelf ? " sb-tab-user-icon-self" : ""}`}
                            title={displayName}
                            style={style}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </button>

              <ContextMenuWithButton
                onClick={() => {
                  closeLayoutMenu();
                }}
                anchorClassName="sb-tab-menu-anchor"
                buttonClassName="sb-tab-menu-button"
                menuClassName="sb-tab-menu"
                iconClassName="sb-tab-more-icon"
                aria-label={t("open-tab-menu", {
                  defaultValue: "Open tab menu",
                })}
                title={t("tab-options", { defaultValue: "Tab options" })}
              >
                {tab.sharedSession && (
                  <ContextMenuItem
                    className="sb-tab-menu-item"
                    title={t("session-id", {
                      sessionId: tab.sharedSession.id,
                      defaultValue: `Session ID: ${tab.sharedSession.id}`,
                    })}
                    onClick={() => {
                      if (tab.sharedSession) {
                        os.setClipboard(tab.sharedSession.id);
                      }
                    }}
                  >
                    {t("session-id_x", {
                      sessionId: tab.sharedSession.id,
                      defaultValue: `Session ID: ${tab.sharedSession.id}`,
                    })}
                  </ContextMenuItem>
                )}
                <ContextMenuItem
                  className="sb-tab-menu-item"
                  onClick={() => {
                    state.tabs.removeTab(tab.id);
                  }}
                >
                  {t("close", { defaultValue: "Close" })}
                </ContextMenuItem>
                {panelsEnabled && (
                  <>
                    <ContextMenuItem
                      onClick={() => {
                        app.openInNewPane(tab.id);
                      }}
                      className="sb-tab-menu-item"
                    >
                      Open in new pane
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => {
                        app.openInDetachedPane(tab.id);
                      }}
                      className="sb-tab-menu-item"
                    >
                      Open in detached pane
                    </ContextMenuItem>
                  </>
                )}
              </ContextMenuWithButton>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function Sidebar(props: SidebarProps) {
  const { state } = props;
  const { app, panes, sidebar } = state;
  const paneLayout = app.panelsEnabled.value ? panes.layout.value : "single";
  const panelsEnabled = app.panelsEnabled.value;
  const isSettingsOpen = sidebar.isSettingsOpen.value;
  const isCollapsed = sidebar.isSidebarCollapsed.value;
  const isMobileOpen = sidebar.isMobileOpen.value;
  const effectivelyCollapsed = isCollapsed && !isMobileOpen;
  const shouldShowSidebarContent = !effectivelyCollapsed || isSettingsOpen;
  const isLayoutMenuOpen = useSignal(false);
  const joinSessionId = useSignal("");

  const openJoinSessionModal = () => {
    closeContextMenus();
    isLayoutMenuOpen.value = false;
    state.modals.openModal({
      id: "join-shared-session",
      title: {
        key: "join-shared-session",
        defaultValue: "Join Shared Session",
      },
      content: ({ t }) => (
        <>
          <label>
            <span>{t("session-id", { defaultValue: "Session ID" })}</span>
            <input
              value={joinSessionId.value}
              onInput={(event) => {
                joinSessionId.value = (
                  event.currentTarget as HTMLInputElement
                ).value;
              }}
              placeholder="Enter shared session ID"
            />
          </label>
          <div>
            <button
              onClick={() => {
                state.modals.closeModal("join-shared-session");
              }}
            >
              {t("cancel", { defaultValue: "Cancel" })}
            </button>
            <button
              onClick={() => {
                void handleJoinSharedSession();
              }}
              disabled={!joinSessionId.value.trim()}
            >
              {t("join-session", { defaultValue: "Join Session" })}
            </button>
          </div>
        </>
      ),
    });
  };

  const closeJoinSessionModal = () => {
    state.modals.closeModal("join-shared-session");
    joinSessionId.value = "";
  };

  const handleJoinSharedSession = async () => {
    const sessionId = joinSessionId.value.trim();
    if (!sessionId) {
      return;
    }

    await state.app.joinSharedSession(sessionId);
    closeJoinSessionModal();
  };

  const closeLayoutMenu = () => {
    isLayoutMenuOpen.value = false;
  };

  const { t } = useI18n();

  return (
    <aside
      className={`sb-tabs-sidebar${effectivelyCollapsed ? " sb-tabs-sidebar-collapsed" : ""}${isMobileOpen ? " sb-tabs-sidebar-mobile-open" : ""}`}
    >
      {!isSettingsOpen && (
        <TabsHeader
          state={state}
          effectivelyCollapsed={effectivelyCollapsed}
          panelsEnabled={panelsEnabled}
          paneLayout={paneLayout}
          isLayoutMenuOpen={isLayoutMenuOpen.value}
          toggleLayoutMenu={() => {
            closeContextMenus();
            isLayoutMenuOpen.value = !isLayoutMenuOpen.value;
          }}
          setLayout={(layout) => {
            panes.setLayout(layout);
            closeLayoutMenu();
          }}
          createSharedSession={() => {
            void state.app.createSharedSession();
          }}
          openJoinSessionModal={openJoinSessionModal}
        />
      )}

      {shouldShowSidebarContent &&
        (isSettingsOpen ? (
          <Settings state={state} />
        ) : (
          <Tabs state={state} closeLayoutMenu={closeLayoutMenu} />
        ))}

      <button
        onClick={sidebar.openSettings}
        className={`sb-sidebar-icon-button${
          isSettingsOpen ? " sb-sidebar-icon-button-selected" : ""
        }`}
        aria-label={t("open-settings", { defaultValue: "Open settings" })}
        title={t("settings", { defaultValue: "Settings" })}
      >
        <MobileSettingsIcon />
      </button>
    </aside>
  );
}
