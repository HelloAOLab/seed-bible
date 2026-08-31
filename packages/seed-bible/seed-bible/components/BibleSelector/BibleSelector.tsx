import "./BibleSelector.inline.css";
import "./BibleSelector.css";
import {
  type BibleSelectorBookItem,
  type BibleSelectorPsalmsGroups,
  type BibleSelectorState,
} from "../../managers/BibleSelectorManager";
import { useI18n } from "../../i18n/I18nManager";
import {
  FiltersIcon,
  AddIcon,
  MinusIcon,
  ShareIcon,
  SbTabsIcon,
} from "../../components/icons";
import type { Translation } from "../../managers/FreeUseBibleAPI";
import { TranslationList } from "../TranslationList/TranslationList";
import { TranslationViewModeMenu } from "../TranslationList/TranslationViewModeMenu";
import { computed, signal } from "@preact/signals";
import { computePopover, type Rect } from "../Tutorial/Tutorial";
import type { JSX } from "preact";
import type { BibleDataManager, BookId } from "../../managers/BibleDataManager";
import {
  DEFAULT_BOOK_ID,
  DEFAULT_CHAPTER_NUMBER,
  bibleLanguageToUiLocale,
  uiLocaleForDefaultTranslation,
} from "../../managers/BibleReadingManager";
import {
  buildReadingUrl,
  parseReadingPath,
} from "../../managers/ReadingUrlPath";
import { readInjectedConfig } from "../../app/appConfig";
import {
  formatBytes,
  type OfflineTranslationsManager,
} from "../../managers/OfflineTranslationsManager";
import type { TutorialManager } from "../../managers/TutorialManager";
import { useEffect, useRef, useState, useCallback } from "preact/hooks";
import type { AppState } from "../../managers/SeedBibleStateManager";
import { MOBILE_BREAKPOINT } from "../../managers/SeedBibleStateManager";

/**
 * CSS-only spotlight: the huge translucent box-shadow dims everything around
 * the element. Clipped by the selector panel's own overflow, so it fades the
 * rest of the panel while this element stays bright. Combined with the dimmed
 * overlay behind the panel, the whole UI fades except this element. No DOM
 * measurement is involved — the selector's nodes live in a CasualOS shadow
 * root that `getBoundingClientRect`/`querySelector` can't reliably reach, so
 * the tour is driven purely by class/style toggled off the (portal-reactive)
 * tutorial signals.
 */
const SPOTLIGHT_STYLE = {
  position: "relative",
  zIndex: 2,
  borderRadius: "0.5rem",
  boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
} as const;

/**
 * The `highlight: "glow"` treatment: the page stays as it is and the target
 * wears the accent instead — a filled circle with a soft ring around it.
 */
const GLOW_STYLE = {
  position: "relative",
  zIndex: 2,
  borderRadius: "50%",
  background: "var(--sb-secondary-color)",
  color: "var(--sb-primary-color)",
  boxShadow:
    "0 0 0 0.375rem color-mix(in srgb, var(--sb-primary-color), transparent 86%)",
} as const;

/**
 * Where the glow-highlighted control sits on screen, in viewport coordinates,
 * published by the row that owns it so the tour popover can sit beside it.
 *
 * A module-level signal because the button is four layers below the popover
 * (row → list → translation modal → selector) and only ever one selector is on
 * screen. Null whenever no glow step is showing.
 */
const tourAnchorRect = signal<Rect | null>(null);

interface BibleSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectorState: BibleSelectorState;
  bibleDataManager: BibleDataManager;
  app: AppState;
  className?: string;
  tutorial?: TutorialManager;
}

export function BibleSelector(props: BibleSelectorProps) {
  const {
    isOpen,
    onClose,
    selectorState,
    bibleDataManager,
    app,
    className,
    tutorial,
  } = props;
  const { t, isRtl } = useI18n();

  // The active tour step, but only when it's a selector-group step — otherwise
  // this overlay must stay out of the way (the main tour handles the rest, and
  // rendering here too would double the popover).
  const runningStep =
    tutorial && tutorial.running.value ? tutorial.currentStep.value : null;
  const tourStep =
    runningStep && runningStep.group === "selector" ? runningStep : null;
  const tourStepId = tourStep?.id ?? null;
  const isLastStep = tutorial ? tutorial.isLast.value : false;
  const canGoBack = tutorial ? tutorial.canGoBack.value : false;

  // A glow step keeps the page visible, so nothing behind the panel is dimmed
  // and the card sits against the control it's describing rather than pinned to
  // the bottom of the screen.
  const glowing = tourStep?.highlight === "glow";
  const anchor = glowing ? tourAnchorRect.value : null;

  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [popoverSize, setPopoverSize] = useState<{
    w: number;
    h: number;
  } | null>(null);

  // Feed the card's real height back into placement, so a wrapped body can't
  // leave it sitting over the button. Guarded so it settles instead of looping.
  useEffect(() => {
    const element = popoverRef.current;
    if (!element) {
      return;
    }
    const box = element.getBoundingClientRect();
    const w = Math.round(box.width);
    const h = Math.round(box.height);
    if (!w && !h) {
      return;
    }
    if (
      !popoverSize ||
      Math.abs(popoverSize.w - w) > 1 ||
      Math.abs(popoverSize.h - h) > 1
    ) {
      setPopoverSize({ w, h });
    }
  });

  // Padded so the card clears the glow ring rather than butting against it.
  const anchorPad = 8;
  const layout = anchor
    ? computePopover(
        {
          top: anchor.top - anchorPad,
          left: anchor.left - anchorPad,
          width: anchor.width + anchorPad * 2,
          height: anchor.height + anchorPad * 2,
        },
        tourStep?.placement,
        null,
        popoverSize,
        12
      )
    : null;

  return (
    <>
      <div
        onClick={onClose}
        className={`sb-selector-overlay ${isOpen ? "open" : ""}${
          className ? ` ${className}` : ""
        }`}
        dir={isRtl ? "rtl" : "ltr"}
        // Dim the app behind the panel only while a spotlight tour step is up.
        style={
          tourStepId && !glowing ? { background: "rgba(0,0,0,0.6)" } : undefined
        }
      >
        <div
          onClick={(event: Event) => {
            event.stopPropagation();
          }}
          className="sb-selector-panel"
        >
          <SearchBar
            app={app}
            bibleSelectorState={selectorState}
            bibleDataManager={bibleDataManager}
            tourStepId={tourStepId}
            tutorial={tutorial}
          />
        </div>
      </div>

      {tourStep && (
        <div
          ref={popoverRef}
          className={`sb-tour-popover${className ? ` ${className}` : ""}`}
          style={
            // Beside the control it describes when we know where that is;
            // otherwise pinned to the bottom, which is where every spotlight
            // step sits and where a glow step lands if its target scrolled out
            // of the list.
            layout
              ? {
                  position: "fixed",
                  boxSizing: "border-box",
                  zIndex: 10000,
                  ...layout.style,
                }
              : {
                  position: "fixed",
                  bottom: "1.75rem",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "100%",
                  maxWidth: "28.625rem",
                  boxSizing: "border-box",
                  zIndex: 10000,
                }
          }
          onClick={(event: MouseEvent) => event.stopPropagation()}
        >
          {layout?.side && (
            <span
              className={`sb-tour-arrow sb-tour-arrow-${layout.side}`}
              style={layout.arrowStyle}
              aria-hidden="true"
            />
          )}

          <h3 className="sb-tour-popover-title">
            {t(tourStep.titleKey, { defaultValue: tourStep.titleDefault })}
          </h3>
          <p className="sb-tour-popover-body">
            {t(tourStep.bodyKey, { defaultValue: tourStep.bodyDefault })}
          </p>
          <div className="sb-tour-popover-actions">
            {tutorial && tutorial.steps.length > 1 && (
              <div
                className="sb-tour-popover-dots"
                role="img"
                aria-label={t("tutorial.stepProgress", {
                  current: tutorial.index.value + 1,
                  total: tutorial.steps.length,
                  defaultValue: "Step {{current}} of {{total}}",
                })}
              >
                {tutorial.steps.map((step, position) => (
                  <span
                    key={step.id}
                    className={`sb-tour-dot${
                      position === tutorial.index.value
                        ? " sb-tour-dot-active"
                        : ""
                    }`}
                  />
                ))}
              </div>
            )}
            <button
              type="button"
              className="sb-tour-btn sb-tour-btn-text"
              onClick={() => tutorial?.finish()}
            >
              {t("tutorial.skip", { defaultValue: "Skip" })}
            </button>
            <button
              type="button"
              className="sb-tour-btn sb-tour-btn-text"
              onClick={() => tutorial?.optOut()}
            >
              {t("tutorial.optOut", { defaultValue: "Don't show tutorials" })}
            </button>
            <div className="sb-tour-popover-actions-spacer" />
            {canGoBack && (
              <button
                type="button"
                className="sb-tour-btn sb-tour-btn-back"
                onClick={() => tutorial?.prev()}
              >
                {t("tutorial.back", { defaultValue: "Back" })}
              </button>
            )}
            <button
              type="button"
              className="sb-tour-btn sb-tour-btn-next"
              onClick={() => tutorial?.next()}
            >
              {isLastStep
                ? t("tutorial.done", { defaultValue: "Done" })
                : t("tutorial.next", { defaultValue: "Next" })}
              <span className="sb-tour-next-arrow" aria-hidden="true">
                →
              </span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const SearchBar = (props: {
  app: AppState;
  bibleSelectorState: BibleSelectorState;
  bibleDataManager: BibleDataManager;
  /** Active selector-group tour step id, or null when no step is active. */
  tourStepId?: string | null;
  tutorial?: TutorialManager;
}) => {
  const { app, bibleSelectorState, bibleDataManager, tourStepId, tutorial } =
    props;
  const { t } = useI18n();
  const {
    search,
    setSearch,
    selectedTranslationBooks,
    selectedTranslation,
    openTabs,
    showApocryphaInfo,
  } = bibleSelectorState;

  const selectedTestament = bibleSelectorState.selectedTestament;
  const apocryphaAvailable = bibleSelectorState.apocryphaAvailable;
  const selectingTranslation = bibleSelectorState.selectingTranslation;
  const isMobile = app.isMobile;
  const selectedTestamentData = bibleSelectorState.selectedTestamentData;
  const handleEnter = bibleSelectorState.handleEnter;
  const setOpen = bibleSelectorState.setOpen;

  return (
    <>
      {(!selectingTranslation.value || !isMobile.value) && (
        <div class="testament-selection starterAnimation">
          {!isMobile.value && (
            <>
              <div
                class="sidebar-translation-selector flex-between-center"
                style={
                  tourStepId === "selector-translation"
                    ? SPOTLIGHT_STYLE
                    : undefined
                }
                onClick={() => {
                  selectingTranslation.value = !selectingTranslation.value;
                  setSearch("");
                }}
              >
                <span class="sidebar-selected-title flex-align-center">
                  {selectedTranslation?.value?.shortName}
                </span>
                <span
                  style={{
                    transition: "transform 0.3s",
                  }}
                  class={`material-symbols-outlined ${selectingTranslation.value ? "upside-down" : ""}`}
                  // eslint-disable-next-line seed-bible-i18n/i18n-untranslated-content
                >
                  expand_more
                </span>
              </div>

              <div
                className="searchbar flex-align-center"
                style={
                  tourStepId === "selector-search" ? SPOTLIGHT_STYLE : undefined
                }
              >
                <span className="search-icon material-symbols-outlined">
                  Search
                </span>
                <input
                  type="text"
                  placeholder={t("search-books", {
                    defaultValue: "Search books...",
                  })}
                  value={search.value}
                  className="flex-1"
                  onInput={(e) => {
                    setSearch((e.target as HTMLInputElement).value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.keyCode === 13) {
                      handleEnter();
                    }
                  }}
                />
              </div>
              <div
                class="dropdown"
                style={
                  tourStepId === "selector-testament"
                    ? SPOTLIGHT_STYLE
                    : undefined
                }
              >
                <select
                  value={selectedTestament.value}
                  onChange={(e) => {
                    selectedTestament.value = Number(
                      (e.target as HTMLSelectElement).value
                    );
                  }}
                  class="dropdown-select"
                >
                  <option value={2} class="dropdown-option">
                    {t("allBooks", { defaultValue: "All Books" })}
                  </option>
                  <option value={0} class="dropdown-option">
                    {!isMobile.value
                      ? t("old-testament", { defaultValue: "Old Testament" })
                      : t("old-testament_short", { defaultValue: "OT" })}
                  </option>
                  <option value={1} class="dropdown-option">
                    {!isMobile.value
                      ? t("new-testament", { defaultValue: "New Testament" })
                      : t("new-testament_short", { defaultValue: "NT" })}
                  </option>
                  {apocryphaAvailable.value && (
                    <option value={3} class="dropdown-option">
                      {t("apocrypha", { defaultValue: "Apocrypha" })}
                    </option>
                  )}
                </select>
              </div>
            </>
          )}
          {isMobile.value && (
            <>
              <button
                class="sb-selector-mobile-close"
                onClick={() => {
                  setOpen(false);
                  selectingTranslation.value = false;
                }}
                aria-label={t("close", { defaultValue: "Close" })}
              >
                <span class="material-symbols-outlined">close</span>
              </button>
              <span class="sb-bible-reader-mobile-header-title">
                {t("books", { defaultValue: "Books" })}
              </span>
              <button
                class="sb-selector-mobile-close"
                onClick={() => openTabs()}
              >
                <SbTabsIcon />
              </button>
            </>
          )}
        </div>
      )}
      <div
        class="sidebar-results starterAnimation flex-wrap-start"
        style={tourStepId === "selector-books" ? SPOTLIGHT_STYLE : undefined}
      >
        {(!selectingTranslation.value || !isMobile.value) &&
          selectedTranslationBooks.value?.books &&
          selectedTestamentData.value &&
          selectedTranslation.value && (
            <SideBarBooks app={app} bibleSelectorState={bibleSelectorState} />
          )}
        {selectingTranslation.value && (
          <TranslationModal
            app={app}
            bibleSelectorState={bibleSelectorState}
            bibleDataManager={bibleDataManager}
            tourStepId={tourStepId}
            tutorial={tutorial}
          />
        )}
      </div>
      {showApocryphaInfo.value && (
        <ApocryphaInfo bibleSelectorState={bibleSelectorState} />
      )}
    </>
  );
};

const SideBarBooks = (props: {
  app: AppState;
  bibleSelectorState: BibleSelectorState;
}) => {
  const { app, bibleSelectorState } = props;

  const { t } = useI18n();

  const { viewportWidth } = app;

  const {
    lastBookClicked,
    bookData,
    chT,
    localSelectedTestament,
    groupedBooks,
    handleChapterClick: handleClick,
    isBook,
    ghostArray,
    apocryphaAvailable,
    showApocryphaInfo,
  } = bibleSelectorState;

  const RenderBooksByTestament = computed(() => {
    const ws = viewportWidth.value;
    const lbc = lastBookClicked.value;
    const bd = bookData.value;
    const cht = chT.value;
    const lst = localSelectedTestament.value;

    // Dual OT+NT: desktop 3+2, tablet 2+1, mobile 1+1
    // Single testament: desktop 5, tablet 3, mobile 1
    let otColumns = 3;
    let ntColumns = 2;
    let singleColumns = 5;
    let otWidthPercent = 60;
    let ntWidthPercent = 40;
    if (ws <= MOBILE_BREAKPOINT) {
      otColumns = 1;
      ntColumns = 1;
      singleColumns = 1;
      otWidthPercent = 100;
      ntWidthPercent = 100;
    } else if (ws < 1200) {
      otColumns = 2;
      ntColumns = 1;
      singleColumns = 3;
      otWidthPercent = 66.66;
      ntWidthPercent = 33.33;
    }

    const getBooksGridClass = (columns: number) =>
      columns > 1 ? "grid-column-wrap-around" : "books-item-vertical";

    // Column-major: fill down each column, then move to the next.
    // rows = ceil(books / columns); DOM index i → col = floor(i / rows), row = i % rows.
    const getColumnRows = (itemCount: number, columns: number) =>
      columns <= 1 ? itemCount : Math.max(1, Math.ceil(itemCount / columns));

    const getBooksGridStyle = (
      columns: number,
      rows: number,
      chaptersOpen: boolean
    ) => {
      if (columns <= 1) return undefined;
      return {
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows + (chaptersOpen ? 1 : 0)}, auto)`,
      };
    };

    const getItemGridStyle = (
      index: number,
      rows: number,
      columns: number,
      openVisualRow: number | null
    ) => {
      if (columns <= 1) return undefined;
      const visualRow = index % rows;
      const visualCol = Math.floor(index / rows);
      const gridRow =
        openVisualRow !== null && visualRow > openVisualRow
          ? visualRow + 2
          : visualRow + 1;
      return {
        gridColumn: visualCol + 1,
        gridRow,
      };
    };

    // Last DOM index in the visual row that contains `index` (for chapter insert point).
    const calcColumnMajorChapterPos = (
      index: number,
      rows: number,
      columns: number
    ) => {
      if (index < 0 || columns <= 1) return index;
      const visualRow = index % rows;
      return visualRow + (columns - 1) * rows;
    };

    const { oldTestament, newTestament, apocrypha } = groupedBooks.value;

    // Renders a single book entry (or ghost) with optional column-major grid
    // placement. Chapters insert as a full-width grid row between visual rows.
    const renderBook = (
      book: BibleSelectorBookItem,
      index: number,
      chapterPos: number,
      separator: number,
      chapterHint?: number,
      itemStyle?: JSX.CSSProperties,
      narrowChapterStyle?: boolean,
      itemGridStyle?: JSX.CSSProperties,
      chapterGridStyle?: JSX.CSSProperties
    ) => {
      const isSelected = isBook(book) && index === lbc && bd?.id === book.id;
      return (
        <>
          {isBook(book) ? (
            <div
              class={`sidebar-itm flex-between-center ${isSelected ? "sidebar-selected-itm" : ""}`}
              tabIndex={index + 1}
              aria-current={isSelected ? "true" : undefined}
              aria-expanded={isSelected}
              onClick={() => handleClick({ book })}
              id={`booktab-${book.id}`}
              style={itemGridStyle}
            >
              <span
                style={{
                  display: "flex",
                  gap: "0.1875rem",
                  width: "100%",
                  justifyContent: "space-between",
                  ...itemStyle,
                }}
              >
                {book.commonName}
              </span>
              <span
                style={{
                  transition: "transform 0.3s",
                  color: isSelected ? "var(--sb-primary-color)" : "",
                }}
                class={`material-symbols-outlined ${isSelected ? "upside-down" : ""}`}
                // eslint-disable-next-line seed-bible-i18n/i18n-untranslated-content
              >
                expand_more
              </span>
            </div>
          ) : (
            <div
              class="sidebar-ghost-itm"
              tabIndex={index + 1}
              style={itemGridStyle}
            />
          )}
          {chapterPos === index &&
            bd &&
            (chapterHint === undefined || cht === chapterHint) && (
              <div
                class="sidebar-chapters show-sidebar-chapter"
                style={{
                  ...chapterGridStyle,
                  justifyContent:
                    ws <= MOBILE_BREAKPOINT ||
                    bd.numberOfChapters < 4 * separator
                      ? "flex-start"
                      : "space-between",
                }}
              >
                {narrowChapterStyle && ntColumns === 2 && (
                  <style>{`.show-sidebar-chapter{width: calc(100% - 5px);}`}</style>
                )}
                <SideBarChapters
                  app={app}
                  bibleSelectorState={bibleSelectorState}
                />
              </div>
            )}
        </>
      );
    };

    const renderBooksGrid = (
      books: BibleSelectorBookItem[],
      columns: number,
      chapterHint?: number,
      itemStyle?: JSX.CSSProperties,
      narrowChapterStyle?: boolean
    ) => {
      const rows = getColumnRows(books.length, columns);
      const chaptersOpen =
        !!bd && lbc >= 0 && (chapterHint === undefined || cht === chapterHint);
      const openVisualRow = chaptersOpen && columns > 1 ? lbc % rows : null;
      const chapterPos =
        columns <= 1 ? lbc : calcColumnMajorChapterPos(lbc, rows, columns);
      const chapterGridStyle =
        openVisualRow !== null
          ? { gridColumn: "1 / -1", gridRow: openVisualRow + 2 }
          : undefined;

      return (
        <div
          class={`books-item ${getBooksGridClass(columns)}`}
          style={getBooksGridStyle(columns, rows, chaptersOpen && columns > 1)}
        >
          {books.map((book: BibleSelectorBookItem, index: number) =>
            renderBook(
              book,
              index,
              chapterPos,
              columns,
              chapterHint,
              itemStyle,
              narrowChapterStyle,
              getItemGridStyle(index, rows, columns, openVisualRow),
              chapterGridStyle
            )
          )}
        </div>
      );
    };

    if (lst === 2) {
      const OTBooks = ghostArray(oldTestament, otColumns);
      const NTBooks = ghostArray(newTestament, ntColumns);
      const APBooks = ghostArray(apocrypha, ntColumns);
      // Hint 2 is reserved for apocrypha so its chapter panel doesn't collide
      // with the NT grid (hint 1). On desktop All Books there is no apocrypha
      // column, so when the expanded book is apocrypha we short-circuit to the
      // apocrypha-only grid (same layout as the Apocrypha filter).
      const expandedIsApocrypha =
        !!bd && apocrypha.some((book) => book.id === bd.id);
      if (ws > MOBILE_BREAKPOINT && expandedIsApocrypha) {
        return (
          <div
            class="books-container flex-gap-md"
            dir={
              bibleSelectorState.selectedTranslation.value?.textDirection ??
              "ltr"
            }
          >
            <div
              class="testament-container flex-col-gap-sm"
              style={{ width: "100%" }}
            >
              <span class="testament-title">
                {t("extrabiblical-writings", {
                  defaultValue: "Extrabiblical writings",
                })}
                <span
                  class="material-symbols-outlined"
                  onClick={() => {
                    showApocryphaInfo.value = true;
                  }}
                >
                  info
                </span>
              </span>
              {renderBooksGrid(
                ghostArray(apocrypha, singleColumns),
                singleColumns
              )}
            </div>
          </div>
        );
      }
      return (
        <div
          class="books-container flex-gap-md"
          dir={
            bibleSelectorState.selectedTranslation.value?.textDirection ?? "ltr"
          }
        >
          <div
            class="testament-container flex-col-gap-sm"
            style={{ width: `${otWidthPercent}%` }}
          >
            <span class="testament-title">
              {t("old-testament", { defaultValue: "Old Testament" })}
            </span>
            {renderBooksGrid(OTBooks, otColumns, 0, {
              textTransform: "capitalize",
            })}
          </div>
          <div className="separator" />
          <div
            class="testament-container flex-col-gap-sm"
            style={{ width: `${ntWidthPercent}%` }}
          >
            <span class="testament-title">
              {t("new-testament", { defaultValue: "New Testament" })}
            </span>
            {renderBooksGrid(NTBooks, ntColumns, 1, undefined, true)}
          </div>
          {ws <= MOBILE_BREAKPOINT && apocryphaAvailable.value && (
            <>
              <div className="separator" style={{ display: "flex" }} />
              <div
                class="testament-container flex-col-gap-sm"
                style={{
                  width: "100%",
                  color: "var(--sb-font-color)",
                  opacity: "0.7",
                }}
              >
                <span class="testament-title">
                  {t("extrabiblical-writings", {
                    defaultValue: "Extrabiblical writings",
                  })}
                  <span
                    class="material-symbols-outlined"
                    onClick={() => {
                      showApocryphaInfo.value = true;
                    }}
                  >
                    info
                  </span>
                </span>
                {renderBooksGrid(APBooks, ntColumns, 2, undefined, true)}
              </div>
            </>
          )}
        </div>
      );
    }

    // Single-testament views (OT=0, NT=1, Apocrypha=3) — use full column budget
    const singleTestamentConfig: Record<
      number,
      {
        books: ReturnType<typeof ghostArray>;
        title: string;
        alwaysShowTitle: boolean;
      }
    > = {
      0: {
        books: ghostArray(oldTestament, singleColumns),
        title: t("old-testament", { defaultValue: "Old Testament" }),
        alwaysShowTitle: false,
      },
      1: {
        books: ghostArray(newTestament, singleColumns),
        title: t("new-testament", { defaultValue: "New Testament" }),
        alwaysShowTitle: false,
      },
      3: {
        books: ghostArray(apocrypha, singleColumns),
        title: t("apocrypha", { defaultValue: "Apocrypha" }),
        alwaysShowTitle: true,
      },
    };

    const config = singleTestamentConfig[lst];
    if (!config) return null;

    return (
      <div
        class="books-container flex-gap-md"
        dir={
          bibleSelectorState.selectedTranslation.value?.textDirection ?? "ltr"
        }
      >
        <div
          class="testament-container flex-col-gap-sm"
          style={{ width: "100%" }}
        >
          {(config.alwaysShowTitle || ws > MOBILE_BREAKPOINT) && (
            <span class="testament-title">{config.title}</span>
          )}
          {renderBooksGrid(config.books, singleColumns)}
        </div>
      </div>
    );
  });

  return <>{RenderBooksByTestament}</>;
};

const SideBarChapters = (props: {
  app: AppState;
  bibleSelectorState: BibleSelectorState;
}) => {
  const { app, bibleSelectorState } = props;

  const { t } = useI18n();

  const { isMobile } = app;
  const {
    bookData,
    highLightedButtonsID,
    currentPsalms,
    selectChapter,
    isOpen,
    currentChapterNumber,
    currentBookId,
  } = bibleSelectorState;

  const psalmsPartName = (props: {
    chapterNumber: number;
  }): BibleSelectorPsalmsGroups => {
    const { chapterNumber } = props;
    if (chapterNumber <= 41) {
      return "1-psalms";
    } else if (chapterNumber <= 72) {
      return "2-psalms";
    } else if (chapterNumber <= 89) {
      return "3-psalms";
    } else if (chapterNumber <= 106) {
      return "4-psalms";
    } else {
      return "5-psalms";
    }
  };

  const openBookId = bookData.value?.id ?? null;
  const activeChapter =
    openBookId && openBookId === currentBookId.value
      ? currentChapterNumber.value
      : null;
  // Center the current chapter only on the closed→open transition. Expanding
  // another book while the selector stays open should keep develop's gentler
  // "scroll into view if needed" behavior. The pending flag survives effect
  // cleanups (e.g. openBookId updating right after open) until the open
  // center scroll actually runs.
  const wasSelectorOpenRef = useRef(false);
  const centerOnOpenPendingRef = useRef(false);

  useEffect(() => {
    if (isOpen.value && !wasSelectorOpenRef.current) {
      centerOnOpenPendingRef.current = true;
    } else if (!isOpen.value) {
      centerOnOpenPendingRef.current = false;
    }
    wasSelectorOpenRef.current = isOpen.value;

    if (!openBookId || !isOpen.value) return;

    // Ensure the Psalm book-group containing the current chapter is expanded
    // so the chapter button is visible for highlight + scroll-into-view.
    // This must stay in the same effect as the scroll/focus logic below
    // (rather than a separate effect keyed off `currentPsalms.value`) —
    // `currentPsalms` is also written when the user manually opens/closes a
    // Psalms section, and re-running the scroll/focus effect off that same
    // signal would snap the view back to the current chapter every time,
    // undoing the user's manual browsing.
    if (openBookId === "PSA" && activeChapter != null) {
      const partName = psalmsPartName({ chapterNumber: activeChapter });
      if (!currentPsalms.value.includes(partName)) {
        currentPsalms.value = [...currentPsalms.value, partName];
      }
    }

    const shouldCenter = centerOnOpenPendingRef.current;
    // Consume immediately rather than inside the timeout below: if a second
    // effect run (e.g. expanding another book) lands before the timeout
    // fires, cleanup clears the timeout without ever running its callback,
    // so a deferred reset would leak `shouldCenter: true` into that next,
    // non-opening pass.
    centerOnOpenPendingRef.current = false;

    const timeout = window.setTimeout(() => {
      const bookTab = document.getElementById(`booktab-${openBookId}`);
      const booksItem = bookTab?.closest(".books-item");
      if (!bookTab || !booksItem) return;

      // Don't yank focus off the search field while the user is typing.
      // openBookId also changes when search narrows to a single book.
      const active = document.activeElement as HTMLElement | null;
      if (!active?.closest(".searchbar")) {
        bookTab.focus({ preventScroll: true });
      }

      const chapterPanel = booksItem.querySelector(".show-sidebar-chapter");
      const currentChapterButton =
        activeChapter != null
          ? booksItem.querySelector<HTMLElement>(
              `.show-sidebar-chapter #chapter-btn-${activeChapter}`
            )
          : null;
      // Psalms hide chapters outside the expanded group (`display: none`);
      // those have a zero-size rect and must not be used as the scroll target.
      const visibleChapterButton =
        currentChapterButton &&
        currentChapterButton.style.display !== "none" &&
        currentChapterButton.offsetParent !== null
          ? currentChapterButton
          : null;
      const target =
        visibleChapterButton ?? (chapterPanel as HTMLElement | null) ?? bookTab;

      // Scroll every overflow-y ancestor through the selector panel.
      // Desktop usually only needs `.books-item`. On mobile both
      // `.books-container` and `.sidebar-results` are `overflow: auto`, so
      // either (or both) may need to scroll.
      const scrollTargetInto = (scroller: HTMLElement) => {
        const scrollerRect = scroller.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        // On first open, center so neighboring chapters stay in view.
        // `scrollTo` clamps to the scroll range, so near the start/end the
        // chapter sits as close to center as possible without empty space.
        // While browsing expanded books, only nudge when clipped (develop).
        // Tall targets only chase the top — centering a full chapter grid
        // would scroll past the book title above it.
        const targetFits = targetRect.height <= scrollerRect.height;
        let delta = 0;
        if (shouldCenter && targetFits) {
          const targetCenter = targetRect.top + targetRect.height / 2;
          const scrollerCenter = scrollerRect.top + scrollerRect.height / 2;
          delta = targetCenter - scrollerCenter;
        } else if (targetRect.top < scrollerRect.top) {
          delta = -(scrollerRect.top - targetRect.top + 8);
        } else if (targetFits && targetRect.bottom > scrollerRect.bottom) {
          delta = targetRect.bottom - scrollerRect.bottom + 8;
        }
        if (Math.abs(delta) > 1) {
          // `behavior: "auto"` overrides `.sidebar-results { scroll-behavior:
          // smooth }` so nested ancestor scrolls measure stable rects.
          scroller.scrollTo({
            top: scroller.scrollTop + delta,
            behavior: "auto",
          });
        }
      };

      let node: HTMLElement | null = target.parentElement;
      while (node) {
        const { overflowY } = window.getComputedStyle(node);
        if (
          (overflowY === "auto" ||
            overflowY === "scroll" ||
            overflowY === "overlay") &&
          node.scrollHeight > node.clientHeight + 1
        ) {
          scrollTargetInto(node);
        }
        if (node.classList.contains("sb-selector-panel")) break;
        node = node.parentElement;
      }
    }, 50);

    return () => window.clearTimeout(timeout);
    // Deliberately excludes `currentPsalms.value` — see comment above.
  }, [openBookId, activeChapter, isOpen.value]);

  const renderChapters = computed(() => {
    const bd = bookData.value;
    if (!bd) return [];
    const hlb = highLightedButtonsID.value;
    const cp = currentPsalms.value;
    const renderJSX = [];

    const togglePsalmPart = (partName: BibleSelectorPsalmsGroups) => {
      currentPsalms.value = cp.includes(partName)
        ? cp.filter((psalm) => psalm !== partName)
        : [...cp, partName];
    };

    const renderPsalmPartToggle = (partName: BibleSelectorPsalmsGroups) => (
      <button
        style={{ width: "100%" }}
        onClick={() => togglePsalmPart(partName)}
        class={`psalms-btn flex-start-start ${cp.includes(partName) ? "sidebar-selected-itm" : ""}`}
      >
        <span style={{ width: "100%" }} class="">
          {t(partName, { defaultValue: `${partName.slice(0, 1)} Psalms` })}
        </span>
      </button>
    );

    const renderChapterButton = (props: {
      chapterNumber: number;
      isVisible?: boolean;
      isLast?: boolean;
    }) => {
      const { chapterNumber, isVisible, isLast } = props;
      const isCurrentChapter = Boolean(hlb[chapterNumber]);
      const { cancel, ...chapterPressHandler } = useLongPress(() => {
        if (!isMobile.value) return;
        bibleSelectorState.forceNewTab.value = true;
        selectChapter(bd.id, chapterNumber);
        app.closeFullscreenPanes();
        bibleSelectorState.forceNewTab.value = false;
        bibleSelectorState.isOpen.value = false;
      }, 1000);
      return (
        <button
          id={`chapter-btn-${chapterNumber}`}
          style={
            isVisible === undefined
              ? undefined
              : { display: isVisible ? "flex" : "none" }
          }
          class={`chapter-btn flex-center ${isLast ? "lastOne" : ""} ${
            isCurrentChapter ? "chapter-btn-current" : ""
          }`}
          aria-current={isCurrentChapter ? "true" : undefined}
          onClick={() => {
            cancel();
            selectChapter(bd.id, chapterNumber);
            app.closeFullscreenPanes();
            isOpen.value = false;
          }}
          {...chapterPressHandler}
        >
          <span
            className={`sidebar-chapter-itm ${isCurrentChapter ? "highlight" : "un-highlight"}`}
          >
            {chapterNumber}
          </span>
        </button>
      );
    };

    const psalmPartByStartIndex: Record<number, BibleSelectorPsalmsGroups> = {
      1: "1-psalms",
      42: "2-psalms",
      73: "3-psalms",
      90: "4-psalms",
      107: "5-psalms",
    };

    if (bd.id === "PSA") {
      for (let i = 1; i <= bd.numberOfChapters; i++) {
        const partToggle = psalmPartByStartIndex[i];
        if (partToggle) {
          renderJSX.push(renderPsalmPartToggle(partToggle));
        }

        const partName = psalmsPartName({ chapterNumber: i });
        renderJSX.push(
          renderChapterButton({
            chapterNumber: i,
            isVisible: cp.includes(partName),
            isLast: i === bd.numberOfChapters,
          })
        );
      }
    } else {
      for (let i = 1; i <= bd.numberOfChapters; i++) {
        renderJSX.push(
          renderChapterButton({
            chapterNumber: i,
            isLast: i === bd.numberOfChapters,
          })
        );
      }
    }
    return renderJSX;
  });
  return (
    <>
      {renderChapters.value.map((jsx) => {
        return jsx;
      })}
    </>
  );
};

/**
 * The per-translation offline download controls shown in the translation list.
 *
 * Renders at most two buttons:
 *
 * - an **update** button, only while the API reports a newer version than the
 *   copy on this device; and
 * - a **download / remove** button, which downloads the translation, shows live
 *   progress (tap to cancel) while it downloads, and offers to remove it once
 *   it's stored.
 *
 * Renders nothing at all when the device can't store downloads (server-side
 * rendering, or a browser with IndexedDB blocked).
 */
const OfflineTranslationControls = (props: {
  translation: Translation;
  offline: OfflineTranslationsManager;
  bibleSelectorState: BibleSelectorState;
  app: AppState;
  /** Active selector-group tour step id, or null when no step is active. */
  tourStepId?: string | null;
}) => {
  const { translation, offline, bibleSelectorState, app, tourStepId } = props;
  const { pendingOfflineDelete } = bibleSelectorState;
  const { t } = useI18n();

  // The offline tip highlights one button, not every row's: the translation the
  // reader is actually in, which is the row the user came here already using.
  const isTourTarget =
    tourStepId === "offline-download" &&
    bibleSelectorState.selectedTranslation.value?.id === translation.id;

  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Publish where the button is so the tour card can sit against it. The list
  // scrolls and the selector opens with an animation, so this keeps measuring
  // for as long as the tip is up rather than trusting one reading.
  useEffect(() => {
    if (!isTourTarget) {
      return;
    }
    const measure = () => {
      const box = buttonRef.current?.getBoundingClientRect();
      if (!box || (!box.width && !box.height)) {
        return;
      }
      // Only publish real movement. Writing an equal-but-new object every tick
      // would re-render the whole translation list four times a second.
      const previous = tourAnchorRect.value;
      if (
        previous &&
        Math.abs(previous.top - box.top) < 0.5 &&
        Math.abs(previous.left - box.left) < 0.5 &&
        Math.abs(previous.width - box.width) < 0.5 &&
        Math.abs(previous.height - box.height) < 0.5
      ) {
        return;
      }
      tourAnchorRect.value = {
        top: box.top,
        left: box.left,
        width: box.width,
        height: box.height,
      };
    };

    measure();
    const interval = window.setInterval(measure, 150);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      tourAnchorRect.value = null;
    };
  }, [isTourTarget]);

  if (!offline.supported) {
    return null;
  }

  const highlightStyle = isTourTarget ? GLOW_STYLE : undefined;

  const progress = offline.downloads.value.get(translation.id) ?? null;
  const summary = offline.downloaded.value.get(translation.id) ?? null;
  const error = offline.errors.value.get(translation.id) ?? null;

  const startDownload = async () => {
    const succeeded = await offline.downloadTranslation(translation.id);
    if (succeeded) {
      app.toast(
        t("translation-downloaded", {
          name: translation.shortName,
          defaultValue: "{{name}} is now available offline",
        })
      );
      return;
    }

    const failure = offline.errors.value.get(translation.id);
    if (failure) {
      app.toast(
        t("translation-download-failed", {
          name: translation.shortName,
          defaultValue: "Couldn't download {{name}}.",
        })
      );
    }
  };

  if (progress) {
    // The download phase usually has no percentage to show: the API doesn't send
    // `Access-Control-Expose-Headers: Content-Length`, so a cross-origin page
    // can't read the total size. Rather than fake a percentage, that case spins
    // an indeterminate ring and reports the bytes received so far in the
    // tooltip. The saving phase always knows its total (a chapter count), so it
    // fills the ring properly.
    const percent =
      progress.ratio === null ? null : Math.round(progress.ratio * 100);
    const label =
      progress.phase === "saving"
        ? t("saving-translation-to-device", {
            percent: percent ?? 0,
            defaultValue: "Saving to this device… {{percent}}% — tap to cancel",
          })
        : percent === null
          ? t("cancel-translation-download-unknown-size", {
              size: formatBytes(progress.receivedBytes),
              defaultValue: "Downloading {{size}} so far — tap to cancel",
            })
          : t("cancel-translation-download", {
              percent,
              defaultValue: "Downloading {{percent}}% — tap to cancel",
            });

    return (
      <button
        type="button"
        class="sb-offline-btn downloading flex-center"
        title={label}
        aria-label={label}
        onClick={(e: MouseEvent) => {
          e.stopPropagation();
          offline.cancelDownload(translation.id);
        }}
      >
        <span
          class={`sb-offline-progress${percent === null ? " indeterminate" : ""}`}
          style={{ "--sb-offline-progress": `${percent ?? 0}%` }}
        >
          {percent !== null && (
            <span class="sb-offline-progress-label">{percent}</span>
          )}
        </span>
      </button>
    );
  }

  const downloadTitle = error
    ? t("retry-translation-download", {
        error,
        defaultValue: "Download failed ({{error}}) — tap to retry",
      })
    : t("download-translation-offline", {
        defaultValue: "Download for offline use",
      });

  const updateLabel = t("update-offline-translation", {
    defaultValue: "A newer version is available — tap to update",
  });
  const downloadedLabel = summary
    ? t("translation-available-offline", {
        size: formatBytes(summary.sizeBytes),
        defaultValue: "Available offline ({{size}}) — tap to remove",
      })
    : "";

  // Every button carries its label as both `title` and `aria-label`: `title`
  // alone gives a mouse tooltip but isn't reliably announced by screen readers,
  // and these buttons have no visible text of their own. The icon glyphs are
  // hidden from assistive tech so they can't be read out as stray words.
  return (
    <>
      {summary?.updateAvailable && (
        <button
          type="button"
          class="sb-offline-btn update flex-center"
          title={updateLabel}
          aria-label={updateLabel}
          onClick={(e: MouseEvent) => {
            e.stopPropagation();
            void startDownload();
          }}
        >
          <span class="material-symbols-outlined" aria-hidden="true">
            sync
          </span>
        </button>
      )}
      {summary ? (
        <button
          type="button"
          ref={buttonRef}
          class="sb-offline-btn downloaded flex-center"
          style={highlightStyle}
          title={downloadedLabel}
          aria-label={downloadedLabel}
          onClick={(e: MouseEvent) => {
            e.stopPropagation();
            pendingOfflineDelete.value = translation;
          }}
        >
          <span class="material-symbols-outlined" aria-hidden="true">
            offline_pin
          </span>
        </button>
      ) : (
        <button
          type="button"
          ref={buttonRef}
          class={`sb-offline-btn flex-center${error ? " has-error" : ""}`}
          style={highlightStyle}
          title={downloadTitle}
          aria-label={downloadTitle}
          onClick={(e: MouseEvent) => {
            e.stopPropagation();
            void startDownload();
          }}
        >
          <span class="material-symbols-outlined" aria-hidden="true">
            download
          </span>
        </button>
      )}
    </>
  );
};

/**
 * Confirmation shown before removing a downloaded translation from the device.
 *
 * Rendered as a sibling of the translation modal (like the info and filter
 * popovers) so it layers above the list without being clipped by it.
 */
const ConfirmOfflineDelete = (props: {
  bibleSelectorState: BibleSelectorState;
  offline: OfflineTranslationsManager;
  app: AppState;
  translation: Translation;
}) => {
  const { bibleSelectorState, offline, app, translation } = props;
  const { pendingOfflineDelete } = bibleSelectorState;
  const { t } = useI18n();

  const close = () => {
    pendingOfflineDelete.value = null;
  };

  const confirm = async () => {
    close();
    try {
      await offline.deleteTranslation(translation.id);
      app.toast(
        t("translation-removed-from-device", {
          name: translation.shortName,
          defaultValue: "{{name}} was removed from this device",
        })
      );
    } catch {
      app.toast(
        t("remove-offline-translation-failed", {
          defaultValue: "Couldn't remove the download.",
        })
      );
    }
  };

  return (
    <div
      className="modal translationDeleteModal"
      onClick={(e: MouseEvent) => {
        e.stopPropagation();
      }}
    >
      <p className="sb-offline-delete-title">
        {t("remove-offline-translation-title", {
          defaultValue: "Remove download?",
        })}
      </p>
      <p className="sb-offline-delete-message">
        {t("remove-offline-translation-message", {
          name: `${translation.name} (${translation.shortName})`,
          defaultValue:
            'Remove "{{name}}" from this device? You\'ll need a connection to read it again.',
        })}
      </p>
      <div className="sb-offline-delete-actions">
        <button
          type="button"
          className="sb-offline-delete-cancel"
          onClick={close}
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          className="sb-offline-delete-confirm"
          onClick={() => void confirm()}
        >
          {t("remove", { defaultValue: "Remove" })}
        </button>
      </div>
    </div>
  );
};

const TranslationModal = (props: {
  app: AppState;
  bibleSelectorState: BibleSelectorState;
  bibleDataManager: BibleDataManager;
  /** Active selector-group tour step id, or null when no step is active. */
  tourStepId?: string | null;
  tutorial?: TutorialManager;
}) => {
  const { app, bibleSelectorState, bibleDataManager, tourStepId, tutorial } =
    props;
  const { isMobile } = app;
  const {
    languageQuery,
    selectingTranslation,
    showCustomTranslation,
    allowedTranslationLimit,
    showAllLanguages,
    showTranslationSettings,
    showTranslationInfo,
    pendingOfflineDelete,
    filteredApiTranslations,
    matchingTranslationGroupCount,
    selectedTranslation,
    pickTranslation,
    setOpen,
  } = bibleSelectorState;

  const { t } = useI18n();

  // Opening the list is the moment a stale download matters, so this is where we
  // re-read the API's hashes. It's a no-op when nothing is downloaded or the
  // device is offline.
  useEffect(() => {
    void bibleDataManager.offline.checkForUpdates();

    // Opening the list is also the first time the download control is on
    // screen, so it's where we teach it. Skipped where downloads aren't
    // supported, since then there's no control to point at.
    if (bibleDataManager.offline.supported) {
      tutorial?.startContextual("offline-download");
    }
  }, []);

  // Judged against how many groups actually match the current search and view
  // mode, not the size of the whole catalog: in "complete" mode most of the
  // catalog's languages have no complete translation, so comparing against the
  // catalog total left a control on screen that could not reveal anything.
  const shouldShowLoadMoreButton = (
    allowedLimit: number,
    matchingCount: number
  ): boolean => allowedLimit < matchingCount;

  // The list itself is the shared `TranslationList`, so the reader and the
  // Compare pane group, search and render translations the same way. Only the
  // reader's own row actions (offline downloads, share) are passed in.
  const LanguageList = computed(() => (
    <TranslationList
      groups={filteredApiTranslations.value}
      query={languageQuery.value}
      viewMode={showAllLanguages.value}
      selectedTranslationIds={
        selectedTranslation.value ? [selectedTranslation.value.id] : []
      }
      expandedLanguage={
        selectedTranslation.value?.language?.toLowerCase() ?? null
      }
      onPick={(translation) => {
        pickTranslation(translation.id);
      }}
      onShowAllTranslations={() => {
        showAllLanguages.value = "all";
      }}
      canLoadMore={shouldShowLoadMoreButton(
        allowedTranslationLimit.value,
        matchingTranslationGroupCount.value
      )}
      totalGroupCount={matchingTranslationGroupCount.value}
      onLoadMore={() => {
        allowedTranslationLimit.value = allowedTranslationLimit.value + 50;
      }}
      onShowInfo={(translation, event) => {
        if (showTranslationInfo.value?.translation.id === translation.id) {
          showTranslationInfo.value = null;
          return;
        }
        showTranslationInfo.value = {
          translation,
          position: { x: event.clientX, y: event.clientY },
        };
      }}
      onScroll={() => {
        showTranslationInfo.value = null;
        showTranslationSettings.value = false;
      }}
      renderActions={(translation) => (
        <TranslationRowActions
          app={app}
          translation={translation}
          bibleSelectorState={bibleSelectorState}
          bibleDataManager={bibleDataManager}
          tourStepId={tourStepId}
        />
      )}
    />
  ));

  return (
    <>
      <div
        className="modal-overlay flex-center"
        onClick={() => {
          selectingTranslation.value = false;
          showTranslationSettings.value = false;
          showTranslationInfo.value = null;
          pendingOfflineDelete.value = null;
        }}
      >
        <div
          className="modal"
          onClick={(e) => {
            e.stopPropagation();
            showTranslationSettings.value = false;
            showTranslationInfo.value = null;
            pendingOfflineDelete.value = null;
          }}
        >
          <div
            class="sidebar-book-selector flex-between-center-gap-md"
            style={{ padding: "0.9375rem 0.3125rem" }}
          >
            {isMobile.value && (
              <span
                class="close-icon material-symbols-outlined"
                onClick={() => {
                  selectingTranslation.value = false;
                  showTranslationSettings.value = false;
                  showTranslationInfo.value = null;
                  setOpen(false);
                }}
              >
                close
              </span>
            )}
            <div
              className="searchbar flex-align-center"
              style={{ width: "100%", height: "1.875rem" }}
            >
              <span className="search-icon material-symbols-outlined">
                Search
              </span>
              <input
                type="text"
                placeholder={t("search-translation", {
                  defaultValue: "Search Translation",
                })}
                value={languageQuery.value}
                onChange={(e) => {
                  languageQuery.value = (e.target as HTMLInputElement).value;
                }}
                id="translation-search-input"
                className="flex-1"
              />
            </div>
            <span
              onClick={(e) => {
                e.stopPropagation();
                showTranslationSettings.value = !showTranslationSettings.value;
                showTranslationInfo.value = null;
              }}
              className="filters-icon"
            >
              <FiltersIcon />
            </span>
            {!isMobile.value && (
              <span
                class="close-icon material-symbols-outlined"
                onClick={() => {
                  selectingTranslation.value = false;
                  showTranslationSettings.value = false;
                  showTranslationInfo.value = null;
                  setOpen(false);
                }}
              >
                close
              </span>
            )}
          </div>
          {LanguageList}
          <div className="footer">
            <div
              className="custom-translation-header flex-between"
              onClick={() => {
                console.log("clicked", showCustomTranslation.value);
                showCustomTranslation.value = !showCustomTranslation.value;
              }}
            >
              <span>
                {t("custom-translations", {
                  defaultValue: "Custom Translations",
                })}
              </span>
              <span
                style={{
                  cursor: "pointer",
                }}
              >
                {!showCustomTranslation.value ? (
                  <AddIcon height={20} width={20} />
                ) : (
                  <MinusIcon height={20} width={20} />
                )}
              </span>
            </div>
            {showCustomTranslation.value && (
              <CustomTranslation bibleSelectorState={bibleSelectorState} />
            )}
          </div>
        </div>
      </div>
      {showTranslationSettings.value && (
        <TranslationSettings bibleSelectorState={bibleSelectorState} />
      )}
      {showTranslationInfo.value && (
        <TranslationInfo
          translation={showTranslationInfo.value.translation}
          position={showTranslationInfo.value.position}
          isMobile={isMobile.value}
        />
      )}
      {pendingOfflineDelete.value && (
        <ConfirmOfflineDelete
          bibleSelectorState={bibleSelectorState}
          offline={bibleDataManager.offline}
          app={app}
          translation={pendingOfflineDelete.value}
        />
      )}
    </>
  );
};

/**
 * The reader-only controls at the end of a translation row in the shared
 * `TranslationList`: offline download management and a share link. Compare's
 * picker renders the same list without these.
 */
const TranslationRowActions = (props: {
  app: AppState;
  translation: Translation;
  bibleSelectorState: BibleSelectorState;
  bibleDataManager: BibleDataManager;
  /** Active selector-group tour step id, or null when no step is active. */
  tourStepId?: string | null;
}) => {
  const { app, translation, bibleSelectorState, bibleDataManager, tourStepId } =
    props;
  const { t } = useI18n();

  const shareTranslatation = async (props: { translation: Translation }) => {
    const { translation } = props;
    const current = new URL(location.href);
    const { basePath } = readInjectedConfig();
    const parsed = parseReadingPath(current.pathname, basePath);
    // The translation is a path segment now, so setting `?translation=` next
    // to a path that names a different one handed out a link that opened the
    // *current* translation — the path wins. It has to be written into the
    // path instead.
    //
    // This used to clear book/chapter so the link opened at the translation's
    // default position; the path form has nowhere to put "no position", so it
    // keeps whatever the reader is on. That is the more useful link anyway,
    // and a book the shared translation happens to lack lands on the reader's
    // not-found state, which offers its first book — where the old link went.
    const translationId = bibleDataManager.buildTranslationId(translation.id);
    const url = buildReadingUrl({
      currentUrl: current,
      basePath,
      translationId,
      bookId: (parsed?.bookId ?? DEFAULT_BOOK_ID) as BookId,
      chapter: parsed?.chapter ?? DEFAULT_CHAPTER_NUMBER,
      // Only used when the page has no language in its path to inherit — the
      // shared translation's own language beats defaulting to English.
      fallbackLanguage:
        uiLocaleForDefaultTranslation(translationId) ??
        bibleLanguageToUiLocale(translation.language) ??
        undefined,
    });
    navigator.clipboard.writeText(url.href);

    app.toast(
      t("copied-translation-share-link", {
        defaultValue: "Copied translation share link",
      })
    );
  };

  return (
    <>
      <OfflineTranslationControls
        translation={translation}
        offline={bibleDataManager.offline}
        bibleSelectorState={bibleSelectorState}
        app={app}
        tourStepId={tourStepId}
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          shareTranslatation({ translation });
        }}
        class="share-btn flex-center"
      >
        <ShareIcon height={18} width={22} />
      </button>
    </>
  );
};

const CustomTranslation = (props: {
  bibleSelectorState: BibleSelectorState;
}) => {
  const { bibleSelectorState } = props;
  const { inputValue, handleTranslationAddition } = bibleSelectorState;
  const { t } = useI18n();
  return (
    <div class="custom-translation-container flex-col-gap-md">
      <div class="custom-tr-api flex-col-gap-md">
        <div class="custom-tr-in-con flex-start-center-gap-sm">
          <input
            value={inputValue.value}
            onChange={(e) => {
              inputValue.value = (e.target as HTMLInputElement).value;
            }}
            class="custom-tr-in"
            placeholder={t("enter-url", { defaultValue: "Enter URL" })}
          />
          <button
            onClick={() => handleTranslationAddition()}
            class="import-btn"
          >
            {t("import", { defaultValue: "Import" })}
          </button>
        </div>
      </div>
    </div>
  );
};

const TranslationSettings = (props: {
  bibleSelectorState: BibleSelectorState;
}) => {
  const { bibleSelectorState } = props;
  const { showAllLanguages, showTranslationSettings } = bibleSelectorState;
  return (
    <div className="modal translationSettingsModal">
      <TranslationViewModeMenu
        viewMode={showAllLanguages.value}
        onChange={(mode) => {
          showAllLanguages.value = mode;
          showTranslationSettings.value = false;
        }}
      />
    </div>
  );
};

const TranslationInfo = (props: {
  translation: Translation;
  position: { x: number; y: number };
  isMobile: boolean;
}) => {
  const { translation, position, isMobile } = props;
  const [textArray, setTextArray] = useState<string[]>([]);

  useEffect(() => {
    if (translation?.licenseNotice) {
      const regex = /(https?:\/\/[^\s]+|\n)/g;
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const parts = translation.licenseNotice.split(regex);
      const formattedParts: string[] = [];
      for (const part of parts) {
        if (part !== "\n" && part.trim() !== "") {
          if (urlRegex.test(part)) {
            formattedParts.push(
              `<a href="${part}" target="_blank" style="color: var(--sb-primary-color)">${part}</a>`
            );
          } else {
            formattedParts.push(part);
          }
        }
      }
      setTextArray(formattedParts);
    }
  }, [translation]);

  return (
    <div
      style={
        !isMobile
          ? {
              top: `calc(${position.y}px - 35px - 10dvh)`,
              left: `calc(${position.x}px - (50dvw - 565px))`,
            }
          : {
              top: `calc(${position.y}px)`,
              left: `calc(${position.x}px - 16.5625rem)`,
            }
      }
      className="modal translationInfoModal"
    >
      {textArray.map((part: string, index: number) => (
        <span
          style={{ display: "block" }}
          key={index}
          dangerouslySetInnerHTML={{ __html: part }}
        ></span>
      ))}
    </div>
  );
};

const ApocryphaInfo = (props: { bibleSelectorState: BibleSelectorState }) => {
  const { showApocryphaInfo } = props.bibleSelectorState;
  const { t } = useI18n();

  return (
    <div
      id="apocrypha-info"
      class="sb-select-modal-overlay"
      onClick={(e) => {
        if ((e.target as HTMLElement).id === "apocrypha-info") {
          showApocryphaInfo.value = false;
        }
      }}
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        className="sb-select-modal flex-center"
        style={{ position: "relative", width: "90%", borderRadius: "0.625rem" }}
      >
        <div
          class="flex-between-center-gap-md"
          style={{ width: "100%", marginBottom: "0.9375rem" }}
        >
          <span class="sb-mobile-settings-sheet-title">
            {t("about-extrabiblical-writings", {
              defaultValue: "About Extrabiblical writings",
            })}
          </span>
          <span
            class="material-symbols-outlined"
            onClick={() => {
              showApocryphaInfo.value = false;
            }}
          >
            close
          </span>
        </div>
        <span>
          {t("apocrypha-info-text", {
            defaultValue:
              "None of the writings in this section were ever considered Scripture by early Jewish or Christian communities. The Bible is a specific collection of books. Jews and Christians have always agreed on the Old Testament, which comes from a fixed set of sacred writings the Jewish people called the Tanakh and Christians call the Old Testament. The content of the Tanakh and the Old Testament are exactly the same, but are commonly arranged differently. Christians additionally recognize the New Testament, which tells the story of Jesus, his teachings, and the writings of his followers. The writings below were known and widely read at the time the Bible was written, but they were never treated as Scripture. While ancient authors sometimes quoted a wide range of texts including poets, philosophers, and other writings, quoting something is not the same as treating it as Scripture. These writings are included here for historical and literary reference only.",
          })}
        </span>
      </div>
    </div>
  );
};

export function useLongPress(onLongPress: () => void, duration = 1500) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const start = useCallback(
    (e: MouseEvent | TouchEvent) => {
      timerRef.current = setTimeout(() => {
        e.preventDefault();
        onLongPress();
      }, duration);
    },
    [onLongPress, duration]
  );

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchMove: cancel,
    onTouchEnd: cancel,
    onTouchCancel: cancel,
    cancel,
  };
}

export default SearchBar;
