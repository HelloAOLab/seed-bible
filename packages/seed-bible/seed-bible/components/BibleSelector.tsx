import {
  type BibleSelectorBookItem,
  type BibleSelectorPsalmsGroups,
  type BibleSelectorState,
  type TranslationLanguageGroup,
} from "seed-bible.managers.BibleSelectorManager";
import { useI18n } from "seed-bible.i18n.I18nManager";
import {
  TickIcon,
  FiltersIcon,
  SelectedIcon,
  AddIcon,
  MinusIcon,
  ShareIcon,
  SbTabsIcon,
} from "seed-bible.components.icons";
import type { Translation } from "seed-bible.managers.FreeUseBibleAPI";
import { computed, signal } from "@preact/signals";
import type { BibleDataManager } from "seed-bible.managers.BibleDataManager";
import type { TutorialManager } from "seed-bible.managers.TutorialManager";
const { useEffect, useMemo, useRef, useState, useCallback } = os.appHooks;

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
  borderRadius: "8px",
  boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
} as const;

interface BibleSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectorState: BibleSelectorState;
  bibleDataManager: BibleDataManager;
  className?: string;
  tutorial?: TutorialManager;
}

export function BibleSelector(props: BibleSelectorProps) {
  const {
    isOpen,
    onClose,
    selectorState,
    bibleDataManager,
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

  return (
    <>
      <div
        onClick={onClose}
        className={`sb-selector-overlay ${isOpen ? "open" : ""}${
          className ? ` ${className}` : ""
        }`}
        dir={isRtl ? "rtl" : "ltr"}
        // Dim the app behind the panel only while a selector tour step is up.
        style={tourStepId ? { background: "rgba(0,0,0,0.6)" } : undefined}
      >
        <div
          onClick={(event: Event) => {
            event.stopPropagation();
          }}
          className="sb-selector-panel"
        >
          <SearchBar
            bibleSelectorState={selectorState}
            bibleDataManager={bibleDataManager}
            tourStepId={tourStepId}
          />
        </div>
      </div>

      {tourStep && (
        <div
          className={`sb-tour-popover${className ? ` ${className}` : ""}`}
          style={{
            position: "fixed",
            bottom: "28px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: "458px",
            boxSizing: "border-box",
            zIndex: 10000,
          }}
          onClick={(event: MouseEvent) => event.stopPropagation()}
        >
          <h3 className="sb-tour-popover-title">
            {t(tourStep.titleKey, { defaultValue: tourStep.titleDefault })}
          </h3>
          <p className="sb-tour-popover-body">
            {t(tourStep.bodyKey, { defaultValue: tourStep.bodyDefault })}
          </p>
          <div className="sb-tour-popover-actions">
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
  bibleSelectorState: BibleSelectorState;
  bibleDataManager: BibleDataManager;
  /** Active selector-group tour step id, or null when no step is active. */
  tourStepId?: string | null;
}) => {
  const { bibleSelectorState, bibleDataManager, tourStepId } = props;
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
  const viewportWidth = bibleSelectorState.viewportWidth;
  const selectedTestamentData = bibleSelectorState.selectedTestamentData;
  const handleEnter = bibleSelectorState.handleEnter;
  const setOpen = bibleSelectorState.setOpen;

  return (
    <>
      {(!selectingTranslation.value || viewportWidth.value > 768) && (
        <div class="testament-selection starterAnimation">
          {viewportWidth.value > 768 && (
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
                    {viewportWidth.value > 750
                      ? t("old-testament", { defaultValue: "Old Testament" })
                      : t("old-testament_short", { defaultValue: "OT" })}
                  </option>
                  <option value={1} class="dropdown-option">
                    {viewportWidth.value > 750
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
          {viewportWidth.value <= 768 && (
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
        {(!selectingTranslation.value || viewportWidth.value > 768) &&
          selectedTranslationBooks.value?.books &&
          selectedTestamentData.value &&
          selectedTranslation.value && (
            <SideBarBooks bibleSelectorState={bibleSelectorState} />
          )}
        {selectingTranslation.value && (
          <TranslationModal
            bibleSelectorState={bibleSelectorState}
            bibleDataManager={bibleDataManager}
          />
        )}
      </div>
      {showApocryphaInfo.value && (
        <ApocryphaInfo bibleSelectorState={bibleSelectorState} />
      )}
    </>
  );
};

const SideBarBooks = (props: { bibleSelectorState: BibleSelectorState }) => {
  const { bibleSelectorState } = props;

  const { t } = useI18n();

  const {
    viewportWidth,
    lastBookClicked,
    bookData,
    chT,
    localSelectedTestament,
    groupedBooks,
    handleChapterClick: handleClick,
    calcChapterPos,
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

    let allowedRows = 5;
    if (ws <= 768) {
      allowedRows = 1;
    } else if (ws < 1200) {
      allowedRows = 3;
    } else {
      allowedRows = 5;
    }

    const { oldTestament, newTestament, apocrypha } = groupedBooks.value;

    // Renders a single book entry: the clickable item (or ghost placeholder) plus
    // the inline chapter-panel when this row is the active expansion point.
    const renderBook = (
      book: BibleSelectorBookItem,
      index: number,
      chapterPos: number,
      separator: number,
      chapterHint?: number,
      itemStyle?: object,
      narrowChapterStyle?: boolean
    ) => {
      const isSelected = isBook(book) && index === lbc && bd?.id === book.id;
      return (
        <>
          {isBook(book) ? (
            <div
              class={`sidebar-itm flex-between-center ${isSelected ? "sidebar-selected-itm" : ""}`}
              tabIndex={index + 1}
              onClick={() =>
                handleClick({
                  index,
                  book,
                  ...(chapterHint !== undefined ? { cht: chapterHint } : {}),
                })
              }
              id={`booktab-${book.id}`}
            >
              <span
                style={{
                  display: "flex",
                  gap: "3px",
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
            <div class="sidebar-ghost-itm" tabIndex={index + 1} />
          )}
          {chapterPos === index &&
            bd &&
            (chapterHint === undefined || cht === chapterHint) && (
              <div
                class="sidebar-chapters show-sidebar-chapter"
                style={{
                  justifyContent:
                    ws <= 768 || bd.numberOfChapters < 4 * separator
                      ? "flex-start"
                      : "space-between",
                }}
              >
                {narrowChapterStyle && allowedRows === 3 && (
                  <style>{`.show-sidebar-chapter{width: calc(100% - 5px);}`}</style>
                )}
                <SideBarChapters bibleSelectorState={bibleSelectorState} />
              </div>
            )}
        </>
      );
    };

    if (lst === 2) {
      const OTSep = allowedRows === 1 ? 1 : allowedRows === 3 ? 2 : 3;
      const NTSep = allowedRows === 1 ? 1 : allowedRows === 3 ? 1 : 2;
      const OTChapterPos = calcChapterPos(lbc, OTSep);
      const NTChapterPos = calcChapterPos(lbc, NTSep);
      const OTBooks = ghostArray(oldTestament, OTSep);
      const NTBooks = ghostArray(newTestament, NTSep);
      const APBooks = ghostArray(apocrypha, NTSep);
      return (
        <div
          class="books-container flex-gap-md"
          dir={
            bibleSelectorState.selectedTranslation.value?.textDirection ?? "ltr"
          }
        >
          <div
            class="testament-container flex-col-gap-sm"
            style={{
              width: `${allowedRows === 5 ? 60 : allowedRows === 3 ? 66.66 : 100}%`,
            }}
          >
            <span class="testament-title">
              {t("old-testament", { defaultValue: "Old Testament" })}
            </span>
            <div class="books-item flex-row-wrap-around">
              {OTBooks.map((book: BibleSelectorBookItem, index: number) =>
                renderBook(book, index, OTChapterPos, OTSep, 0, {
                  textTransform: "capitalize",
                })
              )}
            </div>
          </div>
          <div className="separator" />
          <div
            class="testament-container flex-col-gap-sm"
            style={{
              width: `${allowedRows === 5 ? 40 : allowedRows === 3 ? 33.33 : 100}%`,
            }}
          >
            <span class="testament-title">
              {t("new-testament", { defaultValue: "New Testament" })}
            </span>
            <div class="books-item flex-row-wrap-around">
              {NTBooks.map((book: BibleSelectorBookItem, index: number) =>
                renderBook(book, index, NTChapterPos, NTSep, 1, undefined, true)
              )}
            </div>
          </div>
          {ws <= 768 && apocryphaAvailable.value && (
            <>
              <div className="separator" style={{ display: "flex" }} />
              <div
                class="testament-container flex-col-gap-sm"
                style={{
                  width: `100%`,
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
                <div class="books-item flex-row-wrap-around">
                  {APBooks.map((book: BibleSelectorBookItem, index: number) =>
                    renderBook(
                      book,
                      index,
                      NTChapterPos,
                      NTSep,
                      1,
                      undefined,
                      true
                    )
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      );
    }

    // Single-testament views (OT=0, NT=1, Apocrypha=3)
    const singleTestamentConfig: Record<
      number,
      {
        books: ReturnType<typeof ghostArray>;
        title: string;
        alwaysShowTitle: boolean;
      }
    > = {
      0: {
        books: ghostArray(oldTestament, allowedRows),
        title: t("old-testament", { defaultValue: "Old Testament" }),
        alwaysShowTitle: false,
      },
      1: {
        books: ghostArray(newTestament, allowedRows),
        title: t("new-testament", { defaultValue: "New Testament" }),
        alwaysShowTitle: false,
      },
      3: {
        books: ghostArray(apocrypha, allowedRows),
        title: t("apocrypha", { defaultValue: "Apocrypha" }),
        alwaysShowTitle: true,
      },
    };

    const config = singleTestamentConfig[lst];
    if (!config) return null;

    const chapterPos = calcChapterPos(lbc, allowedRows);
    return (
      <div
        class="books-container flex-gap-md"
        dir={
          bibleSelectorState.selectedTranslation.value?.textDirection ?? "ltr"
        }
      >
        <div class="testament-container flex-col-gap-sm">
          {(config.alwaysShowTitle || ws > 768) && (
            <span class="testament-title">{config.title}</span>
          )}
          <div class="books-item flex-row-wrap-around">
            {config.books.map((book: BibleSelectorBookItem, index: number) =>
              renderBook(book, index, chapterPos, allowedRows)
            )}
          </div>
        </div>
      </div>
    );
  });

  return <>{RenderBooksByTestament}</>;
};

const SideBarChapters = (props: { bibleSelectorState: BibleSelectorState }) => {
  const { bibleSelectorState } = props;

  const { t } = useI18n();

  const {
    bookData,
    highLightedButtonsID,
    currentPsalms,
    selectChapter,
    isOpen,
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
      const chapterPressHandler = useLongPress(() => {
        if (bibleSelectorState.viewportWidth.value > 768) return;
        bibleSelectorState.forceNewTab.value = true;
        selectChapter(bd.id, chapterNumber);
        bibleSelectorState.forceNewTab.value = false;
        bibleSelectorState.isOpen.value = false;
      }, 1000);
      return (
        <button
          style={
            isVisible === undefined
              ? undefined
              : { display: isVisible ? "flex" : "none" }
          }
          class={`chapter-btn flex-center ${isLast ? "lastOne" : ""}`}
          onClick={() => {
            selectChapter(bd.id, chapterNumber);
            isOpen.value = false;
          }}
          {...chapterPressHandler}
        >
          <span
            className={`sidebar-chapter-itm ${hlb[chapterNumber] ? "highlight" : "un-highlight"}`}
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

const LANGUAGE_VIEW_MODES = {
  COMPLETE: "complete",
  POPULAR: "popular",
  ALL: "all",
} as const;

// Component for empty state with option to expand search
const EmptyStateWithExpand = (props: {
  onExpand: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) => {
  const { onExpand, t } = props;
  return (
    <div className="language-list sb-lg-centered">
      <span>
        {t("no-translation-results-found", {
          defaultValue:
            "No results found. Would you like to expand your search to include partial and incomplete translations as well?",
        })}
      </span>
      <button onClick={onExpand} className="sb-lg-expandButton">
        {t("show-all-translations", { defaultValue: "Show all translations" })}
      </button>
    </div>
  );
};

// Component for empty state with no results
const EmptyStateNoResults = (props: {
  t: (key: string, options?: Record<string, unknown>) => string;
}) => {
  const { t } = props;
  return (
    <div className="language-list">
      <span>
        {t("no-results-found", { defaultValue: "No results found." })}
      </span>
    </div>
  );
};

// Component for load more button
const LoadMoreButton = (props: { onLoadMore: () => void }) => {
  const { onLoadMore } = props;
  return (
    <div
      className="item flex-between sb-lg-loadMoreButton"
      onClick={onLoadMore}
    >
      <span className="material-symbols-outlined sb-lg-expandIcon">
        expand_more
      </span>
    </div>
  );
};

const TranslationModal = (props: {
  bibleSelectorState: BibleSelectorState;
  bibleDataManager: BibleDataManager;
}) => {
  const { bibleSelectorState, bibleDataManager } = props;
  const {
    languageQuery,
    selectingTranslation,
    showCustomTranslation,
    allowedTranslationLimit,
    apiTranslations,
    viewportWidth,
    showAllLanguages,
    showTranslationSettings,
    showTranslationInfo,
    filteredApiTranslations,
    setOpen,
  } = bibleSelectorState;

  const { t } = useI18n();

  // Helper function to check if should show expand button
  const shouldShowExpandButton = (
    viewMode: string,
    hasResults: boolean
  ): boolean => {
    return (
      !hasResults &&
      (viewMode === LANGUAGE_VIEW_MODES.COMPLETE ||
        viewMode === LANGUAGE_VIEW_MODES.POPULAR)
    );
  };

  // Helper function to check if should show load more button
  const shouldShowLoadMoreButton = (
    filteredCount: number,
    allowedLimit: number,
    totalCount: number
  ): boolean => {
    return allowedLimit < totalCount && filteredCount >= 50;
  };

  const LanguageList = computed(() => {
    const filteredTranslations = filteredApiTranslations.value;
    const currentViewMode = showAllLanguages.value;
    const hasResults = filteredTranslations.length > 0;

    // Show expand button state
    if (shouldShowExpandButton(currentViewMode, hasResults)) {
      return (
        <EmptyStateWithExpand
          onExpand={() => {
            showAllLanguages.value = LANGUAGE_VIEW_MODES.ALL;
          }}
          t={t}
        />
      );
    }

    // Show no results state
    if (!hasResults && currentViewMode === LANGUAGE_VIEW_MODES.ALL) {
      return <EmptyStateNoResults t={t} />;
    }

    // Show language list
    return (
      <div
        className="language-list"
        onScroll={() => {
          showTranslationInfo.value = null;
          showTranslationSettings.value = false;
        }}
      >
        {filteredTranslations.map((languageGroup) => (
          <LanguageComponent
            languageGroup={languageGroup}
            bibleSelectorState={bibleSelectorState}
            bibleDataManager={bibleDataManager}
          />
        ))}
        {shouldShowLoadMoreButton(
          filteredTranslations.length,
          allowedTranslationLimit.value,
          apiTranslations.value.length
        ) && (
          <LoadMoreButton
            onLoadMore={() => {
              allowedTranslationLimit.value =
                allowedTranslationLimit.value + 50;
            }}
          />
        )}
      </div>
    );
  });
  return (
    <>
      <div
        className="modal-overlay flex-center"
        onClick={() => {
          selectingTranslation.value = false;
          showTranslationSettings.value = false;
          showTranslationInfo.value = null;
        }}
      >
        <div
          className="modal"
          onClick={(e) => {
            e.stopPropagation();
            showTranslationSettings.value = false;
            showTranslationInfo.value = null;
          }}
        >
          <div
            class="sidebar-book-selector flex-between-center-gap-md"
            style={{ padding: "15px 5px" }}
          >
            {viewportWidth.value <= 768 && (
              <span
                class="material-symbols-outlined"
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
              style={{ width: "100%", height: "30px" }}
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
            {viewportWidth.value > 768 && (
              <span
                class="material-symbols-outlined"
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
          viewportWidth={viewportWidth.value}
        />
      )}
    </>
  );
};

const LanguageComponent = (props: {
  languageGroup: TranslationLanguageGroup;
  bibleSelectorState: BibleSelectorState;
  bibleDataManager: BibleDataManager;
}) => {
  const { languageGroup, bibleSelectorState, bibleDataManager } = props;
  const {
    language,
    languageName: nativeLanguageName,
    languageEnglishName,
    translations,
  } = languageGroup;
  const {
    languageQuery,
    selectedTranslation,
    showAllLanguages,
    showTranslationInfo,
    filteredApiTranslations,
    selectTranslation,
  } = bibleSelectorState;
  const showRef = useRef<ReturnType<typeof signal<boolean>> | null>(null);
  if (!showRef.current) showRef.current = signal(false);
  const showSig = showRef.current;
  const { t } = useI18n();

  const shareTranslatation = async (props: { translation: Translation }) => {
    const { translation } = props;
    const url = new URL(`https://ao.bot/`);
    url.searchParams.set("pattern", configBot.tags.pattern || "SeedBible");
    url.searchParams.set(
      "translation",
      bibleDataManager.buildTranslationId(translation.id)
    );
    os.setClipboard(url.href);
    os.toast(
      t("copied-translation-share-link", {
        defaultValue: "Copied translation share link",
      })
    );
  };

  const sortedTranslations = useMemo(() => {
    if (!showSig.value) {
      return [];
    }
    return [...translations].sort((a, b) => {
      if (a.id === selectedTranslation?.value?.id) return -1;
      if (b.id === selectedTranslation?.value?.id) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [translations, selectedTranslation.value, showSig.value]);

  useEffect(() => {
    const selectedLanguageCode = selectedTranslation?.value?.language;

    if (languageQuery.value.length > 0) {
      showSig.value = true;
    } else if (filteredApiTranslations.value.length === 1) {
      showSig.value = true;
    } else if (selectedLanguageCode === language.toLowerCase()) {
      showSig.value = true;
    } else {
      showSig.value = false;
    }
  }, [
    languageQuery.value,
    selectedTranslation.value,
    filteredApiTranslations.value,
    language,
  ]);

  return (
    <>
      <div
        key={language}
        className="item flex-between"
        onClick={() => {
          showSig.value = !showSig.value;
        }}
        style={{
          backgroundColor: showSig.value ? "" : "var(--sb-background)",
          marginBottom: showSig.value ? "0px" : "10px",
          gap: "8px",
        }}
      >
        <span style={{ textTransform: "capitalize", flex: "1 1 auto" }}>
          {nativeLanguageName}
        </span>
        {language !== "eng" &&
          nativeLanguageName !== languageEnglishName &&
          languageEnglishName && (
            <span className="sb-language-english-name">
              ({languageEnglishName})
            </span>
          )}
        <span
          style={{
            transition: "transform 0.3s",
          }}
          class={`material-symbols-outlined ${showSig.value ? "upside-down" : ""}`}
          // eslint-disable-next-line seed-bible-i18n/i18n-untranslated-content
        >
          expand_more
        </span>
      </div>
      {showSig.value && (
        <>
          <div style={{ margin: "5px 5px" }}>
            {sortedTranslations.map((value) => {
              const completionPercentage = Math.ceil(
                (value.numberOfBooks / 66) * 100
              );
              const rotation = (completionPercentage / 100) * 360;
              return (
                <div
                  onClick={async () => {
                    selectTranslation(value.id);
                  }}
                  style={{
                    background:
                      selectedTranslation?.value?.id === value.id
                        ? "color-mix(in srgb, var(--pageBookBackground) 50%, transparent)"
                        : "var(--sb-background)",
                  }}
                  class="translation-option flex-between-center-gap-md"
                >
                  <span class="translation-title inline-flex-start-center-gap-sm">
                    {selectedTranslation?.value?.id === value.id ? (
                      <TickIcon height={15} width={15} />
                    ) : showAllLanguages.value === "all" ||
                      showAllLanguages.value === "popular" ? (
                      <span
                        class="emptyCircle"
                        style={{
                          background: `linear-gradient(white, white) padding-box, conic-gradient(from -${rotation}deg, var(--sb-primary-color) ${completionPercentage}%, #eee 0) border-box`,
                        }}
                      ></span>
                    ) : (
                      <span class="emptyCircle"></span>
                    )}
                    <span class="translation-description">{`${value.name} (${value.shortName})`}</span>
                    {value?.licenseNotice && (
                      <span
                        style={{ display: "flex" }}
                        onClick={(e: MouseEvent) => {
                          e.stopPropagation();
                          console.log(value, "showTranslationInfo");
                          if (showTranslationInfo.value) {
                            if (
                              showTranslationInfo.value.translation.id ===
                              value.id
                            ) {
                              showTranslationInfo.value = null;
                              return;
                            } else {
                              showTranslationInfo.value = {
                                translation: value,
                                position: { x: e.clientX, y: e.clientY },
                              };
                              return;
                            }
                          }
                          showTranslationInfo.value = {
                            translation: value,
                            position: { x: e.clientX, y: e.clientY },
                          };
                        }}
                        title={t("information-about-this-translation", {
                          defaultValue: "Information about this translation",
                        })}
                      >
                        <span
                          style={{ fontSize: "18px" }}
                          class="material-symbols-outlined"
                        >
                          info
                        </span>
                      </span>
                    )}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      shareTranslatation({ translation: value });
                    }}
                    class="share-btn flex-center"
                  >
                    <ShareIcon height={18} width={22} />
                  </button>
                </div>
              );
            })}
            <div class="language-separator" style={{ width: "100%" }}></div>
          </div>
        </>
      )}
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
  const { t } = useI18n();
  return (
    <div className="modal translationSettingsModal">
      <div
        class="translation-option flex-between-center-gap-md"
        onClick={() => {
          showAllLanguages.value = "complete";
          showTranslationSettings.value = false;
        }}
      >
        <span
          class="translation-title inline-flex-start-center-gap-sm"
          style={{
            color:
              showAllLanguages.value === "complete"
                ? "var(--addButtonIcon)"
                : "var(--text3)",
          }}
        >
          {showAllLanguages.value === "complete" ? (
            <SelectedIcon height={17} width={17} />
          ) : (
            <span
              class="emptyCircle"
              style={{ border: "1px solid #ccc" }}
            ></span>
          )}
          <span class="translation-description">
            {t("complete-translations", {
              defaultValue: "Complete translations",
            })}
          </span>
        </span>
      </div>
      <div
        class="translation-option flex-between-center-gap-md"
        onClick={() => {
          showAllLanguages.value = "all";
          showTranslationSettings.value = false;
        }}
      >
        <span
          class="translation-title inline-flex-start-center-gap-sm"
          style={{
            color:
              showAllLanguages.value === "all"
                ? "var(--addButtonIcon)"
                : "var(--text3)",
          }}
        >
          {showAllLanguages.value === "all" ? (
            <SelectedIcon height={17} width={17} />
          ) : (
            <span
              class="emptyCircle"
              style={{ border: "1px solid #ccc" }}
            ></span>
          )}
          <span class="translation-description">
            {t("all-translations", { defaultValue: "All translations" })}
          </span>
        </span>
      </div>
      <div
        class="translation-option flex-between-center-gap-md"
        onClick={() => {
          showAllLanguages.value = "popular";
          showTranslationSettings.value = false;
        }}
      >
        <span
          class="translation-title inline-flex-start-center-gap-sm"
          style={{
            color:
              showAllLanguages.value === "popular"
                ? "var(--addButtonIcon)"
                : "var(--text3)",
          }}
        >
          {showAllLanguages.value === "popular" ? (
            <SelectedIcon height={17} width={17} />
          ) : (
            <span
              class="emptyCircle"
              style={{ border: "1px solid #ccc" }}
            ></span>
          )}
          <span class="translation-description">
            {t("popular-translations", {
              defaultValue: "Popular translations",
            })}
          </span>
        </span>
      </div>
    </div>
  );
};

const TranslationInfo = (props: {
  translation: Translation;
  position: { x: number; y: number };
  viewportWidth: number;
}) => {
  const { translation, position, viewportWidth } = props;
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
        viewportWidth > 768
          ? {
              top: `calc(${position.y}px - 35px - 10dvh)`,
              left: `calc(${position.x}px - (50dvw - 565px))`,
            }
          : {
              top: `calc(${position.y}px)`,
              left: `calc(${position.x}px - 265px)`,
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
        style={{ position: "relative", width: "90%", borderRadius: "10px" }}
      >
        <div
          class="flex-between-center-gap-md"
          style={{ width: "100%", marginBottom: "15px" }}
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
      e.preventDefault();
      timerRef.current = setTimeout(onLongPress, duration);
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
  };
}

export default SearchBar;
