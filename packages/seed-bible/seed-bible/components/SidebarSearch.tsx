import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import { closeContextMenus } from "seed-bible.components.ContextMenu";
import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";
import type { ReaderTab } from "seed-bible.managers.TabsManager";

export interface SidebarSearchResult {
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

interface SidebarSearchProps {
  state: SeedBibleState;
  closeLayoutMenu: () => void;
}

export function SidebarSearch(props: SidebarSearchProps) {
  const { state, closeLayoutMenu } = props;

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
  );
}
