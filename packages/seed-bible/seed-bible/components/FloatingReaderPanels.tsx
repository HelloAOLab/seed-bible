import { useSignal } from "@preact/signals";
import { useI18n } from "seed-bible.i18n.I18nManager";
import { closeContextMenus } from "seed-bible.components.ContextMenu";
import {
  DEFAULT_TRANSLATION_ID,
  DEFAULT_TRANSLATION_LANGUAGE,
} from "seed-bible.managers.BibleReadingManager";
import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";
import type { ReaderTab } from "seed-bible.managers.TabsManager";

interface SearchResult {
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

const { useEffect, useRef } = os.appHooks;

interface FloatingReaderPanelsProps {
  state: SeedBibleState;
}

/**
 * Floating panels anchored above the reader toolbar. Replaces the
 * sidebar-mounted search and introduces a placeholder Chat surface. Only
 * one of the two can be open at a time — opening one closes the other
 * (handled by SidebarManager).
 */
export function FloatingReaderPanels(props: FloatingReaderPanelsProps) {
  const { state } = props;
  return (
    <>
      <FloatingSearchPanel state={state} />
      <FloatingChatPanel state={state} />
    </>
  );
}

function FloatingSearchPanel(props: FloatingReaderPanelsProps) {
  const { state } = props;
  const { sidebar } = state;
  const { t } = useI18n();
  const isOpen = sidebar.isSearchPanelOpen.value;

  const searchQuery = useSignal("");
  const searchResults = useSignal<SearchResult[]>([]);
  const searchLoading = useSignal(false);
  const searchError = useSignal<string | null>(null);
  const highlightedResultIndex = useSignal(-1);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const latestRequestRef = useRef(0);
  const debounceTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current !== null) {
        window.clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      const id = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
      return () => window.clearTimeout(id);
    }
    if (debounceTimeoutRef.current !== null) {
      window.clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    latestRequestRef.current++;
    searchQuery.value = "";
    searchResults.value = [];
    searchLoading.value = false;
    searchError.value = null;
    highlightedResultIndex.value = -1;
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(".sb-floating-search-panel")) return;
      if (target.closest(".sb-reader-toolbar")) return;
      sidebar.closeSearchPanel();
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (highlightedResultIndex.value < 0) return;
    resultRefs.current[highlightedResultIndex.value]?.scrollIntoView({
      block: "nearest",
    });
  }, [highlightedResultIndex.value]);

  const runSearch = (nextQuery: string) => {
    searchQuery.value = nextQuery;

    if (debounceTimeoutRef.current !== null) {
      window.clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    const query = nextQuery.trim();
    const activeTranslationId =
      state.app.currentReadingState.value?.translationId ??
      DEFAULT_TRANSLATION_ID;
    const activeLanguage =
      state.app.currentReadingState.value?.tab.readingState.translation.value
        ?.language ?? DEFAULT_TRANSLATION_LANGUAGE;
    const requestId = ++latestRequestRef.current;

    if (!query) {
      searchResults.value = [];
      searchLoading.value = false;
      searchError.value = null;
      highlightedResultIndex.value = -1;
      return;
    }

    searchLoading.value = true;
    searchError.value = null;
    highlightedResultIndex.value = -1;

    debounceTimeoutRef.current = window.setTimeout(() => {
      state.search
        .searchVerses(activeLanguage, activeTranslationId, query)
        .then((response) => {
          if (latestRequestRef.current !== requestId) return;
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
          highlightedResultIndex.value = -1;
          searchLoading.value = false;
        })
        .catch((error: unknown) => {
          if (latestRequestRef.current !== requestId) return;
          searchResults.value = [];
          searchLoading.value = false;
          highlightedResultIndex.value = -1;
          searchError.value =
            error instanceof Error ? error.message : "Unable to search verses.";
        });
    }, 180);
  };

  const navigateTabToResult = async (
    targetTab: ReaderTab,
    result: SearchResult
  ) => {
    await targetTab.readingState.selectTranslationAndChapter(
      result.translationId,
      result.bookId,
      result.chapterNumber,
      {
        scrollToVerse: result.verseNumber ?? undefined,
      }
    );
    if (result.verseNumber) {
      targetTab.readingState.decorateVerses(
        result.bookId,
        result.chapterNumber,
        result.verseNumber,
        {
          className: "sb-verse-decoration-search-result",
          removeAfterMs: 3000,
        }
      );
    }
  };

  const openSearchResult = async (result: SearchResult) => {
    closeContextMenus();
    sidebar.closeSearchPanel();

    const targetTab = getOrCreateSearchTargetTab(state);
    await navigateTabToResult(targetTab, result);
  };

  const openSearchResultInNewTab = async (result: SearchResult) => {
    closeContextMenus();
    sidebar.closeSearchPanel();

    const targetTab = state.tabs.addTab(undefined, {
      initialTranslationId: result.translationId,
      initialBookId: result.bookId,
      initialChapterNumber: result.chapterNumber,
    });
    state.panes.setSelectedPaneTab(targetTab.id);
    await navigateTabToResult(targetTab, result);
  };

  const moveHighlightedResult = (direction: 1 | -1) => {
    if (searchResults.value.length === 0) return;
    const nextIndex = highlightedResultIndex.value + direction;
    if (nextIndex < 0) {
      highlightedResultIndex.value = searchResults.value.length - 1;
      return;
    }
    if (nextIndex >= searchResults.value.length) {
      highlightedResultIndex.value = 0;
      return;
    }
    highlightedResultIndex.value = nextIndex;
  };

  const handleInputKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveHighlightedResult(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveHighlightedResult(-1);
      return;
    }
    if (event.key === "Enter") {
      const highlighted =
        searchResults.value[highlightedResultIndex.value] ?? null;
      if (!highlighted) return;
      event.preventDefault();
      void openSearchResult(highlighted);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      sidebar.closeSearchPanel();
    }
  };

  if (!isOpen) return null;

  const hasQuery = searchQuery.value.trim().length > 0;
  const showResultsArea =
    hasQuery &&
    (searchLoading.value ||
      searchError.value !== null ||
      searchResults.value.length > 0 ||
      (!searchLoading.value && searchResults.value.length === 0));

  return (
    <div
      className={`sb-floating-search-panel${
        showResultsArea ? " sb-floating-search-panel-expanded" : ""
      }`}
      role="dialog"
      aria-label={t("search", { defaultValue: "Search" })}
    >
      {showResultsArea && (
        <div className="sb-floating-search-results" role="listbox">
          {searchLoading.value && (
            <div className="sb-floating-search-status">
              {t("searching", { defaultValue: "Searching..." })}
            </div>
          )}

          {!searchLoading.value && searchError.value && (
            <div className="sb-floating-search-status sb-floating-search-status-error">
              {searchError.value}
            </div>
          )}

          {!searchLoading.value &&
            !searchError.value &&
            searchResults.value.length === 0 && (
              <div className="sb-floating-search-status">
                {t("no-search-results", {
                  defaultValue: "No matching verses.",
                })}
              </div>
            )}

          {!searchLoading.value &&
            !searchError.value &&
            searchResults.value.length > 0 && (
              <div className="sb-floating-search-results-list">
                {searchResults.value.map((result, index) => (
                  <button
                    key={result.id}
                    ref={(element) => {
                      resultRefs.current[index] = element;
                    }}
                    type="button"
                    onClick={() => {
                      void openSearchResult(result);
                    }}
                    onMouseEnter={() => {
                      highlightedResultIndex.value = index;
                    }}
                    className={`sb-floating-search-result${
                      highlightedResultIndex.value === index
                        ? " sb-floating-search-result-highlighted"
                        : ""
                    }`}
                    role="option"
                    aria-selected={highlightedResultIndex.value === index}
                  >
                    <header className="sb-floating-search-result-header">
                      <span className="sb-floating-search-result-ref">
                        {result.reference}
                      </span>
                      <span
                        className="sb-floating-search-result-sep"
                        aria-hidden="true"
                      >
                        •
                      </span>
                      <span className="sb-floating-search-result-translation">
                        {result.translationLabel}
                      </span>
                      <span
                        className="sb-floating-search-result-action"
                        role="button"
                        tabIndex={0}
                        aria-label={t("add-verse", {
                          defaultValue: "Add verse",
                        })}
                        title={t("add", { defaultValue: "Add" })}
                        onClick={(event: MouseEvent) => {
                          event.stopPropagation();
                          void openSearchResultInNewTab(result);
                        }}
                        onKeyDown={(event: KeyboardEvent) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            void openSearchResultInNewTab(result);
                          }
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          aria-hidden="true"
                        >
                          open_in_new
                        </span>
                      </span>
                    </header>
                    <p className="sb-floating-search-result-text">
                      {result.text ||
                        t("open-chapter", { defaultValue: "Open chapter" })}
                    </p>
                  </button>
                ))}
              </div>
            )}
        </div>
      )}

      <div className="sb-floating-search-input-wrap">
        <span
          className="material-symbols-outlined sb-floating-search-icon"
          aria-hidden="true"
        >
          search
        </span>
        <input
          ref={inputRef}
          type="text"
          className="sb-floating-search-input"
          placeholder={t("search-verses", { defaultValue: "Search verses" })}
          value={searchQuery.value}
          onInput={(event) => {
            runSearch((event.currentTarget as HTMLInputElement).value);
          }}
          onKeyDown={(event) => {
            handleInputKeyDown(event);
          }}
        />
        {hasQuery && (
          <button
            type="button"
            className="sb-floating-search-clear"
            onClick={() => {
              runSearch("");
              inputRef.current?.focus();
            }}
            aria-label={t("clear-search", { defaultValue: "Clear search" })}
            title={t("clear-search", { defaultValue: "Clear search" })}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </div>
    </div>
  );
}

function FloatingChatPanel(props: FloatingReaderPanelsProps) {
  const { state } = props;
  const { sidebar } = state;
  const { t } = useI18n();
  const isOpen = sidebar.isChatPanelOpen.value;

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(".sb-floating-chat-panel")) return;
      if (target.closest(".sb-reader-toolbar")) return;
      sidebar.closeChatPanel();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        sidebar.closeChatPanel();
      }
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="sb-floating-chat-panel"
      role="dialog"
      aria-label={t("chat", { defaultValue: "Chat" })}
    >
      <div className="sb-floating-chat-empty">
        <span
          className="material-symbols-outlined sb-floating-chat-empty-icon"
          aria-hidden="true"
        >
          chat_bubble_outline
        </span>
        <p className="sb-floating-chat-empty-title">
          {t("chat-empty-title", { defaultValue: "Chat is coming soon" })}
        </p>
        <p className="sb-floating-chat-empty-body">
          {t("chat-empty-body", {
            defaultValue:
              "This is where you'll be able to ask questions and explore cross-references.",
          })}
        </p>
      </div>
    </div>
  );
}
