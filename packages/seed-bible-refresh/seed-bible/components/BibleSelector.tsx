import type {
  AvailableTranslations,
  TranslationBooks,
} from "seed-bible.managers.FreeUseBibleAPI";
import {
  useEffect,
  useMemo,
  useRef,
} from "https://esm.sh/preact@10.28.4/hooks";
import { useSignal } from "https://esm.sh/@preact/signals?deps=preact@10.28.4";

// const { useEffect, useMemo, useState } = os.appHooks;

interface BibleSelectorProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  translationId: string | null;
  bookId: string | null;
  chapterNumber: number;
  availableTranslations: AvailableTranslations | null;
  translationBooks: TranslationBooks | null;
  loading: boolean;
  onSelectTranslation: (translation: string) => void;
  onSelectChapter: (book: string, chapter: number) => void;
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
  const {
    isOpen,
    onOpen,
    onClose,
    translationId,
    bookId,
    chapterNumber,
    availableTranslations,
    translationBooks,
    loading,
    onSelectTranslation,
    onSelectChapter,
  } = props;

  const search = useSignal("");
  const expandedBookId = useSignal<string | null>(bookId);
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
      expandedBookId.value = bookId;
    }
  }, [bookId, isOpen]);

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
    () => groupBooks(translationBooks, search.value),
    [translationBooks, search.value]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div onClick={onClose} className="sb-selector-overlay">
      <div
        onClick={(event: Event) => {
          event.stopPropagation();
        }}
        className="sb-selector-panel"
      >
        <div className="sb-selector-header">
          <strong className="sb-selector-title">Select Bible Book</strong>
          <button onClick={onClose} className="sb-selector-close-button">
            Close
          </button>
        </div>

        <div className="sb-selector-controls">
          <select
            value={translationId ?? ""}
            disabled={loading || !availableTranslations}
            onChange={(event: Event) => {
              const target = event.currentTarget as HTMLSelectElement;
              onSelectTranslation(target.value);
            }}
            className="sb-selector-translation-select"
          >
            {(availableTranslations?.translations ?? []).map((translation) => (
              <option key={translation.id} value={translation.id}>
                {translation.id}
              </option>
            ))}
          </select>

          <input
            value={search.value}
            onChange={(event: Event) => {
              const target = event.currentTarget as HTMLInputElement;
              search.value = target.value;
            }}
            placeholder="Search book..."
            className="sb-selector-search-input"
          />

          <div className="sb-selector-all-books">All books</div>
        </div>

        <div className="sb-selector-grid">
          <div className="sb-selector-column sb-selector-column-divider">
            <h4 className="sb-selector-section-title">Old Testament</h4>
            <div className="sb-selector-books-grid">
              {oldTestament.map((book) => (
                <div key={book.id}>
                  <button
                    onClick={() => {
                      expandedBookId.value =
                        expandedBookId.value === book.id ? null : book.id;
                    }}
                    disabled={loading}
                    className={`sb-selector-book-button${
                      book.id === bookId
                        ? " sb-selector-book-button-current"
                        : ""
                    }`}
                  >
                    {book.name}
                  </button>

                  {expandedBookId.value === book.id && (
                    <div className="sb-selector-chapter-grid">
                      {Array.from(
                        { length: book.numberOfChapters },
                        (_, index) => {
                          const chapter = book.firstChapterNumber + index;
                          const isCurrentBookChapter =
                            book.id === bookId && chapter === chapterNumber;
                          return (
                            <button
                              key={`${book.id}-${chapter}`}
                              onClick={() => onSelectChapter(book.id, chapter)}
                              disabled={loading}
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
              ))}
            </div>
          </div>

          <div className="sb-selector-column">
            <h4 className="sb-selector-section-title">New Testament</h4>
            <div className="sb-selector-books-grid">
              {newTestament.map((book) => (
                <div key={book.id}>
                  <button
                    onClick={() => {
                      expandedBookId.value =
                        expandedBookId.value === book.id ? null : book.id;
                    }}
                    disabled={loading}
                    className={`sb-selector-book-button${
                      book.id === bookId
                        ? " sb-selector-book-button-current"
                        : ""
                    }`}
                  >
                    {book.name}
                  </button>

                  {expandedBookId.value === book.id && (
                    <div className="sb-selector-chapter-grid">
                      {Array.from(
                        { length: book.numberOfChapters },
                        (_, index) => {
                          const chapter = book.firstChapterNumber + index;
                          const isCurrentBookChapter =
                            book.id === bookId && chapter === chapterNumber;
                          return (
                            <button
                              key={`${book.id}-${chapter}`}
                              onClick={() => onSelectChapter(book.id, chapter)}
                              disabled={loading}
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
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
