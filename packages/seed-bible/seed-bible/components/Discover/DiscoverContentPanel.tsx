import { TooltipTrigger } from "../TooltipTrigger/TooltipTrigger";
import "./DiscoverContentPanel.css";
import type { ComponentChildren } from "preact";
import { useSignal, useSignalEffect } from "@preact/signals";
import { useCallback, useMemo, useRef } from "preact/hooks";
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
import { Spinner } from "../Spinner/Spinner";
import {
  ContextMenuWithButton,
  ContextMenuItem,
} from "../ContextMenu/ContextMenu";
import { translateTitle } from "../../app/utils";
import {
  findScrollContainer,
  readBottomChromeCover,
  readBottomChromeInset,
} from "../BibleReader/readerViewport";
import { Button } from "../Button/Button";
import { FilterPills } from "../FilterPills/FilterPills";

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
      trigger={(menu) => (
        <Button {...menu} variant="primary" size="sm" shape="pill" icon="add">
          {t("create-playlist", { defaultValue: "Create" })}
        </Button>
      )}
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
interface HiddenContentWarningProps {
  handleAccept: () => void;
  handleDismiss: () => void;
}

function ContentWarning(props: HiddenContentWarningProps) {
  const { t } = useI18n();
  return (
    <div className="sb-dcp-hidden-notice">
      <div className="sb-dcp-hidden-notice-icon" aria-hidden="true">
        <MaterialIcon>visibility_off</MaterialIcon>
      </div>
      <p className="sb-dcp-hidden-notice-title">
        {t("discover-hidden-in-session", {
          defaultValue: "Discovered content is off in shared sessions",
        })}
      </p>
      <p className="sb-dcp-hidden-notice-message">
        {t("discover-hidden-in-session-reason", {
          defaultValue:
            "It's only visible to you, so it's hidden while you read with others.",
        })}
      </p>
      <div className="sb-dcp-hidden-notice-actions">
        <button
          type="button"
          className="sb-dcp-hidden-notice-dismiss"
          onClick={props.handleDismiss}
        >
          {t("discover-hidden-in-session-not-now", {
            defaultValue: "Not now",
          })}
        </button>
        <button
          type="button"
          className="sb-dcp-hidden-notice-turn-on"
          onClick={props.handleAccept}
        >
          {t("discover-hidden-in-session-turn-on", {
            defaultValue: "Turn on",
          })}
        </button>
      </div>
    </div>
  );
}

function InlineContentWarning(props: HiddenContentWarningProps) {
  const { t } = useI18n();
  return (
    <div className="sb-dcp-hidden-banner">
      <div className="sb-dcp-hidden-banner-text">
        <MaterialIcon className="sb-dcp-hidden-banner-icon" aria-hidden="true">
          visibility_off
        </MaterialIcon>
        <p>
          {t("discover-hidden-in-session", {
            defaultValue: "Discovered content is off in shared sessions",
          })}
        </p>
      </div>
      <div className="sb-dcp-hidden-banner-actions">
        <button
          type="button"
          className="sb-dcp-hidden-banner-turn-on"
          onClick={props.handleAccept}
        >
          {t("discover-hidden-in-session-turn-on", {
            defaultValue: "Turn on",
          })}
        </button>
        <TooltipTrigger>
          <button
            type="button"
            className="sb-dcp-hidden-banner-close"
            onClick={props.handleDismiss}
            aria-label={t("dismiss", { defaultValue: "Dismiss" })}
          >
            <MaterialIcon>close</MaterialIcon>
          </button>
        </TooltipTrigger>
      </div>
    </div>
  );
}

function SharedSessionHint(props: { onDismiss: () => void }) {
  const { t } = useI18n();
  return (
    <div className="sb-dcp-session-hint" role="note">
      <MaterialIcon className="sb-dcp-session-hint-icon" aria-hidden="true">
        info
      </MaterialIcon>
      <div className="sb-dcp-session-hint-body">
        <p>
          {t("discover-shared-session-hint", {
            defaultValue:
              "Only you can see discovered content. Everything else in the session is shared.",
          })}
        </p>
        <button
          type="button"
          className="sb-dcp-session-hint-dismiss"
          onClick={props.onDismiss}
        >
          {t("discover-shared-session-hint-got-it", {
            defaultValue: "Got it",
          })}
        </button>
      </div>
    </div>
  );
}

/**
 * Discover content for one reading tab — the reader's and their friends'
 * notes (annotations), discovered cross references/study notes and content —
 * behind a header and filter chips. Comes in two variants:
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
  const { state, variant } = props;
  // In a compare step the user may be working in the passage shown beside the
  // tab's own; Discover shows that passage's content then.
  const activeReadingState = props.tab
    ? state.tabs.activeReadingState(props.tab)
    : null;
  const tab = useMemo(
    () =>
      props.tab && activeReadingState
        ? activeReadingState === props.tab.readingState
          ? props.tab
          : { ...props.tab, readingState: activeReadingState }
        : null,
    [props.tab, activeReadingState]
  );

  const { t } = useI18n();

  const activeFilter = useSignal<FilterKey>("all");

  useSignalEffect(() => {
    const target = state.discover.scrollToVerse.value;
    if (
      !target ||
      !tab ||
      target.bookId !== tab.readingState.bookId.value ||
      target.chapterNumber !== tab.readingState.chapterNumber.value
    ) {
      return;
    }
    const current = activeFilter.peek();
    if (current !== "all" && current !== "annotations") {
      activeFilter.value = "annotations";
    }
  });
  const panelRef = usePanelViewportMeasures();

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
              <Button
                variant="primary"
                size="sm"
                shape="pill"
                icon="add"
                className="sb-dcp-create-btn"
                onClick={() => void state.annotations.createNewAnnotation()}
              >
                {t("create-playlist", {
                  defaultValue: "Create",
                })}
              </Button>
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

  const { hasAnnotations, showAnnotations, hasAny, showHiddenContentWarning } =
    getDiscoverPanelContent(tab.readingState, state.annotations);

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
    typesWithResults.some((definition) => !definition.hiddenByDefault);

  // Results stream in after the chapter opens, so until discovery is done
  // "nothing yet" can't be told apart from "nothing at all". With discovered
  // content turned off (a shared session) there's nothing to wait for, since
  // whatever arrives stays hidden.
  const isDiscovering =
    variant === "full" &&
    tab.readingState.showDiscoveredContent.value &&
    tab.readingState.isDiscovering.value;

  // The full panel never renders empty: when the chapter has nothing else to
  // show, not even behind a filter chip, the notes section's "Create a note"
  // prompt stands in as its empty state.
  const showNotesAsEmptyState =
    variant === "full" &&
    !isDiscovering &&
    !hasOtherContentUnderAll &&
    typesWithResults.length === 0;
  const showNotes = showAnnotations || showNotesAsEmptyState;

  const hasVisibleUnderAll =
    hasAnnotations ||
    showNotesAsEmptyState ||
    hasOtherContentUnderAll ||
    showHiddenContentWarning ||
    isDiscovering;

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
      {tab.readingState.showSharedSessionHint.value && (
        <SharedSessionHint
          onDismiss={() => tab.readingState.dismissSharedSessionHint()}
        />
      )}
      {showFilters && (
        <FilterPills
          className="sb-dcp-filters"
          aria-label={t("discover-filters", {
            defaultValue: "Filter discovered content",
          })}
          options={filters.map(({ key, label }) => ({ value: key, label }))}
          value={f}
          onChange={(key) => {
            activeFilter.value = key;
          }}
        />
      )}
      <div className="sb-discover-content-panel-scroll">
        {showHiddenContentWarning &&
          (showAnnotations || hasFriendPlaylists ? (
            <InlineContentWarning
              handleAccept={() => tab.readingState.turnOnDiscoveredContent()}
              handleDismiss={() =>
                tab.readingState.dismissHiddenContentWarning()
              }
            />
          ) : (
            <ContentWarning
              handleAccept={() => tab.readingState.turnOnDiscoveredContent()}
              handleDismiss={() =>
                tab.readingState.dismissHiddenContentWarning()
              }
            />
          ))}
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
            app={state.app}
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

        {f === "all" &&
          isDiscovering &&
          tab.readingState.showDiscoveryLoader.value && (
            <div className="sb-dcp-discovery-loader">
              <Spinner
                size="1.25rem"
                label={t("loading", { defaultValue: "Loading…" })}
              />
            </div>
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
