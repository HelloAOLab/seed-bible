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

  const openSearchResult = async (result: SearchResult) => {
    closeContextMenus();
    sidebar.closeSearchPanel();

    const targetTab = getOrCreateSearchTargetTab(state);
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
                          // Placeholder action — wire up when behavior is defined.
                        }}
                        onKeyDown={(event: KeyboardEvent) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                          }
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <path
                            d="M3 14C2.73333 14 2.5 13.9 2.3 13.7C2.1 13.5 2 13.2667 2 13V3C2 2.73333 2.1 2.5 2.3 2.3C2.5 2.1 2.73333 2 3 2H13C13.2667 2 13.5 2.1 13.7 2.3C13.9 2.5 14 2.73333 14 3V8.93333C14 9.07777 13.9518 9.19443 13.8553 9.28333C13.759 9.37223 13.6396 9.41667 13.497 9.41667C13.3546 9.41667 13.2361 9.36873 13.1417 9.27283C13.0472 9.17707 13 9.05833 13 8.91667V3H3V13H8.93333C9.075 13 9.19377 13.0482 9.28967 13.1447C9.38543 13.241 9.43333 13.3604 9.43333 13.503C9.43333 13.6454 9.38543 13.7639 9.28967 13.8583C9.19377 13.9528 9.075 14 8.93333 14H3ZM12.2667 13.55V11.0333C12.2667 10.8917 12.3149 10.7729 12.4113 10.6772C12.5077 10.5813 12.6271 10.5333 12.7697 10.5333C12.9121 10.5333 13.0306 10.5813 13.125 10.6772C13.2194 10.7729 13.2667 10.8917 13.2667 11.0333V13.55L14.15 12.6833C14.25 12.5944 14.3667 12.5472 14.5 12.5417C14.6333 12.5361 14.75 12.5833 14.85 12.6833C14.95 12.7833 15 12.9 15 13.0333C15 13.1667 14.95 13.2833 14.85 13.3833L13.1167 15.1167C13.0167 15.2167 12.9 15.2667 12.7667 15.2667C12.6333 15.2667 12.5167 15.2167 12.4167 15.1167L10.6833 13.3833C10.5833 13.2833 10.5333 13.1667 10.5333 13.0333C10.5333 12.9 10.5833 12.7833 10.6833 12.6833C10.7833 12.5833 10.9 12.5361 11.0333 12.5417C11.1667 12.5472 11.2833 12.5944 11.3833 12.6833L12.2667 13.55ZM7.5 8.5V10.8333C7.5 10.975 7.54823 11.0937 7.64467 11.1895C7.741 11.2854 7.86043 11.3333 8.003 11.3333C8.14543 11.3333 8.2639 11.2854 8.35833 11.1895C8.45277 11.0937 8.5 10.975 8.5 10.8333V8.5H10.8333C10.975 8.5 11.0938 8.45177 11.1897 8.35533C11.2854 8.259 11.3333 8.13957 11.3333 7.997C11.3333 7.85457 11.2854 7.7361 11.1897 7.64167C11.0938 7.54723 10.975 7.5 10.8333 7.5H8.5V5.16667C8.5 5.025 8.45177 4.90623 8.35533 4.81033C8.259 4.71457 8.13957 4.66667 7.997 4.66667C7.85457 4.66667 7.7361 4.71457 7.64167 4.81033C7.54723 4.90623 7.5 5.025 7.5 5.16667V7.5H5.16667C5.025 7.5 4.90627 7.54823 4.8105 7.64467C4.7146 7.741 4.66667 7.86043 4.66667 8.003C4.66667 8.14543 4.7146 8.2639 4.8105 8.35833C4.90627 8.45277 5.025 8.5 5.16667 8.5H7.5Z"
                            fill="currentColor"
                          />
                        </svg>
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
