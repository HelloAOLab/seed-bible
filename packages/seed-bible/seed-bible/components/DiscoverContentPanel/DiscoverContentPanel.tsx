import "./DiscoverContentPanel.css";
import { Signal, useSignal } from "@preact/signals";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { ReaderTab } from "../../managers/TabsManager";
import { hasAnyDiscoverResults } from "../../managers/BibleReadingManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import {
  CrossReferencesSection,
  StudyNotesSection,
  ContentSection,
  ContentTypeSection,
  contentTypeResultsFor,
  hasRegisteredContentType,
} from "../DiscoverPane/DiscoveredResultsSections";
import { AnnotationsSection } from "../DiscoverPane/AnnotationsSection";
import { DiscoverEmpty } from "../DiscoverPane/DiscoverSection";
import { MaterialIcon } from "../icons";
import { translateTitle } from "../../app/utils";
import {
  getReadingPlansForChapter,
  ReadingPlansSection,
} from "../ReadingPlansSection/ReadingPlansSection";
import {
  findScrollContainer,
  readBottomChromeInset,
} from "../BibleReader/readerViewport";

type FilterKey =
  | "all"
  | "annotations"
  | "cross-references"
  | "study-notes"
  | "content"
  | `type:${string}`;

/**
 * Keeps the panel from shrinking into an unusable sliver in very short
 * windows, even if that means its bottom edge dips under the toolbar.
 */
const MIN_SIDE_PANEL_HEIGHT_PX = 192;

/**
 * Publishes `--sb-dcp-side-max-height` on the panel: the height of the part of
 * its pane that's actually on screen, below the panel's sticky `top` and above
 * the fixed bottom toolbar. A plain `100vh` cap ignores the tab bar above the
 * pane, the toolbar floating over its bottom and split-pane layouts, so the
 * bottom of a long panel (and its last items) ended up out of reach.
 */
function useSidePanelMaxHeight() {
  const cleanupRef = useRef<(() => void) | null>(null);

  return useCallback((panel: HTMLElement | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (!panel || typeof ResizeObserver === "undefined") return;

    const scroller = findScrollContainer(panel);
    let frame = 0;

    const measure = () => {
      const viewportBottom = window.innerHeight - readBottomChromeInset();
      const rect = scroller?.getBoundingClientRect();
      const top = rect ? Math.max(rect.top, 0) : 0;
      const bottom = rect
        ? Math.min(rect.bottom, viewportBottom)
        : viewportBottom;
      const stickyTop = parseFloat(getComputedStyle(panel).top) || 0;
      const available = Math.max(
        bottom - top - stickyTop,
        MIN_SIDE_PANEL_HEIGHT_PX
      );
      panel.style.setProperty(
        "--sb-dcp-side-max-height",
        `${Math.floor(available)}px`
      );
    };

    const scheduleMeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    if (scroller) resizeObserver.observe(scroller);
    // BibleReaderToolbar rewrites `--sb-reader-bottom-inset` inline on the
    // root whenever the bottom chrome changes size.
    const insetObserver =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(scheduleMeasure)
        : null;
    insetObserver?.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style"],
    });
    window.addEventListener("resize", scheduleMeasure);
    scheduleMeasure();

    cleanupRef.current = () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      insetObserver?.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, []);
}
interface DiscoverFiltersProps {
  filters: { key: FilterKey; label: string }[];
  activeFilter: Signal<FilterKey>;
  displayFilter: FilterKey;
}

interface DiscoverContentPanelProps {
  tab: ReaderTab | null;
  state: SeedBibleState;
}
/**
 * Renders the filters for discover content and provides horizontal
 * scrolling controls when the filters do not fit within the available width.
 *
 * On smaller/coarse-pointer devices, the filters can be scrolled normally.
 * The active filter is controlled through the provided signal.
 */
function DiscoverFilters({
  filters,
  activeFilter,
  displayFilter,
}: DiscoverFiltersProps) {
  const { t } = useI18n();
  const filtersRef = useRef<HTMLDivElement>(null);

  const [hasScrollableFilters, setHasScrollableFilters] = useState(false);

  const [canScrollLeft, setCanScrollLeft] = useState(false);

  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const container = filtersRef.current;

    if (!container) {
      setHasScrollableFilters(false);
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const wrapper = container.parentElement;

    if (!wrapper) {
      setHasScrollableFilters(false);
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    // Compare against the full wrapper width so the arrows
    const hasOverflow = container.scrollWidth > wrapper.clientWidth + 1;

    setHasScrollableFilters(hasOverflow);

    if (!hasOverflow) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const pills = Array.from(
      container.querySelectorAll<HTMLElement>(".sb-dcp-chip")
    );

    if (pills.length === 0) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const firstPill = pills[0];
    const lastPill = pills[pills.length - 1];

    if (!firstPill || !lastPill) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const containerRect = container.getBoundingClientRect();

    const firstPillRect = firstPill.getBoundingClientRect();

    const lastPillRect = lastPill.getBoundingClientRect();

    // Enable left arrow when the first pill is partially hidden.
    setCanScrollLeft(firstPillRect.left < containerRect.left - 1);

    // Keep right arrow enabled until the last pill
    // is completely visible.
    setCanScrollRight(lastPillRect.right > containerRect.right + 1);
  }, []);

  const scrollFilters = useCallback((direction: -1 | 1) => {
    const container = filtersRef.current;

    if (!container) return;

    const pills = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".sb-dcp-chip")
    );

    const containerRect = container.getBoundingClientRect();

    let targetPill: HTMLButtonElement | undefined;

    if (direction === 1) {
      // Find the next pill hidden on the right.
      targetPill = pills.find((pill) => {
        const rect = pill.getBoundingClientRect();

        return rect.right > containerRect.right + 1;
      });
    } else {
      // Find the previous pill hidden on the left.
      for (let i = pills.length - 1; i >= 0; i -= 1) {
        const pill = pills[i];

        if (!pill) continue;

        const rect = pill.getBoundingClientRect();

        if (rect.left < containerRect.left - 1) {
          targetPill = pill;
          break;
        }
      }
    }

    if (!targetPill) {
      return;
    }

    const targetRect = targetPill.getBoundingClientRect();

    const scrollAmount =
      direction === 1
        ? targetRect.right - containerRect.right
        : targetRect.left - containerRect.left;

    container.scrollBy({
      left: scrollAmount,
    });
  }, []);

  useEffect(() => {
    const container = filtersRef.current;

    if (!container) return;

    updateScrollState();

    container.addEventListener("scroll", updateScrollState);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updateScrollState)
        : null;

    if (resizeObserver) {
      resizeObserver.observe(container);

      const wrapper = container.parentElement;

      if (wrapper) {
        resizeObserver.observe(wrapper);
      }

      container
        .querySelectorAll<HTMLElement>(".sb-dcp-chip")
        .forEach((chip) => {
          resizeObserver.observe(chip);
        });
    }

    return () => {
      container.removeEventListener("scroll", updateScrollState);

      resizeObserver?.disconnect();
    };
  }, [filters.length, updateScrollState]);

  return (
    <div
      className={`sb-dcp-filters-wrapper${
        hasScrollableFilters ? " sb-dcp-filters-wrapper--scrollable" : ""
      }`}
    >
      {hasScrollableFilters && (
        <button
          type="button"
          className="sb-dcp-filters-arrow"
          onClick={() => scrollFilters(-1)}
          disabled={!canScrollLeft}
          aria-label={t("scroll-filters-left", {
            defaultValue: "Scroll filters left",
          })}
        >
          <MaterialIcon aria-hidden="true">chevron_left</MaterialIcon>
        </button>
      )}

      <div className="sb-dcp-filters" role="tablist" ref={filtersRef}>
        {filters.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={displayFilter === key}
            className={`sb-dcp-chip${
              displayFilter === key ? " sb-dcp-chip--active" : ""
            }`}
            onClick={() => {
              activeFilter.value = key;
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {hasScrollableFilters && (
        <button
          type="button"
          className="sb-dcp-filters-arrow"
          onClick={() => scrollFilters(1)}
          disabled={!canScrollRight}
          aria-label={t("scroll-filters-right", {
            defaultValue: "Scroll filters right",
          })}
        >
          <MaterialIcon aria-hidden="true">chevron_right</MaterialIcon>
        </button>
      )}
    </div>
  );
}
/**
 * Automatically-visible discover content — the reader's own notes
 * (annotations) plus discovered cross references/study notes/content — for
 * one reading tab. Rendered once per visible tab. Hides itself entirely when
 * there's no tab or there's nothing to show for the chapter, and omits the
 * notes section when the chapter has no notes and nothing waiting to sync.
 * Otherwise it always renders —
 * the "discover-content-panel" quick tool only controls whether the caller
 * places it beside the scripture text or below it (see BibleReader).
 */
export function DiscoverContentPanel(props: DiscoverContentPanelProps) {
  const { tab, state } = props;

  const { t } = useI18n();

  const activeFilter = useSignal<FilterKey>("all");

  const panelRef = useSidePanelMaxHeight();

  if (!tab) {
    return null;
  }

  const bookId = tab.readingState.bookId.value;

  const chapterNumber = tab.readingState.chapterNumber.value;

  const hasAnnotations = Boolean(
    bookId &&
    chapterNumber &&
    state.annotations.getAnnotationsForChapter(bookId, chapterNumber).value
      .length > 0
  );

  const pendingAnnotationChanges =
    bookId && chapterNumber
      ? state.annotations.pendingCountForChapter(bookId, chapterNumber)
      : 0;
  const showAnnotations = hasAnnotations || pendingAnnotationChanges > 0;

  const plans = getReadingPlansForChapter(state, tab.readingState);

  if (
    !showAnnotations &&
    !hasAnyDiscoverResults(tab.readingState) &&
    plans.length === 0
  ) {
    return null;
  }

  const bookName =
    tab.readingState.chapterData.value?.book.commonName ??
    tab.readingState.chapterData.value?.book.name ??
    bookId ??
    "";

  const hasCrossReferences =
    tab.readingState.discoveredCrossReferences.value.flatMap(
      (group) => group.results
    ).length > 0;

  const hasStudyNotes =
    tab.readingState.discoveredStudyNotes.value.flatMap(
      (group) => group.results
    ).length > 0;

  const contentTypes = state.discover.contentTypes.value;

  const hasContent =
    tab.readingState.discoveredContent.value
      .flatMap((group) => group.results)
      .filter((result) => !hasRegisteredContentType(result, contentTypes))
      .length > 0;

  const typesWithResults = contentTypes.filter(
    (definition) => contentTypeResultsFor(tab, definition.id).length > 0
  );

  const hasVisibleUnderAll =
    hasAnnotations ||
    hasCrossReferences ||
    hasStudyNotes ||
    hasContent ||
    plans.length > 0 ||
    typesWithResults.some((definition) => !definition.hiddenByDefault);

  const filters: {
    key: FilterKey;
    label: string;
  }[] = [
    {
      key: "all",
      label: t("all", {
        defaultValue: "All",
      }),
    },

    ...(showAnnotations
      ? [
          {
            key: "annotations" as const,
            label: t("notes", {
              defaultValue: "Notes",
            }),
          },
        ]
      : []),

    ...(hasCrossReferences
      ? [
          {
            key: "cross-references" as const,
            label: t("cross-references", {
              defaultValue: "Cross Refs",
            }),
          },
        ]
      : []),

    ...(hasStudyNotes
      ? [
          {
            key: "study-notes" as const,
            label: t("study-notes", {
              defaultValue: "Study Notes",
            }),
          },
        ]
      : []),

    ...(hasContent
      ? [
          {
            key: "content" as const,
            label: t("content", {
              defaultValue: "Content",
            }),
          },
        ]
      : []),

    ...typesWithResults.map((definition) => ({
      key: `type:${definition.id}` as const,
      label: translateTitle(t, definition.title),
    })),
  ];

  const showFilters =
    filters.length > 2 ||
    typesWithResults.some((definition) => definition.hiddenByDefault);

  /*
   * Keep the arrow state synchronized when:
   *
   * - the user scrolls
   * - the number of filters changes
   * - the wrapper/container is resized
   * - an individual pill changes size
   */

  /*
   * Falls back to "all" when the previously-active
   * filter is no longer available.
   */
  const f = filters.some((filter) => filter.key === activeFilter.value)
    ? activeFilter.value
    : "all";

  return (
    <div className="sb-bible-reader-discover-panel">
      <div
        ref={panelRef}
        className="sb-discover-content-panel"
        aria-label={t("discover-content-panel", {
          defaultValue: "Discover content",
        })}
      >
        <div className="sb-dcp-header">
          <div className="sb-dcp-header-title">
            <MaterialIcon className="sb-dcp-header-icon">explore</MaterialIcon>

            <span>
              {t("discover-book-title", {
                defaultValue: "Discover {{book}}",
                book: bookName,
              })}
            </span>
          </div>

          <button
            type="button"
            className="sb-dcp-create-btn"
            onClick={() => void state.annotations.createNewAnnotation()}
          >
            +{" "}
            {t("create-playlist", {
              defaultValue: "Create",
            })}
          </button>
        </div>

        {showFilters && (
          <DiscoverFilters
            filters={filters}
            activeFilter={activeFilter}
            displayFilter={f}
          />
        )}
        <div className="sb-discover-content-panel-scroll">
          {(f === "all" || f === "annotations") && showAnnotations && (
            <AnnotationsSection
              tab={tab}
              annotations={state.annotations}
              modals={state.modals}
              toast={state.app.toast}
              login={state.login}
              tabs={state.tabs}
              discover={state.discover}
              panes={state.panes}
              onReferenceClick={state.app.openVerseReference}
            />
          )}

          {(f === "all" || f === "cross-references") && (
            <CrossReferencesSection tab={tab} />
          )}

          {(f === "all" || f === "study-notes") && (
            <StudyNotesSection tab={tab} />
          )}

          {(f === "all" || f === "content") && (
            <ContentSection tab={tab} contentTypes={contentTypes} />
          )}

          {typesWithResults.map((definition) =>
            f === `type:${definition.id}` ||
            (f === "all" && !definition.hiddenByDefault) ? (
              <ContentTypeSection
                key={definition.id}
                tab={tab}
                definition={definition}
              />
            ) : null
          )}

          {f === "all" && plans.length > 0 && (
            <ReadingPlansSection
              readingState={tab.readingState}
              state={state}
              plans={plans}
            />
          )}

          {f === "all" && !hasVisibleUnderAll && (
            <DiscoverEmpty
              text={t("discover-choose-filter-hint", {
                defaultValue:
                  "Pick a filter above to see more from this chapter.",
              })}
            />
          )}
        </div>

        <button
          type="button"
          className="sb-dcp-show-all"
          onClick={() => state.app.openDiscover()}
        >
          {t("show-all", {
            defaultValue: "Show All",
          })}
        </button>
      </div>
    </div>
  );
}
