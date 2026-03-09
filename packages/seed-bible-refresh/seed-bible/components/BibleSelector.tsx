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
import { useTheme } from "seed-bible.managers.ThemeManager";

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
  const { currentTheme } = useTheme();
  const theme = currentTheme.variables;

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
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
    >
      <div
        onClick={(event: Event) => {
          event.stopPropagation();
        }}
        style={{
          width: "min(980px, 100%)",
          maxHeight: "85vh",
          overflow: "auto",
          border: `1px solid ${theme.secondaryColor}`,
          borderRadius: "12px",
          padding: "12px",
          background: theme.bookSelectorBackground,
          color: theme.fontColor,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "10px",
          }}
        >
          <strong style={{ color: theme.bookHeadingColor }}>
            Select Bible Book
          </strong>
          <button
            onClick={onClose}
            style={{
              border: `1px solid ${theme.secondaryColor}`,
              borderRadius: "6px",
              padding: "4px 8px",
              background: theme.tertiaryColor,
              cursor: "pointer",
              color: theme.fontColor,
            }}
          >
            Close
          </button>
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
          <select
            value={translationId ?? ""}
            disabled={loading || !availableTranslations}
            onChange={(event: Event) => {
              const target = event.currentTarget as HTMLSelectElement;
              onSelectTranslation(target.value);
            }}
            style={{
              minWidth: "96px",
              border: `1px solid ${theme.secondaryColor}`,
              borderRadius: "6px",
              padding: "6px 8px",
              background: theme.tertiaryColor,
              color: theme.fontColor,
            }}
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
            style={{
              flex: 1,
              border: `1px solid ${theme.secondaryColor}`,
              borderRadius: "6px",
              padding: "6px 10px",
              background: theme.tertiaryColor,
              color: theme.fontColor,
            }}
          />

          <div
            style={{
              border: `1px solid ${theme.secondaryColor}`,
              borderRadius: "6px",
              padding: "6px 10px",
              background: theme.tertiaryColor,
              color: theme.fontColor,
              whiteSpace: "nowrap",
            }}
          >
            All books
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          <div
            style={{
              borderRight: `1px solid ${theme.secondaryColor}`,
              paddingRight: "12px",
            }}
          >
            <h4
              style={{
                marginTop: 0,
                marginBottom: "10px",
                color: theme.bookHeadingColor,
              }}
            >
              Old Testament
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "6px 10px",
              }}
            >
              {oldTestament.map((book) => (
                <div key={book.id}>
                  <button
                    onClick={() => {
                      expandedBookId.value =
                        expandedBookId.value === book.id ? null : book.id;
                    }}
                    disabled={loading}
                    style={{
                      textAlign: "left",
                      border: "none",
                      background: "transparent",
                      padding: "4px 4px",
                      color:
                        book.id === bookId
                          ? theme.bookHeadingColor
                          : theme.fontColor,
                      fontWeight: book.id === bookId ? 700 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {book.name}
                  </button>

                  {expandedBookId.value === book.id && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                        padding: "2px 4px 8px 4px",
                      }}
                    >
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
                              style={{
                                border: `1px solid ${theme.secondaryColor}`,
                                borderRadius: "5px",
                                background: isCurrentBookChapter
                                  ? theme.primaryColor
                                  : theme.tertiaryColor,
                                minWidth: "28px",
                                height: "24px",
                                cursor: "pointer",
                                color: theme.fontColor,
                              }}
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

          <div>
            <h4
              style={{
                marginTop: 0,
                marginBottom: "10px",
                color: theme.bookHeadingColor,
              }}
            >
              New Testament
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "6px 10px",
              }}
            >
              {newTestament.map((book) => (
                <div key={book.id}>
                  <button
                    onClick={() => {
                      expandedBookId.value =
                        expandedBookId.value === book.id ? null : book.id;
                    }}
                    disabled={loading}
                    style={{
                      textAlign: "left",
                      border: "none",
                      background: "transparent",
                      padding: "4px 4px",
                      color:
                        book.id === bookId
                          ? theme.bookHeadingColor
                          : theme.fontColor,
                      fontWeight: book.id === bookId ? 700 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {book.name}
                  </button>

                  {expandedBookId.value === book.id && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px",
                        padding: "2px 4px 8px 4px",
                      }}
                    >
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
                              style={{
                                border: `1px solid ${theme.secondaryColor}`,
                                borderRadius: "5px",
                                background: isCurrentBookChapter
                                  ? theme.primaryColor
                                  : theme.tertiaryColor,
                                minWidth: "28px",
                                height: "24px",
                                cursor: "pointer",
                                color: theme.fontColor,
                              }}
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
