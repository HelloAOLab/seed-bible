import { type BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
import { useI18n } from "seed-bible.i18n.I18nManager";
import { MaterialIcon } from "seed-bible.components.icons";

// const { useEffect, useMemo, useState } = os.appHooks;

interface BibleSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectorState: BibleSelectorState;
  className?: string;
}

export function BibleSelector(props: BibleSelectorProps) {
  const { isOpen, onClose, selectorState, className } = props;
  const {
    selectedTranslationId,
    selectedTranslation,
    currentBookId,
    currentChapterNumber,
    availableTranslations,
    loading,
    orientation,
  } = selectorState;

  const { t } = useI18n();
  const oldTestamentLabel =
    orientation.value === "tanak"
      ? t("tanakh", { defaultValue: "Tanakh" })
      : t("old-testament", { defaultValue: "Old Testament" });
  const {
    search,
    expandedBookId,
    oldTestamentRows,
    newTestamentRows,
    setSearch,
    setExpandedBook,
    selectTranslation,
    selectChapter,
    forceNewTab,
    availablePanes,
    pane: currentPane,
    setTargetPane,
  } = selectorState;

  const panelContents = [];
  if (isOpen) {
    const showPanePicker = forceNewTab.value && availablePanes.value.length > 1;

    if (showPanePicker) {
      panelContents.push(
        <div className="sb-selector-pane-picker">
          <span className="sb-selector-pane-picker-label">
            {t("open-in-pane", { defaultValue: "Open in pane:" })}
          </span>
          <div className="sb-selector-pane-picker-options">
            {availablePanes.value.map((p, index) => {
              const tabBookId = p.tab?.readingState.bookId.value ?? null;
              const tabBookName =
                p.tab?.readingState.translationBooks.value?.books.find(
                  (book) => book.id === tabBookId
                )?.name ??
                tabBookId ??
                null;
              const subtitle = tabBookName
                ? ` · ${tabBookName}`
                : ` · ${t("empty", { defaultValue: "empty" })}`;
              const isSelected = currentPane.value?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`sb-selector-pane-chip${
                    isSelected ? " sb-selector-pane-chip-selected" : ""
                  }`}
                  onClick={() => setTargetPane(p.id)}
                >
                  {`${t("pane_number", { number: index + 1, defaultValue: "Pane {{number}}" })}${subtitle}`}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    panelContents.push(
      <div className="sb-selector-controls">
        <select
          value={selectedTranslationId.value ?? ""}
          disabled={loading.value || !availableTranslations.value}
          onChange={(event: Event) => {
            const target = event.currentTarget as HTMLSelectElement;
            selectTranslation(target.value);
          }}
          className="sb-selector-translation-select"
        >
          {availableTranslations.value.map((translation) => (
            <option key={translation.id} value={translation.id}>
              {translation.id}
            </option>
          ))}
        </select>

        <input
          value={search.value}
          onChange={(event: Event) => {
            const target = event.currentTarget as HTMLInputElement;
            setSearch(target.value);
          }}
          placeholder={t("searchBook", {
            defaultValue: "Search book...",
          })}
          className="sb-selector-search-input"
        />

        <div className="sb-selector-all-books">
          {t("allBooks", { defaultValue: "All books" })}
        </div>
      </div>,
      <div
        className="sb-selector-grid"
        dir={selectedTranslation.value?.textDirection ?? "auto"}
      >
        <div className="sb-selector-column sb-selector-column-divider">
          <h4 className="sb-selector-section-title">{oldTestamentLabel}</h4>
          <div className="sb-selector-books-grid">
            {oldTestamentRows.value.map((row, rowIndex) => {
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
                          onClick={() => setExpandedBook(book.id)}
                          disabled={loading.value}
                          className={`sb-selector-book-button${
                            book.id === currentBookId.value
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
                            expandedBookInRow.id === currentBookId.value &&
                            chapter === currentChapterNumber.value;
                          return (
                            <button
                              key={`${expandedBookInRow.id}-${chapter}`}
                              onClick={() =>
                                selectChapter(expandedBookInRow.id, chapter)
                              }
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
            {t("new-testament", { defaultValue: "New Testament" })}
          </h4>
          <div className="sb-selector-books-grid">
            {newTestamentRows.value.map((row, rowIndex) => {
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
                          onClick={() => setExpandedBook(book.id)}
                          disabled={loading.value}
                          className={`sb-selector-book-button${
                            book.id === currentBookId.value
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
                            expandedBookInRow.id === currentBookId.value &&
                            chapter === currentChapterNumber.value;
                          return (
                            <button
                              key={`${expandedBookInRow.id}-${chapter}`}
                              onClick={() =>
                                selectChapter(expandedBookInRow.id, chapter)
                              }
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
    );
  }

  return (
    <div
      onClick={onClose}
      className={`sb-selector-overlay ${isOpen ? "open" : ""}${
        className ? ` ${className}` : ""
      }`}
    >
      <div
        onClick={(event: Event) => {
          event.stopPropagation();
        }}
        className="sb-selector-panel"
      >
        {panelContents}
      </div>
    </div>
  );
}
