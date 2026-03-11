import type { TranslationBooks } from "seed-bible.managers.FreeUseBibleAPI";
import type { BibleReadingState } from "seed-bible.managers.BibleReadingManager";
import { useSignal } from "@preact/signals";
import { useI18n } from "seed-bible.i18n.I18nManager";
import { chunk } from "es-toolkit";
import { MaterialIcon } from "seed-bible.components.icons";

const { useEffect, useMemo, useRef } = os.appHooks;

// const { useEffect, useMemo, useState } = os.appHooks;

interface BibleSelectorProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  readingState: BibleReadingState;
}

function groupBooks(translationBooks: TranslationBooks | null, search: string) {
  if (!translationBooks) {
    return {
      oldTestament: [] as TranslationBooks["books"],
      newTestament: [] as TranslationBooks["books"],
    };
  }

  const loweredSearch = search.trim().toLowerCase();
  const filteredBooks = loweredSearch
    ? translationBooks.books.filter(
        (book) =>
          book.name.toLowerCase().includes(loweredSearch) ||
          book.commonName.toLowerCase().includes(loweredSearch)
      )
    : translationBooks.books;

  return {
    oldTestament: filteredBooks.filter((book) => book.order <= 39),
    newTestament: filteredBooks.filter((book) => book.order > 39),
  };
}

export function BibleSelector(props: BibleSelectorProps) {
  const { isOpen, onOpen, onClose, readingState } = props;
  const {
    translationId,
    bookId,
    chapterNumber,
    availableTranslations,
    translationBooks,
    loading,
    selectTranslation,
    selectChapter,
  } = readingState;

  const { t } = useI18n();

  const search = useSignal("");
  const expandedBookId = useSignal<string | null>(bookId.value);
  const viewportWidth = useSignal(
    typeof window === "undefined" ? 0 : window.innerWidth
  );
  const wasOpenRef = useRef(isOpen);
  const isHandlingPopStateRef = useRef(false);

  const getHistoryState = () => {
    return history.state && typeof history.state === "object"
      ? (history.state as Record<string, unknown>)
      : {};
  };

  const isSelectorOpenInHistory = () => {
    const state = getHistoryState();
    return state.bibleSelectorOpen === true;
  };

  useEffect(() => {
    if (isOpen) {
      expandedBookId.value = bookId.value;
    }
  }, [bookId.value, isOpen]);

  useEffect(() => {
    const onResize = () => {
      viewportWidth.value = window.innerWidth;
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const shouldBeOpen = isSelectorOpenInHistory();
      isHandlingPopStateRef.current = true;

      if (shouldBeOpen && !isOpen) {
        onOpen();
      } else if (!shouldBeOpen && isOpen) {
        onClose();
      }

      setTimeout(() => {
        isHandlingPopStateRef.current = false;
      }, 0);
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [isOpen, onClose, onOpen]);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;

    if (!wasOpen && isOpen && !isSelectorOpenInHistory()) {
      history.pushState({ ...getHistoryState(), bibleSelectorOpen: true }, "");
    }

    if (wasOpen && !isOpen) {
      const shouldNavigateBack =
        !isHandlingPopStateRef.current && isSelectorOpenInHistory();
      if (shouldNavigateBack) {
        history.back();
      }
    }

    wasOpenRef.current = isOpen;
  }, [isOpen]);

  const { oldTestament, newTestament } = useMemo(
    () => groupBooks(translationBooks.value, search.value),
    [translationBooks.value, search.value]
  );

  const { oldTestamentBooksPerRow, newTestamentBooksPerRow } = useMemo(() => {
    if (viewportWidth.value > 1200) {
      return {
        oldTestamentBooksPerRow: 3,
        newTestamentBooksPerRow: 2,
      };
    }

    if (viewportWidth.value > 768) {
      return {
        oldTestamentBooksPerRow: 2,
        newTestamentBooksPerRow: 1,
      };
    }

    return {
      oldTestamentBooksPerRow: 1,
      newTestamentBooksPerRow: 1,
    };
  }, [viewportWidth.value]);

  const oldTestamentRows = useMemo(
    () => chunk(oldTestament, oldTestamentBooksPerRow),
    [oldTestament, oldTestamentBooksPerRow]
  );
  const newTestamentRows = useMemo(
    () => chunk(newTestament, newTestamentBooksPerRow),
    [newTestament, newTestamentBooksPerRow]
  );

  return (
    <div
      onClick={onClose}
      className={`sb-selector-overlay ${isOpen ? "open" : ""}`}
    >
      <div
        onClick={(event: Event) => {
          event.stopPropagation();
        }}
        className="sb-selector-panel"
      >
        <div className="sb-selector-controls">
          <select
            value={translationId.value ?? ""}
            disabled={loading.value || !availableTranslations.value}
            onChange={(event: Event) => {
              const target = event.currentTarget as HTMLSelectElement;
              void selectTranslation(target.value);
            }}
            className="sb-selector-translation-select"
          >
            {(availableTranslations.value?.translations ?? []).map(
              (translation) => (
                <option key={translation.id} value={translation.id}>
                  {translation.id}
                </option>
              )
            )}
          </select>

          <input
            value={search.value}
            onChange={(event: Event) => {
              const target = event.currentTarget as HTMLInputElement;
              search.value = target.value;
            }}
            placeholder={t("searchBook", {
              defaultValue: "Search book...",
            })}
            className="sb-selector-search-input"
          />

          <div className="sb-selector-all-books">
            {t("allBooks", { defaultValue: "All books" })}
          </div>
        </div>

        <div className="sb-selector-grid">
          <div className="sb-selector-column sb-selector-column-divider">
            <h4 className="sb-selector-section-title">
              {t("oldTestament", { defaultValue: "Old Testament" })}
            </h4>
            <div className="sb-selector-books-grid">
              {oldTestamentRows.map((row, rowIndex) => {
                const expandedBookInRow =
                  row.find((book) => book.id === expandedBookId.value) ?? null;
                return (
                  <div
                    key={`old-row-${rowIndex}`}
                    className="sb-selector-books-row-group"
                  >
                    <div
                      className="sb-selector-books-row"
                      style={{
                        gridTemplateColumns: `repeat(${Math.max(
                          row.length,
                          1
                        )}, minmax(0, 1fr))`,
                      }}
                    >
                      {row.map((book) => (
                        <div key={book.id}>
                          <button
                            onClick={() => {
                              expandedBookId.value =
                                expandedBookId.value === book.id
                                  ? null
                                  : book.id;
                            }}
                            disabled={loading.value}
                            className={`sb-selector-book-button${
                              book.id === bookId.value
                                ? " sb-selector-book-button-current"
                                : ""
                            }${expandedBookId.value === book.id ? " expanded" : ""}`}
                          >
                            <span className="sb-selector-book-button-name">
                              {book.name}
                            </span>
                            <MaterialIcon>expand_more</MaterialIcon>
                          </button>
                        </div>
                      ))}
                    </div>

                    {expandedBookInRow && (
                      <div className="sb-selector-chapter-grid sb-selector-chapter-grid-inline">
                        {Array.from(
                          { length: expandedBookInRow.numberOfChapters },
                          (_, index) => {
                            const chapter =
                              expandedBookInRow.firstChapterNumber + index;
                            const isCurrentBookChapter =
                              expandedBookInRow.id === bookId.value &&
                              chapter === chapterNumber.value;
                            return (
                              <button
                                key={`${expandedBookInRow.id}-${chapter}`}
                                onClick={() => {
                                  void selectChapter(
                                    expandedBookInRow.id,
                                    chapter
                                  );
                                  onClose();
                                }}
                                disabled={loading.value}
                                className={`sb-selector-chapter-button${
                                  isCurrentBookChapter
                                    ? " sb-selector-chapter-button-current"
                                    : ""
                                }`}
                              >
                                {chapter}
                              </button>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="sb-selector-column">
            <h4 className="sb-selector-section-title">
              {t("newTestament", { defaultValue: "New Testament" })}
            </h4>
            <div className="sb-selector-books-grid">
              {newTestamentRows.map((row, rowIndex) => {
                const expandedBookInRow =
                  row.find((book) => book.id === expandedBookId.value) ?? null;
                return (
                  <div
                    key={`new-row-${rowIndex}`}
                    className="sb-selector-books-row-group"
                  >
                    <div
                      className="sb-selector-books-row"
                      style={{
                        gridTemplateColumns: `repeat(${Math.max(
                          row.length,
                          1
                        )}, minmax(0, 1fr))`,
                      }}
                    >
                      {row.map((book) => (
                        <div key={book.id}>
                          <button
                            onClick={() => {
                              expandedBookId.value =
                                expandedBookId.value === book.id
                                  ? null
                                  : book.id;
                            }}
                            disabled={loading.value}
                            className={`sb-selector-book-button${
                              book.id === bookId.value
                                ? " sb-selector-book-button-current"
                                : ""
                            }${expandedBookId.value === book.id ? " expanded" : ""}`}
                          >
                            <span className="sb-selector-book-button-name">
                              {book.name}
                            </span>
                            <MaterialIcon>expand_less</MaterialIcon>
                          </button>
                        </div>
                      ))}
                    </div>

                    {expandedBookInRow && (
                      <div className="sb-selector-chapter-grid sb-selector-chapter-grid-inline">
                        {Array.from(
                          { length: expandedBookInRow.numberOfChapters },
                          (_, index) => {
                            const chapter =
                              expandedBookInRow.firstChapterNumber + index;
                            const isCurrentBookChapter =
                              expandedBookInRow.id === bookId.value &&
                              chapter === chapterNumber.value;
                            return (
                              <button
                                key={`${expandedBookInRow.id}-${chapter}`}
                                onClick={() => {
                                  void selectChapter(
                                    expandedBookInRow.id,
                                    chapter
                                  );
                                  onClose();
                                }}
                                disabled={loading.value}
                                className={`sb-selector-chapter-button${
                                  isCurrentBookChapter
                                    ? " sb-selector-chapter-button-current"
                                    : ""
                                }`}
                              >
                                {chapter}
                              </button>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
