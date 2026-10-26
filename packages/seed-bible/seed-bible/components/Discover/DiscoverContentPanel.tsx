import "./DiscoverContentPanel.css";
import type { ComponentChildren } from "preact";
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
  noTabHint,
} from "./DiscoveredResultsSections";
import { AnnotationsSection } from "./AnnotationsSection";
import { DiscoverEmpty } from "./DiscoverSection";
import { DiscoverPanelHeader } from "./DiscoverPanelHeader";
import {
  FriendPlaylistsSection,
  friendPlaylistGroups,
} from "./FriendPlaylistsSection";
import { MaterialIcon } from "../icons";
import {
  ContextMenuWithButton,
  ContextMenuItem,
} from "../ContextMenu/ContextMenu";
import { translateTitle } from "../../app/utils";
import { ReadingPlansSection } from "../ReadingPlansSection/ReadingPlansSection";
import {
  findScrollContainer,
  readBottomChromeInset,
} from "../BibleReader/readerViewport";

type FilterKey =
  | "all"
  | "annotations"
  | "friends-playlists"
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

/**
 * The full panel's "+ Create" button: a menu offering a new annotation or a
 * new playlist. Looks the same as the compact panel's button, which only
 * creates annotations.
 */
function DiscoverCreateMenu(props: { state: SeedBibleState }) {
  const { annotations, playlists } = props.state;
  const { t } = useI18n();

  return (
    <ContextMenuWithButton
      buttonClassName="sb-dcp-create-btn"
      aria-label={t("create-menu", { defaultValue: "Create" })}
      icon={<>+ {t("create-playlist", { defaultValue: "Create" })}</>}
    >
      <ContextMenuItem onClick={() => void annotations.createNewAnnotation()}>
        <MaterialIcon className="sb-context-menu-item-icon">
          edit_note
        </MaterialIcon>
        {t("create-annotation-menu-item", { defaultValue: "Annotation" })}
      </ContextMenuItem>
      <ContextMenuItem onClick={() => void playlists.createNewPlaylist()}>
        <MaterialIcon className="sb-context-menu-item-icon">
          queue_music
        </MaterialIcon>
        {t("create-playlist-menu-item", { defaultValue: "Playlist" })}
      </ContextMenuItem>
    </ContextMenuWithButton>
  );
}

interface DiscoverFiltersProps {
  filters: { key: FilterKey; label: string }[];
  activeFilter: Signal<FilterKey>;
  displayFilter: FilterKey;
}

type DiscoverPanelVariant = "full" | "compact";

interface BaseDiscoverContentPanelProps {
  tab: ReaderTab | null;
  state: SeedBibleState;
  variant: DiscoverPanelVariant;
}

interface CompactDiscoverContentPanelProps extends BaseDiscoverContentPanelProps {
  variant: "compact";
}

interface FullDiscoverContentPanelProps extends BaseDiscoverContentPanelProps {
  variant: "full";
  onClose: () => void;
}

type DiscoverContentPanelProps =
  | CompactDiscoverContentPanelProps
  | FullDiscoverContentPanelProps;
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
 * Discover content for one reading tab — the reader's and their friends'
 * notes (annotations), discovered cross references/study notes/content and
 * reading plans for the chapter — behind a header and filter chips. Comes in
 * two variants:
 *
 * - `compact`: rendered by BibleReader once per visible tab, beside the
 *   scripture text or below it (the "discover-content-panel" quick tool picks
 *   which). Hides itself entirely when there's no tab or nothing to show for
 *   the chapter, and omits the notes section when the chapter has no notes and
 *   nothing waiting to sync. Its "+ Create" button creates an annotation.
 * - `full`: the Discover side pane's main view (see DiscoverPane). The pane is
 *   opened without its own header, so this one carries the close button and
 *   always renders: without a tab it shows a hint to select one, and for a
 *   chapter with nothing to show, the empty notes section's "Create a note"
 *   prompt stands in as the empty state. Adds friends' playlists (with their
 *   own chip), and its "+ Create" button offers a playlist as well as an
 *   annotation.
 */
export function DiscoverContentPanel(props: DiscoverContentPanelProps) {
  const { tab, state, variant } = props;

  const { t } = useI18n();

  const activeFilter = useSignal<FilterKey>("all");

  const panelRef = useSidePanelMaxHeight();

  const chapterBook = tab?.readingState.chapterData.value?.book;
  const bookName =
    chapterBook?.commonName ??
    chapterBook?.name ??
    tab?.readingState.bookId.value ??
    null;

  const panel = (content: ComponentChildren) => {
    const body = (
      <div
        ref={variant === "compact" ? panelRef : undefined}
        className={`sb-discover-content-panel${variant === "full" ? " sb-discover-content-panel--full" : ""}`}
        aria-label={t("discover-content-panel", {
          defaultValue: "Discover content",
        })}
      >
        <DiscoverPanelHeader
          title={
            <>
              <MaterialIcon className="sb-dcp-header-icon">
                explore
              </MaterialIcon>
              <span>
                {bookName
                  ? t("discover-book-title", {
                      defaultValue: "Discover {{book}}",
                      book: bookName,
                    })
                  : t("discover", { defaultValue: "Discover" })}
              </span>
            </>
          }
          actions={
            props.variant === "full" ? (
              <DiscoverCreateMenu state={state} />
            ) : (
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
            )
          }
          onClose={props.variant === "full" ? props.onClose : undefined}
        />
        {content}
      </div>
    );
    // The wrapper only exists for BibleReader's layout, which sizes and
    // places it beside or below the scripture; in the side pane the panel
    // fills the pane instead.
    return variant === "full" ? (
      body
    ) : (
      <div className="sb-bible-reader-discover-panel">{body}</div>
    );
  };

  // Out of the side pane, the compact panel just steps aside when there's
  // nothing to show. The full panel holds the pane's only header and close
  // button, so it always renders, with a hint in place of the content.
  if (!tab) {
    return variant === "full"
      ? panel(
          <div className="sb-discover-content-panel-scroll">{noTabHint(t)}</div>
        )
      : null;
  }

  const { hasAnnotations, showAnnotations, plans, hasAny } =
    getDiscoverPanelContent(
      tab.readingState,
      state.annotations,
      state.readingPlans,
      state.features
    );

  // Only the full panel shows friends' playlists: they aren't tied to the
  // chapter, so they'd crowd the compact panel's chapter summary.
  const hasFriendPlaylists =
    props.variant === "full" &&
    friendPlaylistGroups(state.friends, state.playlists).length > 0;

  if (!hasAny && variant !== "full") {
    return null;
  }

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

  const hasOtherContentUnderAll =
    hasFriendPlaylists ||
    hasCrossReferences ||
    hasStudyNotes ||
    hasContent ||
    plans.length > 0 ||
    typesWithResults.some((definition) => !definition.hiddenByDefault);

  // The full panel never renders empty: when the chapter has nothing else to
  // show, not even behind a filter chip, the notes section's "Create a note"
  // prompt stands in as its empty state.
  const showNotesAsEmptyState =
    variant === "full" &&
    !hasOtherContentUnderAll &&
    typesWithResults.length === 0;
  const showNotes = showAnnotations || showNotesAsEmptyState;

  const hasVisibleUnderAll =
    hasAnnotations || showNotesAsEmptyState || hasOtherContentUnderAll;

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

    ...(showNotes
      ? [
          {
            key: "annotations" as const,
            label: t("notes", {
              defaultValue: "Notes",
            }),
          },
        ]
      : []),

    ...(hasFriendPlaylists
      ? [
          {
            key: "friends-playlists" as const,
            label: t("friends-playlists-filter", {
              defaultValue: "Friends' playlists",
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

  return panel(
    <>
      {showFilters && (
        <DiscoverFilters
          filters={filters}
          activeFilter={activeFilter}
          displayFilter={f}
        />
      )}
      <div className="sb-discover-content-panel-scroll">
        {(f === "all" || f === "annotations") && showNotes && (
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

        {(f === "all" || f === "friends-playlists") && hasFriendPlaylists && (
          <FriendPlaylistsSection
            friends={state.friends}
            playlists={state.playlists}
            modals={state.modals}
            toast={state.app.toast}
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
    </>
  );
}
