import "./DiscoverContentPanel.css";
import { Signal, useSignal } from "@preact/signals";
import { useCallback, useLayoutEffect, useRef } from "preact/hooks";
import { useI18n } from "../../i18n/I18nManager";
import type { ReaderTab } from "../../managers/TabsManager";
import { getDiscoverPanelContent } from "../../managers/BibleReadingManager";
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
import { ReadingPlansSection } from "../ReadingPlansSection/ReadingPlansSection";
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

  const hasScrollableFilters = useSignal(false);
  const canScrollStart = useSignal(false);
  const canScrollEnd = useSignal(false);
  const filtersKey = filters
    .map((filter) => `${filter.key}:${filter.label}`)
    .join("|");

  const updateScrollState = useCallback((isRtl: boolean) => {
    const container = filtersRef.current;
    const wrapper = container?.parentElement;
    if (!container || !wrapper) {
      hasScrollableFilters.value = false;
      canScrollStart.value = false;
      canScrollEnd.value = false;
      return;
    }
    const hasOverflow = container.scrollWidth > wrapper.clientWidth + 1;
    hasScrollableFilters.value = hasOverflow;
    if (!hasOverflow) {
      canScrollStart.value = false;
      canScrollEnd.value = false;
      return;
    }
    const maxScroll = Math.max(
      0,
      container.scrollWidth - container.clientWidth
    );
    const position = isRtl
      ? Math.abs(container.scrollLeft)
      : container.scrollLeft;

    canScrollStart.value = position > 1;
    canScrollEnd.value = position < maxScroll - 1;
  }, []);

  const scrollFilters = useCallback((direction: -1 | 1) => {
    if (direction === -1 && !canScrollStart.value) return;
    if (direction === 1 && !canScrollEnd.value) return;

    const container = filtersRef.current;
    if (!container) return;

    const pills = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".sb-dcp-chip")
    );

    if (pills.length === 0) return;

    const isRtl = getComputedStyle(container).direction === "rtl";
    const containerRect = container.getBoundingClientRect();

    let targetPill: HTMLButtonElement | undefined;

    if (direction === 1) {
      // Toward the end: right in LTR, left in RTL.
      targetPill = isRtl
        ? pills.find((pill) => {
            const rect = pill.getBoundingClientRect();
            return rect.left < containerRect.left - 1;
          })
        : pills.find((pill) => {
            const rect = pill.getBoundingClientRect();
            return rect.right > containerRect.right + 1;
          });
    } else {
      // Toward the start: left in LTR, right in RTL.
      targetPill = isRtl
        ? [...pills].reverse().find((pill) => {
            const rect = pill.getBoundingClientRect();
            return rect.right > containerRect.right + 1;
          })
        : [...pills].reverse().find((pill) => {
            const rect = pill.getBoundingClientRect();
            return rect.left < containerRect.left - 1;
          });
    }

    if (!targetPill) return;

    const targetRect = targetPill.getBoundingClientRect();

    const scrollAmount =
      direction === 1
        ? isRtl
          ? targetRect.left - containerRect.left
          : targetRect.right - containerRect.right
        : isRtl
          ? targetRect.right - containerRect.right
          : targetRect.left - containerRect.left;

    container.scrollBy({
      left: scrollAmount,
    });
  }, []);

  useLayoutEffect(() => {
    const container = filtersRef.current;
    if (!container) return;
    container.scrollLeft = 0;
    const isRtl = getComputedStyle(container).direction === "rtl";
    const update = () => updateScrollState(isRtl);
    update();
    container.addEventListener("scroll", update);
    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;

    if (resizeObserver) {
      resizeObserver.observe(container);

      const wrapper = container.parentElement;
      if (wrapper) resizeObserver.observe(wrapper);

      container
        .querySelectorAll<HTMLElement>(".sb-dcp-chip")
        .forEach((chip) => resizeObserver.observe(chip));
    }
    // Recheck when the viewport resizes.
    // ResizeObserver also handles changes to the row and wrapper dimensions.
    window.addEventListener("resize", update);

    return () => {
      container.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      resizeObserver?.disconnect();
    };
  }, [filtersKey, updateScrollState]);

  return (
    <div
      className={`sb-dcp-filters-wrapper${
        hasScrollableFilters.value ? " sb-dcp-filters-wrapper--scrollable" : ""
      }`}
    >
      {hasScrollableFilters.value && (
        <button
          type="button"
          className="sb-dcp-filters-arrow"
          onClick={() => scrollFilters(-1)}
          aria-disabled={!canScrollStart.value}
          aria-label={t("scroll-filters-left", {
            defaultValue: "Scroll filters toward start",
          })}
        >
          <MaterialIcon className="rtl-mirror" aria-hidden="true">
            chevron_left
          </MaterialIcon>
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

      {hasScrollableFilters.value && (
        <button
          type="button"
          className="sb-dcp-filters-arrow"
          onClick={() => scrollFilters(1)}
          aria-disabled={!canScrollEnd.value}
          aria-label={t("scroll-filters-right", {
            defaultValue: "Scroll filters toward end",
          })}
        >
          <MaterialIcon className="rtl-mirror" aria-hidden="true">
            chevron_right
          </MaterialIcon>
        </button>
      )}
    </div>
  );
}
/**
 * Automatically-visible discover content — the reader's and their friends'
 * notes (annotations) plus discovered cross references/study notes/content — for
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
  const { hasAnnotations, showAnnotations, plans, hasAny } =
    getDiscoverPanelContent(
      tab.readingState,
      state.annotations,
      state.readingPlans,
      state.features
    );

  if (!hasAny) {
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
  // Falls back to "all" when the previously-active filter's content type is
  // no longer available (e.g. the user filtered to "Cross Refs" then
  // navigated to a chapter with none), so the chip row and content area don't
  // go blank.
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
              friends={state.friends}
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
      </div>
    </div>
  );
}
