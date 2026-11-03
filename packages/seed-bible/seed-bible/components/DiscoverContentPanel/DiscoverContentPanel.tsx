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
import { useHorizontalScroll } from "../useHorizontalScroll";
import { translateTitle } from "../../app/utils";
import { ReadingPlansSection } from "../ReadingPlansSection/ReadingPlansSection";
import {
  findScrollContainer,
  readBottomChromeCover,
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
 * How long after an arrow click the next one steps on from that click's
 * destination. Longer than a browser's smooth scroll, which is about 300–500ms.
 */
const PENDING_SCROLL_MS = 600;

/**
 * Publishes `--sb-dcp-side-max-height` on the panel: the height of the part of
 * its pane that's actually on screen, below the panel's sticky `top` and above
 * the fixed bottom toolbar. A plain `100vh` cap ignores the tab bar above the
 * pane, the toolbar floating over its bottom and split-pane layouts, so the
 * bottom of a long panel (and its last items) ended up out of reach.
 *
 * Also publishes `--sb-dcp-list-cover-top`/`-bottom`: how much of the panel's
 * list is hidden behind the mobile reader header and the bottom chrome, or
 * scrolled out of its pane. Where the panel scrolls with the page (mobile,
 * stacked below the scripture) its list can sit partly off screen, and sticky
 * children of the list only know the list's own edges.
 */
function usePanelViewportMeasures() {
  const cleanupRef = useRef<(() => void) | null>(null);

  return useCallback((panel: HTMLElement | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (!panel || typeof ResizeObserver === "undefined") return;

    const scroller = findScrollContainer(panel);
    const reader = panel.closest<HTMLElement>(".sb-bible-reader");
    let frame = 0;

    // Writing a custom property restyles the whole panel, and scrolling
    // re-measures every frame, so only write values that changed.
    const setPx = (name: string, px: number) => {
      const value = `${Math.floor(px)}px`;
      if (panel.style.getPropertyValue(name) !== value) {
        panel.style.setProperty(name, value);
      }
    };

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
      setPx("--sb-dcp-side-max-height", available);

      const list = panel.querySelector<HTMLElement>(
        ".sb-discover-content-panel-scroll"
      );
      if (!list) return;
      const listRect = list.getBoundingClientRect();
      const headerBottom =
        reader
          ?.querySelector(".sb-bible-reader-mobile-header")
          ?.getBoundingClientRect().bottom ?? 0;
      const visibleTop = Math.max(top, headerBottom);
      const visibleBottom = Math.min(
        rect?.bottom ?? window.innerHeight,
        window.innerHeight - readBottomChromeCover()
      );
      setPx("--sb-dcp-list-cover-top", Math.max(visibleTop - listRect.top, 0));
      setPx(
        "--sb-dcp-list-cover-bottom",
        Math.max(listRect.bottom - visibleBottom, 0)
      );
    };

    const scheduleMeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const resizeObserver = new ResizeObserver(scheduleMeasure);
    if (scroller) resizeObserver.observe(scroller);
    resizeObserver.observe(panel);
    scroller?.addEventListener("scroll", scheduleMeasure, { passive: true });
    // The mobile header slides away and back while scrolling; measure again
    // once it has settled.
    reader?.addEventListener("transitionend", scheduleMeasure);
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
      scroller?.removeEventListener("scroll", scheduleMeasure);
      reader?.removeEventListener("transitionend", scheduleMeasure);
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
  // The pills scroll horizontally with the vertical wheel, and fade at an
  // edge only while pills are hidden past it (see `updateScrollState`).
  const filtersRef = useRef<HTMLDivElement>(null);
  useHorizontalScroll(filtersRef);
  // Where the arrows' last smooth scroll is headed, and when it was asked for.
  const pendingScrollRef = useRef<{ left: number; at: number } | null>(null);

  const hasScrollableFilters = useSignal(false);
  const canScrollStart = useSignal(false);
  const canScrollEnd = useSignal(false);
  const filtersKey = filters
    .map((filter) => `${filter.key}:${filter.label}`)
    .join("|");

  // The arrows and the edge fades both follow this, so they never disagree
  // about whether there's more to scroll.
  const updateScrollState = useCallback((isRtl: boolean) => {
    const container = filtersRef.current;
    const wrapper = container?.parentElement;
    const setScrollable = (start: boolean, end: boolean) => {
      canScrollStart.value = start;
      canScrollEnd.value = end;
      // The fades are physical sides; the start is on the right in RTL.
      container?.toggleAttribute("data-fade-left", isRtl ? end : start);
      container?.toggleAttribute("data-fade-right", isRtl ? start : end);
    };
    if (!container || !wrapper) {
      hasScrollableFilters.value = false;
      setScrollable(false, false);
      return;
    }
    const hasOverflow = container.scrollWidth > wrapper.clientWidth + 1;
    hasScrollableFilters.value = hasOverflow;
    if (!hasOverflow) {
      setScrollable(false, false);
      return;
    }
    const maxScroll = Math.max(
      0,
      container.scrollWidth - container.clientWidth
    );
    const position = isRtl
      ? Math.abs(container.scrollLeft)
      : container.scrollLeft;

    setScrollable(position > 1, position < maxScroll - 1);
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
    const current = container.scrollLeft;

    // Pills in `scrollLeft` units, where the visible stretch runs from
    // `scrollLeft` to `scrollLeft + clientWidth` (RTL's `scrollLeft` is
    // negative, which this handles too).
    const spans = pills.map((pill) => {
      const rect = pill.getBoundingClientRect();
      const start = rect.left - containerRect.left + current;
      return { start, end: start + rect.width };
    });

    // Steps from where an earlier click's smooth scroll is headed rather than
    // from where it has got to, so quick clicks each move on another pill.
    const pending = pendingScrollRef.current;
    const base =
      pending && performance.now() - pending.at < PENDING_SCROLL_MS
        ? pending.left
        : current;
    const viewStart = base;
    const viewEnd = base + container.clientWidth;

    // Toward the end is right in LTR, left in RTL. Bring the nearest pill
    // hidden past that edge fully into view.
    let next: number | undefined;
    if ((direction === 1) !== isRtl) {
      const hidden = spans.filter((span) => span.end > viewEnd + 1);
      if (hidden.length > 0) {
        next = base + Math.min(...hidden.map((span) => span.end)) - viewEnd;
      }
    } else {
      const hidden = spans.filter((span) => span.start < viewStart - 1);
      if (hidden.length > 0) {
        next =
          base - (viewStart - Math.max(...hidden.map((span) => span.start)));
      }
    }
    if (next === undefined) return;

    const maxScroll = container.scrollWidth - container.clientWidth;
    next = isRtl
      ? Math.min(0, Math.max(-maxScroll, next))
      : Math.min(maxScroll, Math.max(0, next));
    pendingScrollRef.current = { left: next, at: performance.now() };

    container.scrollBy({
      left: next - current,
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
        ? "auto"
        : "smooth",
    });
  }, []);
  const showArrows = hasScrollableFilters.value;
  useLayoutEffect(() => {
    const container = filtersRef.current;
    if (!container) return;

    const active = container.querySelector<HTMLElement>(".sb-dcp-chip--active");

    if (active) {
      const row = container.getBoundingClientRect();
      const chip = active.getBoundingClientRect();

      if (chip.left < row.left) {
        container.scrollLeft -= row.left - chip.left;
      } else if (chip.right > row.right) {
        container.scrollLeft += chip.right - row.right;
      }
    }

    const update = () =>
      updateScrollState(getComputedStyle(container).direction === "rtl");

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

    // Recheck when the viewport resizes. This also supports test
    // environments where ResizeObserver is unavailable.
    window.addEventListener("resize", update);

    return () => {
      container.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      resizeObserver?.disconnect();
    };
  }, [filtersKey, updateScrollState, showArrows]);

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
          aria-label={t("scroll-filters-start", {
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
          aria-label={t("scroll-filters-end", {
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

  const panelRef = usePanelViewportMeasures();

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
