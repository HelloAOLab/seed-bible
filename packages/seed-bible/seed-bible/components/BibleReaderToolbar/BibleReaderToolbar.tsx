import "./BibleReaderToolbar.inline.css";
import { effect, useComputed, useSignal } from "@preact/signals";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { useI18n } from "../../i18n/I18nManager";
import { translateTitle } from "../../app/utils";
import { flingSafeTapHandlers } from "../../app/flingSafeTap";
import {
  applyToolbarCustomization,
  UI_SIZE_SCALE_MAP,
} from "../../managers/SettingsManager";
import { highlightContainsVerse } from "../../managers/HighlightsManager";
import type { BibleReadingSession } from "../../managers/SessionsManager";
import type { BibleReadingState } from "../../managers/BibleReadingManager";
import type { BibleReaderToolbarTool } from "../../managers/BibleToolsManager";
import {
  handleGridKeyNav,
  handleHorizontalListKeyNav,
  handleVerticalListKeyNav,
} from "../../app/keyboardNav";
import {
  MaterialIcon,
  SeedBibleIcon,
  SbTabsIcon,
  StopIcon,
} from "../../components/icons";
import { useEffect, useRef } from "preact/hooks";
import { openBookmarkCategoryModal } from "../Tabs/Tabs";
import { playlistItemLabel } from "../playlistItemLabel";
import type { PlayingState } from "../../managers/PlaylistManager";
import {
  annotationVerseNumbers,
  annotationListHasOtherAuthors,
  groupAnnotationsByVerseRange,
  type AnnotationGroup,
  type AnnotationsManager,
} from "../../managers/AnnotationsManager";
import {
  AnnotationPreview,
  AnnotationCommentMeta,
  annotationLocationLabel,
  openDeleteAnnotationConfirm,
} from "../DiscoverPane/DiscoverPane";
import {
  ContextMenuWithButton,
  ContextMenuItem,
} from "../ContextMenu/ContextMenu";
import type { TabsManager } from "../../managers/TabsManager";
import type { VerseRef } from "../../managers/BibleDataManager";
import type { LoginManager } from "../../managers/LoginManager";
import type { ModalManager } from "../../managers/ModalManager";
import { DEFAULT_HIGHLIGHT_IDS } from "../../managers/ThemeManager";

/**
 * Breathing room between the reader's last content and the bottom chrome, in
 * pixels. The measurement in `--sb-reader-bottom-inset` is exact occlusion —
 * how many pixels of toolbar / nav / verse sheet cover the viewport bottom —
 * so without this the trailing element (translation license line, the
 * "Powered by" row) ends flush against the toolbar's top edge.
 */
const BOTTOM_CHROME_GAP_PX = 48;

/**
 * Spawns a Material-style ripple inside the pressed button: a circle centered on
 * the button (not the touch point) that scales up and fades out, then removes
 * itself. Used for tap feedback on the mobile floating-nav buttons, where the
 * CSS `:active` state is too brief to reliably paint on touch devices.
 */
function spawnRipple(event: PointerEvent) {
  const button = event.currentTarget as HTMLElement | null;
  if (!button) return;
  const rect = button.getBoundingClientRect();
  // Oversize the circle so the ripple reads big and bold (clipped to the
  // button's rounded shape by overflow: hidden).
  const size = Math.max(rect.width, rect.height) * 1.6;
  const ripple = document.createElement("span");
  ripple.className = "sb-ripple";
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  // Always center the ripple on the button, regardless of where it was tapped.
  ripple.style.left = `${(rect.width - size) / 2}px`;
  ripple.style.top = `${(rect.height - size) / 2}px`;
  ripple.addEventListener("animationend", () => ripple.remove());
  button.appendChild(ripple);
}

interface MobileBottomTabProps {
  iconName?: string;
  iconNode?: preact.ComponentChildren;
  label: string;
  active?: boolean;
  onClick: () => void;
  "aria-label"?: string;
}

function MobileBottomTab(props: MobileBottomTabProps) {
  const { iconName, iconNode, label, active, onClick } = props;
  const ariaLabel = props["aria-label"] ?? label;
  return (
    <div className="sb-reader-toolbar-item sb-reader-toolbar-mobile-tab">
      <button
        type="button"
        onClick={onClick}
        className={`sb-reader-toolbar-button sb-reader-toolbar-mobile-tab-button${
          active ? " sb-reader-toolbar-mobile-tab-button-active" : ""
        }`}
        aria-label={ariaLabel}
      >
        {iconNode ? (
          <span
            className="sb-reader-toolbar-mobile-tab-icon sb-reader-toolbar-mobile-tab-icon-custom"
            aria-hidden="true"
          >
            {iconNode}
          </span>
        ) : (
          <span
            className="material-symbols-outlined sb-reader-toolbar-mobile-tab-icon"
            aria-hidden="true"
          >
            {iconName}
          </span>
        )}
        <span className="sb-reader-toolbar-mobile-tab-label">{label}</span>
      </button>
    </div>
  );
}

interface MobileMoreMenuProps {
  onClose: () => void;
  tools: BibleReaderToolbarTool[];
  /**
   * App-level items (not extension tools) pinned to the top of the menu, e.g.
   * Bookmarks when it has been demoted off the bottom toolbar. Each item's
   * `onClick` is responsible for closing the menu.
   */
  pinnedItems?: Array<{
    id: string;
    label: string;
    iconName?: string;
    iconNode?: preact.ComponentChildren;
    onClick: () => void;
  }>;
  /**
   * New-message indicator for the chat tool (`id === "open-chat"`), mirroring
   * the badge shown on the expanded toolbar. `unreadChatIndicator` is the badge
   * text (a count, `"99+"`, or `"@"` for a mention), or `null` when there are
   * no unread messages.
   */
  unreadChatIndicator?: string | null;
  chatWasMentioned?: boolean;
  hasTypingInChats?: boolean;
}

function MobileMoreMenu(props: MobileMoreMenuProps) {
  const { onClose, tools, pinnedItems } = props;
  const { t } = useI18n();

  const extraItems = tools
    .sort((a, b) => a.priority - b.priority)
    .map((tool) => {
      const ToolIcon = tool.icon;
      return {
        id: tool.id,
        label: translateTitle(t, tool.title),
        iconNode: <ToolIcon />,
        disabled: tool.disabled.value,
        onClick: () => {
          if (tool.disabled.value) return;
          onClose();
          tool.onSelect();
        },
      };
    });

  const items: Array<{
    id: string;
    label: string;
    iconName?: string;
    iconNode?: preact.ComponentChildren;
    disabled?: boolean;
    onClick: () => void;
  }> = [
    // {
    //   id: "discovery",
    //   label: t("discovery", { defaultValue: "Discovery" }),
    //   iconName: "explore",
    //   onClick: () => {
    //     onClose();
    //     os.toast(
    //       t("discovery-coming-soon", {
    //         defaultValue: "Discovery is coming soon",
    //       })
    //     );
    //   },
    // },
    ...extraItems,
    ...(pinnedItems ?? []),
  ];

  return (
    <div className="sb-mobile-more-menu" role="menu">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="sb-mobile-more-menu-item"
          onClick={item.onClick}
          disabled={item.disabled}
          role="menuitem"
        >
          {item.iconNode ? (
            <span className="sb-mobile-more-menu-icon" aria-hidden="true">
              {item.iconNode}
            </span>
          ) : (
            <span
              className="material-symbols-outlined sb-mobile-more-menu-icon"
              aria-hidden="true"
            >
              {item.iconName}
            </span>
          )}
          <span className="sb-mobile-more-menu-label">{item.label}</span>
          {item.id === "open-chat" && props.unreadChatIndicator && (
            <span
              className="sb-mobile-more-menu-unread-indicator"
              aria-label={
                props.chatWasMentioned
                  ? "Unread mention"
                  : `Unread messages: ${props.unreadChatIndicator}`
              }
            >
              {props.unreadChatIndicator}
            </span>
          )}
          {item.id === "open-chat" && props.hasTypingInChats && (
            <span
              className="sb-mobile-more-menu-typing-indicator"
              aria-label={t("someone-is-typing", {
                defaultValue: "Someone is typing...",
              })}
            />
          )}
        </button>
      ))}
      {/* <div className="sb-mobile-more-menu-item sb-mobile-more-menu-social">
        <span
          className="sb-mobile-more-menu-icon sb-mobile-more-menu-social-avatar"
          aria-hidden="true"
        />
        <span className="sb-mobile-more-menu-label">
          {t("social", { defaultValue: "Social" })}
        </span>
        <button
          type="button"
          className={`sb-mobile-more-menu-toggle${
            isSocialOn.value ? " sb-mobile-more-menu-toggle-on" : ""
          }`}
          role="switch"
          aria-checked={isSocialOn.value}
          aria-label={t("social", { defaultValue: "Social" })}
          onClick={() => {
            isSocialOn.value = !isSocialOn.value;
          }}
        >
          <span className="sb-mobile-more-menu-toggle-thumb" />
        </button>
      </div> */}
    </div>
  );
}

function getContrastTextColor(hex: string): string {
  const match = hex
    .replace("#", "")
    .match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) return "#333333";
  const r = parseInt(match[1] ?? "00", 16);
  const g = parseInt(match[2] ?? "00", 16);
  const b = parseInt(match[3] ?? "00", 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? "#333333" : "#ffffff";
}

/**
 * Deterministic decoration id for a per-verse shared highlight. Using a
 * stable id means re-highlighting the same verse overwrites the previous
 * decoration and un-highlighting it can target the decoration directly.
 */
function sharedHighlightDecorationId(
  bookId: string,
  chapterNumber: number,
  verseNumber: number
): string {
  return `shared-highlight:${bookId}:${chapterNumber}:${verseNumber}`;
}

/**
 * Broadcasts a decoration to the rest of a shared session by creating one
 * `VerseDecoration` per selected verse. The decoration is synced through
 * `SessionsManager`'s existing decorations CRDT, so other connected clients
 * see the same highlight, drawn by the reader's own ribbon layer.
 *
 * The decoration carries the highlight's `colorId` rather than a resolved
 * colour, so a preset lands as each participant's theme renders it — a peer in
 * dark mode gets their dark-mode yellow, not the sender's.
 *
 * If the session's `highlightDurationSeconds` is set (non-null, non-zero),
 * we schedule a local removal after that many seconds — the removal also
 * propagates through the CRDT so every client clears it at once.
 */
function broadcastDecorationToSession(
  session: BibleReadingSession,
  rs: BibleReadingState,
  details: {
    colorId: string;
    customColor?: string;
    customFontColor?: string;
  }
): void {
  const verses = rs.selectedVerses.value;
  if (verses.length === 0) return;

  const duration = session.options.value.highlightDurationSeconds;

  for (const verse of verses) {
    const id = sharedHighlightDecorationId(
      verse.bookId,
      verse.chapterNumber,
      verse.verse.number
    );
    rs.decorateVerses(
      verse.bookId,
      verse.chapterNumber,
      verse.verse.number,
      {
        highlight: details,
        preserveOnChapterChange: false,
        removeAfterMs: duration ? duration * 1000 : undefined,
      },
      id
    );
    if (duration !== null && duration > 0) {
      window.setTimeout(() => {
        // Remove from the CRDT map first — the sync subscriber will
        // clear the local copy. Calling `rs.removeDecoration` directly
        // would race with the sync effect, which would re-seed the
        // decoration from the still-present map entry.
        session.removeSharedDecoration(id);
      }, duration * 1000);
    }
  }
}

/**
 * Removes any shared-highlight decorations that match the currently
 * selected verses — keeps the session view in sync when the user
 * explicitly un-highlights verses rather than waiting for the timer.
 * Routes through the session's CRDT map so the removal propagates.
 */
function removeSharedHighlightsFromSelection(
  session: BibleReadingSession,
  rs: BibleReadingState
): void {
  for (const verse of rs.selectedVerses.value) {
    session.removeSharedDecoration(
      sharedHighlightDecorationId(
        verse.bookId,
        verse.chapterNumber,
        verse.verse.number
      )
    );
  }
}

/**
 * Applies a highlight to the current selection with the right lifetime for the
 * current context:
 *
 * - Not in a shared session → save permanently via HighlightsManager.
 * - In a shared session but not permitted to broadcast → save permanently. This
 *   highlight reaches nobody else, so it is an ordinary personal one.
 * - Broadcasting with `highlightDurationSeconds` = null (∞) → save permanently
 *   AND broadcast a decoration so other clients see it. The saved copy is the
 *   author's alone: participants get the broadcast, not a highlight of their
 *   own, and the author still has theirs once the session ends. Skipped when
 *   the user is signed out: there is nowhere to save it, and attempting to
 *   would interrupt them with a login modal for a highlight the session is
 *   already carrying. Broadcasting itself only needs a connection id.
 * - Broadcasting with a finite duration → broadcast a decoration only, and
 *   leave any existing personal highlight on those verses alone. The broadcast
 *   covers it for as long as it lives (the reader draws a decoration highlight
 *   over a saved one) and it reappears when the broadcast expires.
 *
 * By default the verse selection is cleared once the highlight is applied —
 * the selection and its toolbar were otherwise left sitting open after every
 * highlight, forcing an extra dismiss (#1704). `clearSelection` lets a caller
 * opt out: the custom-color picker's live-drag commits pass `false` so the
 * selection survives while the color dialog is still open, letting the user
 * keep tweaking the shade instead of losing the selection after the first
 * settled color.
 */
function applyHighlightWithSession(
  rs: BibleReadingState,
  session: BibleReadingSession | null,
  details: {
    colorId: string;
    customColor?: string;
    customFontColor?: string;
  },
  isSignedIn: boolean,
  clearSelection = true
): void {
  if (!session || !session.userCanDecorate(session.localSessionId.value)) {
    // A participant who can't broadcast used to match neither branch here, so
    // highlighting silently did nothing for them. Saving is the only thing this
    // can mean, so a signed-out user is asked to sign in before it applies.
    void rs.highlightSelectedVerses(details);
  } else {
    const duration = session.options.value.highlightDurationSeconds;
    const isTransient = duration !== null && duration > 0;

    if (!isTransient && isSignedIn) {
      void rs.highlightSelectedVerses(details);
    }

    broadcastDecorationToSession(session, rs, details);
  }

  if (clearSelection) {
    rs.clearSelectedVerses();
  }
}

/**
 * One verse-range group of annotations in the mobile verse sheet's expanded
 * overflow area — mirrors `DiscoverPane`'s grouped annotation list (same
 * header/list classes, same collapsible header, same edit/delete menu). A
 * standalone component (rather than inlined in a `.map()`) so each group's
 * `expanded` signal is its own hook instance, keyed by group below.
 */
function VerseToolbarAnnotationGroup(props: {
  id: string;
  group: AnnotationGroup;
  tabs: TabsManager;
  login: LoginManager;
  annotations: AnnotationsManager;
  modals: ModalManager;
  toast: SeedBibleState["app"]["toast"];
  openDiscover: () => void;
  onReferenceClick?: (ref: VerseRef) => void;
  otherPeoplePresent?: boolean;
}) {
  const {
    id,
    group,
    tabs,
    login,
    annotations,
    modals,
    toast,
    onReferenceClick,
    otherPeoplePresent,
  } = props;
  const { t, language } = useI18n();
  const expanded = useSignal(true);
  const label = annotationLocationLabel(group.annotations[0]!, tabs);

  return (
    <div className="sb-annotation-group" id={id}>
      <button
        type="button"
        className="sb-annotation-group-header"
        aria-expanded={expanded.value}
        aria-label={
          expanded.value
            ? t("annotation-group-collapse", {
                defaultValue: "Collapse group",
              })
            : t("annotation-group-expand", { defaultValue: "Expand group" })
        }
        onClick={() => (expanded.value = !expanded.value)}
      >
        <span className="sb-annotation-group-header-title">{label}</span>
        <MaterialIcon
          className={`sb-annotation-group-header-icon${
            expanded.value ? "" : " sb-annotation-group-header-icon--collapsed"
          }`}
        >
          expand_more
        </MaterialIcon>
      </button>
      {expanded.value ? (
        <ul className="sb-annotation-group-list">
          {group.annotations.map((annotation) => (
            <li key={annotation.id} className="sb-annotation-item" dir="auto">
              <div className="sb-annotation-item-main">
                {annotation.data.type === "comment" && (
                  <AnnotationPreview
                    html={annotation.data.html}
                    onReferenceClick={onReferenceClick}
                  />
                )}
                <AnnotationCommentMeta
                  annotation={annotation}
                  login={login}
                  t={t}
                  language={language}
                  otherPeoplePresent={otherPeoplePresent}
                />
              </div>
              <ContextMenuWithButton
                buttonClassName="sb-annotation-item-menu"
                aria-label={t("annotation-options", {
                  defaultValue: "Annotation options",
                })}
              >
                <ContextMenuItem
                  onClick={() => {
                    console.log("Editing annotation", annotation);
                    annotations.editAnnotation(annotation);
                  }}
                >
                  <MaterialIcon className="sb-context-menu-item-icon">
                    edit
                  </MaterialIcon>
                  {t("edit-annotation", { defaultValue: "Edit" })}
                </ContextMenuItem>
                <ContextMenuItem
                  className="sb-context-menu-item--danger"
                  onClick={() => {
                    openDeleteAnnotationConfirm(
                      modals,
                      annotations,
                      annotation,
                      toast
                    );
                  }}
                >
                  <MaterialIcon className="sb-context-menu-item-icon">
                    delete
                  </MaterialIcon>
                  {t("delete-annotation", { defaultValue: "Delete" })}
                </ContextMenuItem>
              </ContextMenuWithButton>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

interface BibleReaderToolbarProps {
  state: SeedBibleState;
}

export function BibleReaderToolbar(props: BibleReaderToolbarProps) {
  const {
    tabs,
    selector,
    panes,
    tabsLayout,
    sidebar,
    chats,
    tools: toolsManager,
    settings,
    bookmarks,
    login,
  } = props.state;
  const selectedTab = useComputed(
    () =>
      tabs.tabs.value.find((tab) => tab.id === tabs.selectedTabId.value) ?? null
  );
  const readingState = useComputed(
    () => selectedTab.value?.readingState ?? null
  );
  const sessionState = useComputed(
    () => selectedTab.value?.sharedSession ?? null
  );

  if (!readingState.value) {
    return null;
  }

  // `BibleReaderToolbar` is a sibling of `<TabsLayout>` (which contains
  // `BibleReader`), not a descendant of it — `BibleReader.tsx` suspending on
  // its own chapter load does nothing for this component, since
  // `preact-render-to-string` only defers the specific subtree that actually
  // threw. Without this, the tools below (`hasNext`/`hasPrevious`-driven
  // chapter nav buttons among them) render off of whatever `chapterData`/
  // `translationBooks` happen to hold on the very first synchronous pass —
  // typically nothing yet — baking incorrect availability into the SSR HTML
  // that a live client would never show.
  if (
    import.meta.env.SSR &&
    !readingState.value.initialChapterLoadSettled.value
  ) {
    throw readingState.value.chapterDataPromise;
  }

  const viewportWidth = props.state.app.viewportWidth;
  const viewportHeight = props.state.app.viewportHeight;

  const tools = useComputed(() => {
    const resolved = toolsManager.getToolbarTools({
      readingState: readingState.value!,
      sharedSession: sessionState.value,
      selectorState: selector,
      tabs: tabs,
      panesManager: panes,
      tabsLayoutManager: tabsLayout,
      readingPlans: props.state.readingPlans,
      playlists: props.state.playlists,
      features: props.state.features,
      window: {
        isMobile: props.state.app.isMobile.value,
      },
      chats,
      openSidebar: sidebar.openSidebar,
      openSearch: sidebar.openSearch,
      openChat: sidebar.toggleChatPanel,
      openDiscover: props.state.app.openDiscover,
      toast: props.state.app.toast,
      modals: props.state.modals,
      app: props.state.app,
      annotations: props.state.annotations,
    });
    return applyToolbarCustomization(resolved, settings.settings.value.toolbar);
  });

  const unreadChatIndicator = useComputed(() => {
    if (chats.numberOfUnreadMessages.value <= 0) {
      return null;
    }

    if (chats.wasMentioned.value) {
      return "@";
    }

    return chats.numberOfUnreadMessages.value > 99
      ? "99+"
      : `${chats.numberOfUnreadMessages.value}`;
  });

  const hasTypingInChats = useComputed(() =>
    chats.chats.value.some((chat) =>
      chat.typingParticipants.value.some((participant) => !participant.isSelf)
    )
  );

  const hiddenToolIds = new Set(["open-search"]);

  const moreTools = useComputed(() =>
    tools.value.filter(
      (tool) =>
        tool.visible.value && !hiddenToolIds.has(tool.id) && tool.isControllable
    )
  );

  // Whether the chat tool is tucked inside the mobile More menu. When it is, its
  // unread badge is hidden until the menu is opened, so the More tab itself
  // needs to carry the indicator.
  const chatInMoreMenu = useComputed(() =>
    moreTools.value.some((tool) => tool.id === "open-chat")
  );

  const verseToolbarTools = useComputed(() => {
    const resolved = toolsManager.getVerseToolbarTools({
      readingState: readingState.value!,
      sharedSession: sessionState.value,
      selectorState: selector,
      tabs: tabs,
      panesManager: panes,
      tabsLayoutManager: tabsLayout,
      readingPlans: props.state.readingPlans,
      playlists: props.state.playlists,
      features: props.state.features,
      window: {
        isMobile: props.state.app.isMobile.value,
      },
      chats,
      openSidebar: sidebar.openSidebar,
      openSearch: sidebar.openSearch,
      openChat: sidebar.openChatPanel,
      openDiscover: props.state.app.openDiscover,
      toast: props.state.app.toast,
      modals: props.state.modals,
      app: props.state.app,
      annotations: props.state.annotations,
    });

    const { selectionUI } = settings.settings.value;
    if (!selectionUI.showHighlightColors) {
      return resolved.filter(
        (tool) =>
          !tool.id.startsWith("highlight-") && tool.id !== "clear-highlights"
      );
    }
    return resolved;
  });

  const hasVerseSelection = useComputed(
    () => readingState.value!.selectedVerses.value.length > 0
  );
  // Align with the app-wide mobile breakpoint (`state.app.isMobile`, 480px).
  // Kept as a local computed signal so its own viewport listener continues to
  // drive re-renders even if `app.isMobile` is not consumed elsewhere.
  const isSmallScreen = props.state.app.isMobile;
  // A pane fills the whole screen when it's fullscreen, or (on mobile) for any
  // open pane — mobile renders every pane fullscreen. Mirrors the "fills the
  // screen" rule in PanesManager/SeedBibleStateManager. Used to hide the
  // floating chapter nav so it doesn't float on top of a fullscreen pane.
  const isFullscreenPaneVisible = useComputed(() =>
    panes.panes.value.some(
      (pane) => pane.placement === "fullscreen" || isSmallScreen.value
    )
  );
  // The verse toolbar belongs to the reader, so it's suspended (not dismissed)
  // while a pane covers the reader — otherwise it floats on top of the pane and
  // hides most of it. The selection itself is kept, so the toolbar comes back
  // exactly as it was once the pane is closed.
  const isVerseToolbarVisible = useComputed(
    () => hasVerseSelection.value && !isFullscreenPaneVisible.value
  );
  const shouldReplaceDefaultToolbar = useComputed(
    () => isSmallScreen.value && isVerseToolbarVisible.value
  );
  const isMoreMenuOpen = useSignal(false);
  // The mobile More button, so dismissing its menu with Escape can hand focus
  // back to it instead of dropping it on the removed popover.
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  // Bottom chrome elements whose measured height drives
  // `--sb-reader-bottom-inset` on the document (chapter padding clears them).
  const toolbarWrapRef = useRef<HTMLDivElement>(null);
  const verseToolbarRef = useRef<HTMLDivElement>(null);
  const selectedToolbarToolId = useSignal<string | null>(null);
  const selectedVerseToolId = useSignal<string | null>(null);
  // Whether the mobile verse sheet is showing its overflow actions. Collapsed by
  // default; reset whenever the selection clears. Reached by dragging the grab
  // handle up, or tapping it.
  const isVerseSheetExpanded = useSignal(false);

  /**
   * Natural height of the sheet's overflow row, measured from the DOM.
   *
   * The reveal is animated as an explicit pixel height (`height: auto` can't be
   * transitioned and can't track a finger), so the target has to be measured
   * rather than assumed.
   */
  const verseSheetOverflowHeight = useSignal(0);

  /**
   * How much of the overflow row is showing *right now*, in pixels, while a drag
   * is in progress. Null when no drag is active, which hands the height back to
   * the expanded/collapsed state so it can animate to its resting position.
   */
  const verseSheetDragReveal = useSignal<number | null>(null);

  /**
   * How far the whole sheet is pushed down by a dismiss drag, in pixels. Only a
   * downward drag on an already-collapsed sheet moves this; releasing either
   * dismisses the selection or springs it back to 0.
   */
  const verseSheetDismissOffset = useSignal(0);

  /** True while a finger is on the handle, so the settle animations stand down. */
  const isVerseSheetDragging = useComputed(
    () => verseSheetDragReveal.value !== null
  );

  /** Whether there is anything to reveal — no overflow row, nothing to drag to. */
  const hasVerseSheetOverflow = useComputed(
    () => verseSheetOverflowHeight.value > 0
  );

  /**
   * The overflow row's height as rendered: tracking the finger mid-drag,
   * otherwise the resting height for the current expanded state (which the CSS
   * transition animates towards).
   */
  const verseSheetRevealHeight = useComputed(() =>
    verseSheetDragReveal.value !== null
      ? verseSheetDragReveal.value
      : isVerseSheetExpanded.value
        ? verseSheetOverflowHeight.value
        : 0
  );

  // True when the sidebar drawer is open showing the tabs/bookmarks view
  // (not the settings view) with the bookmark filter active.
  const isBookmarksViewOpen = useComputed(
    () =>
      sidebar.isMobileOpen.value &&
      !sidebar.isSettingsOpen.value &&
      bookmarks.isFilterActive.value
  );

  // True when the sidebar drawer is open showing the tabs list (not the
  // settings view and not the bookmark filter view).
  const isTabsViewOpen = useComputed(
    () =>
      sidebar.isMobileOpen.value &&
      !sidebar.isSettingsOpen.value &&
      !bookmarks.isFilterActive.value
  );

  const isTodayOpen = useComputed(() => props.state.today.isOpen.value);
  const activeMobileTab = useComputed<
    "today" | "bible" | "search" | "tabs" | "bookmarks" | "more" | "none"
  >(() => {
    if (isMoreMenuOpen.value) return "more";
    if (sidebar.isSearchPanelOpen.value) return "search";
    // The account ("You") control now lives in the reader header, so an open
    // settings view no longer maps to a bottom-bar tab.
    if (sidebar.isSettingsOpen.value) return "none";
    if (isBookmarksViewOpen.value) {
      // Bookmarks is always a top-level tab, so highlight it whenever its
      // view is open.
      return "bookmarks";
    }
    if (isTodayOpen.value) return "today";
    // Some other extension pane is covering the reader (opened from More).
    if (isFullscreenPaneVisible.value) return "more";
    if (sidebar.isMobileOpen.value) {
      // Tabs is a top-level tab only when there's no overflow. When it lives
      // inside the More menu, keep nothing highlighted.
      return moreTools.value.length > 0 ? "none" : "tabs";
    }
    return "bible";
  });

  const previousChapterTool = useComputed(
    () => tools.value.find((tool) => tool.id === "previous-chapter") ?? null
  );
  const nextChapterTool = useComputed(
    () => tools.value.find((tool) => tool.id === "next-chapter") ?? null
  );
  const openSelectorTool = useComputed(
    () => tools.value.find((tool) => tool.id === "open-selector") ?? null
  );
  // The audio-reader extension's play/pause control, surfaced here instead
  // of the quick toolbar on mobile.
  const audioPlayTool = useComputed(
    () =>
      toolsManager
        .getQuickTools({
          readingState: readingState.value!,
          playlists: props.state.playlists,
          features: props.state.features,
          surface: "mobile-navigation-bar",
        })
        .find((tool) => tool.id === "ext_audioReader-play") ?? null
  );
  // The mobile floating nav pill sits above everything, including the
  // fullscreen Discover panel used for playback. While a playlist is
  // playing, its chapter prev/next arrows are replaced with playlist
  // item prev/next arrows so they don't fight the playlist's own navigation.
  const playingPlaylist = useComputed(
    () => props.state.playlists.playing.value
  );

  const floatingAnchor = useComputed(() =>
    readingState.value!.selectedVerses.value.reduce<{
      x: number;
      y: number;
      selectedAt: number;
    } | null>((latest, verse) => {
      if (
        typeof verse.selectionX !== "number" ||
        typeof verse.selectionY !== "number"
      ) {
        return latest;
      }

      const selectedAt = verse.selectedAt ?? 0;
      if (!latest || selectedAt >= latest.selectedAt) {
        return {
          x: verse.selectionX,
          y: verse.selectionY,
          selectedAt,
        };
      }

      return latest;
    }, null)
  );
  const uiScale = useComputed(
    () => UI_SIZE_SCALE_MAP[settings.settings.value.uiSize]
  );
  // Verse toolbar highlight picker state (declared early so position clamping
  // can account for the picker's taller fallback height before measure).
  const isHighlightPickerOpen = useSignal(false);
  // Mobile color-strip hint: shown when the picker opens, cleared after the
  // first horizontal swipe, and reset the next time the picker is opened.
  // Component-local only — not persisted across sessions/reloads.
  const showHighlightColorSwipeHint = useSignal(true);
  const colorSwatchesRef = useRef<HTMLDivElement | null>(null);
  // Measured height of the floating desktop verse toolbar. Uses the same
  // `verseToolbarRef` already attached for `--sb-reader-bottom-inset` measuring.
  // The toolbar uses `transform: translate(-50%, -100%)`, so `top` is the bottom
  // edge — we need the real height so the taller color picker stays on-screen.
  const verseToolbarHeight = useSignal(0);

  const floatingX = useComputed(() => {
    const inset = 84 * uiScale.value;
    return Math.min(
      Math.max(floatingAnchor.value?.x ?? viewportWidth.value / 2, inset),
      Math.max(inset, viewportWidth.value - inset)
    );
  });
  const floatingY = useComputed(() => {
    const scale = uiScale.value;
    // Prefer sitting just above the selection anchor.
    const preferredY = (floatingAnchor.value?.y ?? 0) - 16 * scale;
    // Fallback heights before ResizeObserver measures (avoids a clip flash).
    const measured = verseToolbarHeight.value;
    const fallback = (isHighlightPickerOpen.value ? 200 : 88) * scale;
    const height = measured > 0 ? measured : fallback;
    // Bottom of the toolbar is at `top`; top of toolbar is at `top - height`.
    // Keep a small viewport inset so nothing is flush with the browser chrome.
    const topInset = 8 * scale;
    const bottomInset = 8 * scale;
    const minY = topInset + height;
    const maxY = Math.max(minY, viewportHeight.value - bottomInset);
    return Math.min(Math.max(preferredY, minY), maxY);
  });

  // Drag-to-move offset applied on top of the anchor-computed position.
  // Reset when a fresh verse selection arrives so the toolbar re-docks.
  const verseToolbarOffset = useSignal({ dx: 0, dy: 0 });
  const verseToolbarDrag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startDx: number;
    startDy: number;
  } | null>(null);
  const lastSelectedAtRef = useRef<number | null>(null);

  const currentSelectedAt = floatingAnchor.value?.selectedAt ?? null;
  if (lastSelectedAtRef.current !== currentSelectedAt) {
    lastSelectedAtRef.current = currentSelectedAt;
    verseToolbarOffset.value = { dx: 0, dy: 0 };
  }

  // Keep the measured height current as the picker expands/collapses.
  useEffect(() => {
    if (isSmallScreen.value || !isVerseToolbarVisible.value) {
      verseToolbarHeight.value = 0;
      return;
    }
    const el = verseToolbarRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const measure = () => {
      verseToolbarHeight.value = el.offsetHeight;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [
    isSmallScreen.value,
    isVerseToolbarVisible.value,
    isHighlightPickerOpen.value,
  ]);

  // When the mobile color picker opens, reset the strip to the start so the
  // "Swipe to see more" hint is meaningful for this open session.
  useEffect(() => {
    if (!isHighlightPickerOpen.value || !isSmallScreen.value) return;
    const el = colorSwatchesRef.current;
    if (!el) return;
    el.scrollLeft = 0;
  }, [isHighlightPickerOpen.value, isSmallScreen.value]);

  // Final on-screen position after drag, clamped so the taller picker can't be
  // dragged (or open) past the top/bottom of the viewport either.
  const clampedToolbarTop = useComputed(() => {
    const scale = uiScale.value;
    const topInset = 8 * scale;
    const bottomInset = 8 * scale;
    const measured = verseToolbarHeight.value;
    const fallback = (isHighlightPickerOpen.value ? 200 : 88) * scale;
    const height = measured > 0 ? measured : fallback;
    const minY = topInset + height;
    const maxY = Math.max(minY, viewportHeight.value - bottomInset);
    const y = floatingY.value + verseToolbarOffset.value.dy;
    return Math.min(Math.max(y, minY), maxY);
  });
  const clampedToolbarLeft = useComputed(() => {
    const inset = 84 * uiScale.value;
    const x = floatingX.value + verseToolbarOffset.value.dx;
    return Math.min(
      Math.max(x, inset),
      Math.max(inset, viewportWidth.value - inset)
    );
  });

  const handleVerseToolbarPointerDown = (event: PointerEvent) => {
    if (isSmallScreen.value) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("button")) return;
    const container = event.currentTarget as HTMLElement;
    container.setPointerCapture?.(event.pointerId);
    verseToolbarDrag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startDx: verseToolbarOffset.value.dx,
      startDy: verseToolbarOffset.value.dy,
    };
    event.preventDefault();
  };

  const handleVerseToolbarPointerMove = (event: PointerEvent) => {
    const drag = verseToolbarDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    verseToolbarOffset.value = {
      dx: drag.startDx + (event.clientX - drag.startX),
      dy: drag.startDy + (event.clientY - drag.startY),
    };
  };

  const handleVerseToolbarPointerUp = (event: PointerEvent) => {
    const drag = verseToolbarDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const container = event.currentTarget as HTMLElement;
    container.releasePointerCapture?.(event.pointerId);
    verseToolbarDrag.current = null;
  };

  /**
   * Dragging the mobile verse sheet's grab handle.
   *
   * The sheet follows the finger rather than snapping at a threshold: dragging up
   * grows the overflow row a pixel at a time, dragging back down shrinks it, and
   * once the overflow row is fully closed — whether the drag started collapsed or
   * (after closing it mid-gesture) expanded — continuing to drag down slides the
   * whole sheet toward the bottom of the screen to dismiss it, all in one
   * continuous motion rather than requiring a release and a second drag.
   * Releasing settles to whichever resting position the gesture ended up nearest,
   * so a half-finished drag animates the rest of the way instead of being
   * abandoned.
   *
   * A press that barely moves is a tap, and toggles.
   */
  const VERSE_SHEET_TAP_SLOP = 6;
  /** How far the sheet must be pushed down before releasing dismisses it. */
  const VERSE_SHEET_DISMISS_THRESHOLD = 64;
  const verseSheetDrag = useRef<{
    pointerId: number;
    startY: number;
    startExpanded: boolean;
    /** Overflow height showing when the drag began: full when expanded, else 0. */
    startReveal: number;
    /** Furthest the pointer has travelled, used to tell a tap from a drag. */
    maxTravel: number;
  } | null>(null);

  /** The overflow row, measured so the reveal has a pixel target to animate to. */
  const measureVerseSheetOverflow = (element: HTMLElement | null) => {
    if (!element) return;
    verseSheetOverflowHeight.value = element.scrollHeight;
  };

  const endVerseSheetDrag = (event: PointerEvent): void => {
    const handle = event.currentTarget as HTMLElement;
    handle.releasePointerCapture?.(event.pointerId);
    verseSheetDrag.current = null;
    verseSheetDragReveal.value = null;
    verseSheetDismissOffset.value = 0;
  };

  const handleVerseSheetHandlePointerDown = (event: PointerEvent) => {
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture?.(event.pointerId);
    const expanded = isVerseSheetExpanded.value;
    verseSheetDrag.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startExpanded: expanded,
      startReveal: expanded ? verseSheetOverflowHeight.value : 0,
      maxTravel: 0,
    };
    // Take over the height from the expanded/collapsed state so the first move
    // continues from where the sheet is now rather than jumping.
    verseSheetDragReveal.value = expanded ? verseSheetOverflowHeight.value : 0;
    // Keep the drag from also scrolling the chapter behind the sheet.
    event.preventDefault();
  };

  const handleVerseSheetHandlePointerMove = (event: PointerEvent) => {
    const drag = verseSheetDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dy = event.clientY - drag.startY;
    drag.maxTravel = Math.max(drag.maxTravel, Math.abs(dy));

    const overflowHeight = verseSheetOverflowHeight.value;
    // Up is negative, so subtracting `dy` grows the reveal as the finger rises.
    const reveal = Math.min(overflowHeight, Math.max(0, drag.startReveal - dy));
    verseSheetDragReveal.value = reveal;

    // Once the overflow row is fully closed, the rest of the same downward drag
    // slides the whole sheet away to dismiss. `dy` minus `startReveal` is how far
    // the finger has moved *past* the point where the row finished closing —
    // using that (rather than raw `dy`) means the dismiss slide picks up smoothly
    // from 0 instead of jumping by however much drag it took to close the row,
    // and it works the same whether the drag started collapsed (startReveal 0) or
    // expanded (startReveal the full row height).
    const distancePastClosed = dy - drag.startReveal;
    verseSheetDismissOffset.value =
      reveal === 0 && distancePastClosed > 0 ? distancePastClosed : 0;
  };

  const handleVerseSheetHandlePointerUp = (event: PointerEvent) => {
    const drag = verseSheetDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const dismissOffset = verseSheetDismissOffset.value;
    const reveal = verseSheetDragReveal.value ?? drag.startReveal;
    const overflowHeight = verseSheetOverflowHeight.value;
    endVerseSheetDrag(event);

    if (drag.maxTravel <= VERSE_SHEET_TAP_SLOP) {
      // A tap on the handle is the keyboard-free way to toggle, and the only
      // affordance left now that the sheet has no "More" card.
      if (overflowHeight > 0) {
        isVerseSheetExpanded.value = !drag.startExpanded;
      }
      return;
    }

    if (dismissOffset >= VERSE_SHEET_DISMISS_THRESHOLD) {
      readingState.value?.clearSelectedVerses();
      return;
    }

    // Settle to whichever end the drag finished nearest. Using the midpoint
    // rather than a fixed threshold means the sheet always ends up where the
    // finger left it pointing, in either direction.
    isVerseSheetExpanded.value =
      overflowHeight > 0 && reveal >= overflowHeight / 2;
  };

  const handleVerseSheetHandlePointerCancel = (event: PointerEvent) => {
    const drag = verseSheetDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    endVerseSheetDrag(event);
    // An interrupted gesture shouldn't leave the sheet half-committed.
    isVerseSheetExpanded.value = drag.startExpanded;
  };

  /**
   * Elements inside the mobile sheet that must keep their own tap/scroll
   * behavior instead of starting the sheet drag: buttons and inputs (so taps
   * still register as clicks — capturing the pointer on the panel would
   * otherwise steal their `pointerup`), and the horizontal highlight-color
   * strip (its own swipe gesture would fight the sheet's vertical one).
   */
  const VERSE_SHEET_DRAG_IGNORE_SELECTOR =
    "button, input, a, .sb-verse-toolbar-swatches";

  /**
   * Entry point for the whole-panel version of the handle drag: any part of
   * the collapsed/expanded mobile sheet not covered by the ignore list above
   * starts the same drag tracked by the handle, so the user doesn't have to
   * land a thumb precisely on the handle to expand, collapse, or dismiss it.
   * Not wired up while the highlight picker is showing — that view has no
   * overflow row to reveal, and its swatch strip already owns horizontal
   * swipes.
   */
  const handleVerseSheetPanelPointerDown = (event: PointerEvent) => {
    if (isHighlightPickerOpen.value) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest(VERSE_SHEET_DRAG_IGNORE_SELECTOR)) return;
    handleVerseSheetHandlePointerDown(event);
  };

  const handleVerseSheetHandleKeyDown = (event: KeyboardEvent) => {
    if (verseSheetOverflowHeight.value <= 0) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      isVerseSheetExpanded.value = !isVerseSheetExpanded.value;
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      isVerseSheetExpanded.value = true;
    } else if (event.key === "ArrowDown" || event.key === "Escape") {
      event.preventDefault();
      isVerseSheetExpanded.value = false;
    }
  };

  // Verse toolbar highlight picker state
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const customColorCommitTimeoutRef = useRef<number | null>(null);
  const customHighlightColors = useComputed(
    () => settings.settings.value.customHighlightColors
  );
  const selectionUI = useComputed(() => settings.settings.value.selectionUI);

  // The most recent color from a still-pending debounce, so a blur that
  // lands before the debounce fires can apply it immediately instead of
  // losing it. `null` once there's nothing pending.
  const customColorPendingRef = useRef<string | null>(null);
  // Whether any color from the current "Add custom color" session has been
  // applied yet — distinguishes "the dialog closed after picking a color"
  // (clear the selection) from "the dialog closed without picking one"
  // (leave the selection alone; nothing happened).
  const customColorAppliedRef = useRef(false);

  const applyCustomColor = (color: string, clearSelection: boolean) => {
    settings.addCustomHighlightColor(color);
    const rs = readingState.value;
    if (rs) {
      applyHighlightWithSession(
        rs,
        sessionState.value,
        {
          colorId: "yellow",
          customColor: color,
          customFontColor: getContrastTextColor(color),
        },
        !!login.userId.value,
        clearSelection
      );
    }
    customColorAppliedRef.current = true;
  };

  // Debounce the commit so rapid `input`/`change` events from the native
  // color picker (fired as the user drags) don't add each intermediate color
  // to the custom palette — only the settled color is saved. These debounced
  // commits never clear the selection themselves: the color dialog may still
  // be open, and clearing here would silently drop any further tweaking
  // within the same dialog session (#1725). The selection is cleared for real
  // in `finishCustomColor`, once the input actually loses focus.
  const commitCustomColor = (color: string) => {
    if (customColorCommitTimeoutRef.current !== null) {
      window.clearTimeout(customColorCommitTimeoutRef.current);
    }
    customColorPendingRef.current = color;
    customColorCommitTimeoutRef.current = window.setTimeout(() => {
      customColorCommitTimeoutRef.current = null;
      const pending = customColorPendingRef.current;
      customColorPendingRef.current = null;
      if (pending !== null) {
        applyCustomColor(pending, false);
      }
    }, 300);
  };

  // Runs when the color input loses focus, i.e. the OS color dialog closed —
  // the reliable "the user is done" signal, since the native `change` event
  // this input would otherwise fire is what `onChange` gets rewritten to
  // listen for as `input` (see the `onChange`/`onInput` props below), so it
  // can't be used to distinguish "still dragging" from "done" on its own.
  // Flushes a still-debounced pick immediately rather than waiting the
  // remaining 300ms, and only clears the selection if a color was actually
  // applied this dialog session (closing without picking one leaves the
  // selection untouched, same as before).
  const finishCustomColor = () => {
    if (customColorCommitTimeoutRef.current !== null) {
      window.clearTimeout(customColorCommitTimeoutRef.current);
      customColorCommitTimeoutRef.current = null;
    }
    const pending = customColorPendingRef.current;
    customColorPendingRef.current = null;
    if (pending !== null) {
      applyCustomColor(pending, true);
    } else if (customColorAppliedRef.current) {
      readingState.value?.clearSelectedVerses();
    }
    customColorAppliedRef.current = false;
  };

  // Clear removes a saved highlight *and* the session's broadcast copy, so it
  // stays enabled while either is present. Testing only decorations inside a
  // session meant the button greyed itself out the moment the session's
  // highlight timer expired, with the saved highlight still on screen.
  const hasAnyHighlighted = useComputed(() => {
    const rs = readingState.value;
    if (!rs) return false;

    const hasSavedHighlight = rs.selectedVerses.value.some((verse) =>
      rs.highlights.value.highlights.some((highlight) =>
        highlightContainsVerse(highlight, verse.verse.number)
      )
    );
    if (hasSavedHighlight) {
      return true;
    }

    const session = sessionState.value;
    if (!session || !session.userCanDecorate(session.localSessionId.value)) {
      return false;
    }

    // Only decorations clear can actually remove — its own shared highlights,
    // by deterministic id. An unrelated decoration from an extension sitting on
    // the same verse shouldn't light up a button that won't touch it.
    const decorationIds = new Set(
      rs.decorations.value.map((decoration) => decoration.id)
    );
    return rs.selectedVerses.value.some((verse) =>
      decorationIds.has(
        sharedHighlightDecorationId(
          verse.bookId,
          verse.chapterNumber,
          verse.verse.number
        )
      )
    );
  });

  const selectedVersesReference = useComputed(() => {
    const rs = readingState.value;
    if (!rs) return "";
    const verses = rs.selectedVerses.value;
    const firstVerse = verses[0];
    if (!firstVerse) return "";

    const bookName = rs.chapterData.value?.book.name ?? firstVerse.bookId;
    const chapter = firstVerse.chapterNumber;
    const numbers = verses.map((v) => v.verse.number).sort((a, b) => a - b);
    const ranges: string[] = [];
    let start = numbers[0]!;
    let end = start;
    for (let i = 1; i < numbers.length; i++) {
      const next = numbers[i]!;
      if (next === end + 1) {
        end = next;
      } else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        start = next;
        end = next;
      }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    return `${bookName} ${chapter}:${ranges.join(",")}`;
  });

  // Annotations covering any of the currently selected verses — shown
  // read-only in the mobile verse sheet once it's expanded. Computed by the
  // reading state itself (see `BibleReadingManager.tsx`), which already
  // tracks both the active chapter's annotations and the live selection.
  const selectionAnnotations = useComputed(
    () => readingState.value?.selectionAnnotations.value ?? []
  );

  // Reset picker and the mobile sheet's expanded state when selection clears.
  // The drag offsets go too: a sheet dismissed by dragging it down would
  // otherwise come back for the next selection still pushed off the screen.
  useEffect(() => {
    if (!hasVerseSelection.value) {
      isHighlightPickerOpen.value = false;
      isVerseSheetExpanded.value = false;
      verseSheetDragReveal.value = null;
      verseSheetDismissOffset.value = 0;
    }
  }, [hasVerseSelection.value]);

  // Clicking an annotated verse number (BibleReader.tsx) sets this once;
  // expand the sheet and scroll to that verse's annotation group, then clear
  // it. Mirrors `readingState.scrollToVerse`'s consumer in TabsLayout.tsx.
  useEffect(() => {
    const rs = readingState.value;
    if (!rs) return;

    let frame = 0;
    const dispose = effect(() => {
      const verseNumber = rs.pendingAnnotationScrollVerse.value;
      if (verseNumber === null) return;
      rs.pendingAnnotationScrollVerse.value = null; // consume once, immediately

      const group = groupAnnotationsByVerseRange(
        selectionAnnotations.value
      ).find((g) =>
        g.annotations.some((a) =>
          annotationVerseNumbers(a).includes(verseNumber)
        )
      );
      if (!group) return;

      isVerseSheetExpanded.value = true;
      const groupKey =
        group.annotations[0]?.id ??
        `${group.startVerseNumber}-${group.endVerseNumber}`;

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        document
          .getElementById(`sb-verse-toolbar-annotation-group-${groupKey}`)
          ?.scrollIntoView({ block: "nearest" });
      });
    });

    return () => {
      cancelAnimationFrame(frame);
      dispose();
    };
  }, [readingState.value]);

  // Keep `--sb-reader-bottom-inset` in sync with the open bottom chrome so
  // chapter content / end-of-chapter controls clear it when the toolbar grows
  // (mobile verse sheet "More", floating nav appearing, UI scale, etc.).
  //
  // The observers are built once and only re-pointed when the open chrome
  // changes (see the effect below) — rebuilding them per signal change churned
  // allocations and re-fired ResizeObserver's initial callback each time.
  const reobserveInsetRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (typeof ResizeObserver === "undefined") return;

    let frame = 0;
    let lastValue = "";

    // `--sb-reader-bottom-inset` is inherited by the whole document, so writing
    // it invalidates style for every element in the chapter. Most measures
    // produce the value we already wrote (a re-point, a child mutation, an
    // observer's initial callback), so only write on a real change.
    const write = (chromePx: number) => {
      const next = `${chromePx + BOTTOM_CHROME_GAP_PX}px`;
      if (next === lastValue) return;
      lastValue = next;
      root.style.setProperty("--sb-reader-bottom-inset", next);
    };

    const measure = () => {
      const verse = verseToolbarRef.current;
      if (verse?.classList.contains("sb-verse-toolbar-mobile")) {
        write(verse.offsetHeight);
        return;
      }

      const wrap = toolbarWrapRef.current;
      const toolbar = wrap?.querySelector(".sb-reader-toolbar");
      if (!(toolbar instanceof HTMLElement)) return;

      let insetPx = toolbar.offsetHeight;
      const nav = wrap?.querySelector(".sb-reader-floating-nav");
      if (nav instanceof HTMLElement) {
        insetPx += nav.offsetHeight;
      } else {
        // Desktop: toolbar floats above the viewport bottom.
        const bottom = parseFloat(getComputedStyle(toolbar).bottom);
        if (!Number.isNaN(bottom)) insetPx += bottom;
      }

      write(insetPx);
    };

    const scheduleMeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    const observer = new ResizeObserver(scheduleMeasure);
    const mutationObserver =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(() => reobserve())
        : null;

    const reobserve = () => {
      observer.disconnect();
      mutationObserver?.disconnect();

      const verse = verseToolbarRef.current;
      const wrap = toolbarWrapRef.current;

      if (verse?.classList.contains("sb-verse-toolbar-mobile")) {
        observer.observe(verse);
      } else if (wrap) {
        observer.observe(wrap);
        const toolbar = wrap.querySelector(".sb-reader-toolbar");
        const nav = wrap.querySelector(".sb-reader-floating-nav");
        if (toolbar instanceof HTMLElement) observer.observe(toolbar);
        if (nav instanceof HTMLElement) observer.observe(nav);
        mutationObserver?.observe(wrap, { childList: true });
      }

      scheduleMeasure();
    };

    reobserveInsetRef.current = reobserve;
    reobserve();

    return () => {
      reobserveInsetRef.current = null;
      cancelAnimationFrame(frame);
      observer.disconnect();
      mutationObserver?.disconnect();
      // Drop the runtime override so the CSS fallback in base.css takes over.
      root.style.removeProperty("--sb-reader-bottom-inset");
    };
  }, []);

  // Re-point the observers at whichever chrome is now open. Cheap enough to run
  // on every one of these — `reobserve` only re-registers and schedules a
  // measure, and the measure no-ops unless the height actually moved.
  useEffect(() => {
    reobserveInsetRef.current?.();
  }, [
    shouldReplaceDefaultToolbar.value,
    isVerseToolbarVisible.value,
    isVerseSheetExpanded.value,
    isHighlightPickerOpen.value,
    isSmallScreen.value,
    activeMobileTab.value,
  ]);

  // Clicking anywhere outside a verse or the verse toolbar dismisses the
  // verse selection (and therefore the toolbar). Only while the toolbar is
  // actually showing — with a pane covering the reader every tap lands
  // "outside", which would silently throw the selection away behind the pane
  // instead of restoring the toolbar when the pane closes.
  //
  // Excluding only `.sb-verse-decorator` for a mouse (rather than the whole
  // `.sb-chapter-content` container, or even the whole `.sb-verse`) is
  // deliberate: a verse's own `onClick` already handles toggling that
  // verse's selection, so this listener has to stand aside for it, but empty
  // space within the chapter — padding, the gap between verse spans, a
  // section heading — isn't a verse, and a tap there is exactly the "click
  // off of it on an empty space on the page" this listener exists to catch.
  // `.sb-verse` itself is too generous a target for that with a mouse: a
  // poetry verse's outer span (`.sb-verse-poetry`, `BibleReader.tsx`) is
  // `display: block`, so it — and each `.sb-verse-line` inside it — spans the
  // full content width regardless of how short the actual line of text is,
  // making most of a poem's visible blank space still read as "on the verse".
  // A verse's own decorator span (`.sb-verse-decorator`) wraps only the words
  // actually rendered, so that's the mouse target instead.
  //
  // A touch is far less precise, though, and there's no in-between "blank
  // space" for a finger to miss into that a mouse pointer couldn't also land
  // on deliberately, so a touch keeps checking the full `.sb-verse` — a tap
  // between two wrapped poetry lines still counts as "on the verse" rather
  // than clearing the selection out from under the finger that just placed
  // it. `event.pointerType` (native to `PointerEvent`, no plumbing needed)
  // picks the selector; the verse's own `onClick` guard for the poetry case
  // makes the same touch/mouse distinction, using its own pointerdown for the
  // pointer type since a `click` never carries it.
  //
  // A pane docked beside the reader (e.g. Discover, open on desktop) doesn't
  // cover it, so `isVerseToolbarVisible` stays true and this listener stays
  // attached — clicks inside that pane (composing an annotation, say) are
  // also excluded so they can't clear a selection the pane's own content is
  // actively using (e.g. the annotation title/target derived from it). The
  // exclusion has to key on `.sb-pane-shell-detached` rather than the bare
  // `.sb-pane-shell` — every reader tab slot (`TabsLayout.tsx`) is *also* a
  // `.sb-pane-shell`, just without the `-detached` modifier a floating,
  // fullscreen, or overlay pane carries (`PaneLayout.tsx`), so matching the
  // bare class swallowed every click anywhere in the reader, verse or not,
  // and the toolbar could never be dismissed by clicking off of it.
  //
  // The annotation item's three-dot menu (`ContextMenuWithButton`) is
  // portaled to `document.body`, so a click on it — or on one of its
  // Edit/Delete items — doesn't land inside `.sb-verse-toolbar` in the DOM
  // tree even though it's visually part of the toolbar. Excluding
  // `.sb-context-menu` (the portaled popup) keeps that click from reading as
  // "outside" and clearing the selection out from under the still-open menu.
  // Same story for `.sb-footnote-modal-overlay` — the delete-confirmation
  // modal Delete opens renders as a sibling of the toolbar at the app root
  // (`ModalHost`), so without this, confirming or cancelling that dialog
  // would also clear the selection out from under it.
  useEffect(() => {
    if (!isVerseToolbarVisible.value) return;

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const verseTapSelector =
        event.pointerType === "touch" ? ".sb-verse" : ".sb-verse-decorator";
      if (target.closest(verseTapSelector)) return;
      if (target.closest(".sb-verse-toolbar")) return;
      if (target.closest(".sb-pane-side-shell")) return;
      if (target.closest(".sb-pane-shell-detached")) return;
      if (target.closest(".sb-context-menu")) return;
      if (target.closest(".sb-footnote-modal-overlay")) return;
      readingState.value?.clearSelectedVerses();
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
    };
  }, [isVerseToolbarVisible.value]);

  // Tapping anywhere outside the mobile More menu closes it. Deliberately done
  // with a document listener rather than a backdrop element so the tap still
  // reaches whatever was tapped — selecting a verse or hitting a top quick
  // toolbar button works normally while the menu is open, it just also
  // dismisses the menu. Capture phase so we still see the tap even if the
  // target stops propagation.
  //
  // `pointerdown` (rather than `click`) means a touch-scroll that starts while
  // the menu is open also dismisses it, since a scroll gesture begins with a
  // pointerdown. That is intended: it matches how dropdowns usually behave, and
  // dismissing as the gesture starts feels more responsive than waiting for it
  // to finish. Scrolling the menu's own list is unaffected — those touches land
  // inside the anchor and return early below.
  useEffect(() => {
    if (!isMoreMenuOpen.value) return;

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      // The anchor wraps both the More button and the popover, so this covers
      // taps on either. The button's own click handler does the toggling.
      if (target?.closest(".sb-reader-toolbar-more-anchor")) return;
      isMoreMenuOpen.value = false;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        isMoreMenuOpen.value = false;
        // Escape is a keyboard dismissal, so send focus back to the button that
        // opened the menu — otherwise it is left on the now-unmounted popover and
        // the next Tab starts over from the top of the document. Only for
        // Escape: after an outside tap the user is already interacting
        // somewhere else, and pulling focus back would fight them.
        moreButtonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener(
        "pointerdown",
        handleDocumentPointerDown,
        true
      );
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMoreMenuOpen.value]);

  const { t } = useI18n();

  const openTodayScreen = () => {
    isMoreMenuOpen.value = false;
    sidebar.closeSearchPanel();
    sidebar.closeChatPanel();
    sidebar.closeSettings();
    sidebar.closeSidebar();
    panes.closeAll();
    props.state.today.open();
  };

  // Opens (or closes) the tabs list in the sidebar drawer. Shared by the Tabs
  // bottom tab and the Tabs entry inside the More menu.
  const openTabsView = () => {
    isMoreMenuOpen.value = false;
    if (isTabsViewOpen.value) {
      // Already on the tabs list — tapping again closes it.
      sidebar.closeSidebar();
      return;
    }
    panes.closeAll();
    sidebar.closeSearchPanel();
    sidebar.closeChatPanel();
    sidebar.closeSettings();
    // Show the tabs list, not the bookmark filter view.
    if (bookmarks.isFilterActive.value) {
      bookmarks.toggleFilter();
    }
    bookmarks.openedFromToolbar.value = false;
    // Opened straight from the toolbar (not the book selector), so the tabs
    // header should show a Close (X), not a Back arrow to the selector.
    sidebar.tabsOpenedFromToolbar.value = true;
    sidebar.openSidebar();
  };

  // Opens (or closes) the bookmarks view in the sidebar drawer. Shared by the
  // Bookmarks bottom tab and the Bookmarks entry inside the More menu.
  const openBookmarksView = () => {
    isMoreMenuOpen.value = false;
    if (isBookmarksViewOpen.value) {
      bookmarks.closeView();
      sidebar.closeSidebar();
      return;
    }
    panes.closeAll();
    sidebar.closeSearchPanel();
    sidebar.closeChatPanel();
    sidebar.closeSettings();
    sidebar.openSidebar();
    bookmarks.openedFromToolbar.value = true;
    if (!bookmarks.isFilterActive.value) {
      bookmarks.toggleFilter();
    }
  };

  /**
   * Display name for a book id, resolved from the current translation's
   * catalog.
   *
   * The catalog covers every book and tracks the reader's position the instant
   * it moves; the loaded chapter only ever describes one book, and during a
   * fast skim it describes the one the reader has already left. Falls back to
   * the chapter only while that translation's catalog is still downloading, and
   * only when it happens to be the book being asked about.
   */
  const resolveBookName = (id: string | null | undefined): string => {
    if (!id) {
      return "";
    }
    const state = readingState.value;
    const loadedBook = state?.chapterData.value?.book;
    const book =
      state?.translationBooks.value?.books.find((b) => b.id === id) ??
      (loadedBook?.id === id ? loadedBook : null);
    return book?.name ?? book?.commonName ?? id;
  };

  const getReaderNavLabel = () => {
    return (
      <>
        <div>{resolveBookName(readingState.value?.bookId.value) || " "}</div>
        <div>{readingState.value?.chapterNumber.value}</div>
      </>
    );
  };

  const getPlayingNavLabel = (playing: PlayingState) => {
    const currentItem = playing.currentItem.value;
    if (currentItem) {
      const label = playlistItemLabel(currentItem, t, resolveBookName);
      return (
        <>
          <div>{label}</div>
        </>
      );
    }

    return getReaderNavLabel();
  };

  return (
    <>
      {!shouldReplaceDefaultToolbar.value && (
        <div
          ref={toolbarWrapRef}
          className="sb-reader-toolbar-wrap"
          dir={readingState.value?.translation.value?.textDirection ?? "auto"}
        >
          {isSmallScreen.value &&
            activeMobileTab.value === "bible" &&
            (() => {
              const audio =
                audioPlayTool.value && audioPlayTool.value.visible.value
                  ? audioPlayTool.value
                  : null;

              const playing = playingPlaylist.value;
              const prev = playing ? null : previousChapterTool.value;
              const next = playing ? null : nextChapterTool.value;
              const selector = openSelectorTool.value;
              if (!audio && !prev && !next && !selector && !playing) {
                return null;
              }

              const AudioIcon = audio?.icon;
              const PrevIcon = prev?.icon;
              const NextIcon = next?.icon;

              return (
                <div
                  className="sb-reader-floating-nav"
                  role="group"
                  aria-label={t("chapter-navigation", {
                    defaultValue: "Chapter navigation",
                  })}
                >
                  {!playing && audio && AudioIcon && (
                    <button
                      type="button"
                      disabled={audio.disabled.value}
                      onClick={() => audio.onSelect()}
                      className="sb-reader-floating-nav-play"
                      aria-label={translateTitle(t, audio.title)}
                    >
                      <AudioIcon />
                    </button>
                  )}
                  {playing && (
                    <button
                      type="button"
                      onClick={() => props.state.playlists.stopPlaying()}
                      className="sb-reader-floating-nav-play"
                      aria-label={t("stop", { defaultValue: "Stop" })}
                    >
                      <StopIcon />
                    </button>
                  )}

                  {(prev || next || selector || playing) && (
                    <div className="sb-reader-floating-nav-group">
                      {playing ? (
                        <button
                          type="button"
                          disabled={!playing.hasPrevious.value}
                          onClick={() => playing.previous()}
                          onPointerDown={spawnRipple}
                          className="sb-reader-floating-nav-arrow"
                          aria-label={t("previous", {
                            defaultValue: "Previous",
                          })}
                        >
                          <MaterialIcon>skip_previous</MaterialIcon>
                        </button>
                      ) : (
                        prev &&
                        PrevIcon && (
                          <button
                            type="button"
                            disabled={prev.disabled.value}
                            onClick={prev.onSelect}
                            onPointerDown={spawnRipple}
                            className="sb-reader-floating-nav-arrow"
                            aria-label={translateTitle(t, prev.title)}
                            data-tool-id={prev.id}
                          >
                            <PrevIcon />
                          </button>
                        )
                      )}

                      {playing ? (
                        <button
                          type="button"
                          onClick={() =>
                            (props.state.playlists.view.value = "play_playlist")
                          }
                          onPointerDown={spawnRipple}
                          className="sb-reader-floating-nav-label"
                        >
                          {getPlayingNavLabel(playing)}
                        </button>
                      ) : (
                        selector && (
                          <button
                            type="button"
                            {...flingSafeTapHandlers(
                              selector.onSelect,
                              spawnRipple
                            )}
                            className="sb-reader-floating-nav-label"
                          >
                            {getReaderNavLabel()}
                          </button>
                        )
                      )}

                      {playing ? (
                        <button
                          type="button"
                          disabled={!playing.hasNext.value}
                          onClick={() => playing.next()}
                          onPointerDown={spawnRipple}
                          className="sb-reader-floating-nav-arrow"
                          aria-label={t("next", { defaultValue: "Next" })}
                        >
                          <MaterialIcon>skip_next</MaterialIcon>
                        </button>
                      ) : (
                        next &&
                        NextIcon && (
                          <button
                            type="button"
                            disabled={next.disabled.value}
                            onClick={next.onSelect}
                            onPointerDown={spawnRipple}
                            className="sb-reader-floating-nav-arrow"
                            aria-label={translateTitle(t, next.title)}
                            data-tool-id={next.id}
                          >
                            <NextIcon />
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

          <div
            className={`sb-reader-toolbar${isSmallScreen.value ? " sb-reader-toolbar-mobile-layout" : " sb-reader-toolbar-labeled"}`}
          >
            {isSmallScreen.value ? (
              <>
                <MobileBottomTab
                  iconNode={
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M11.5 21H6C5.46957 21 4.96086 20.7893 4.58579 20.4142C4.21071 20.0391 4 19.5304 4 19V5C4 4.46957 4.21071 3.96086 4.58579 3.58579C4.96086 3.21071 5.46957 3 6 3H18C18.5304 3 19.0391 3.21071 19.4142 3.58579C19.7893 3.96086 20 4.46957 20 5V13"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M9 18H11"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                      <path
                        d="M15 19L17 21L21 17"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  }
                  label={t("today", { defaultValue: "Today" })}
                  active={activeMobileTab.value === "today"}
                  onClick={() => {
                    void openTodayScreen();
                  }}
                />

                <MobileBottomTab
                  iconName="search"
                  label={t("search", { defaultValue: "Search" })}
                  active={activeMobileTab.value === "search"}
                  onClick={() => {
                    isMoreMenuOpen.value = false;
                    panes.closeAll();
                    // Dismiss the tabs/bookmarks drawer if it's open.
                    sidebar.closeSidebar();
                    if (sidebar.isSearchPanelOpen.value) {
                      sidebar.closeSearchPanel();
                    } else {
                      sidebar.openSearchPanel();
                    }
                  }}
                />

                <MobileBottomTab
                  iconNode={
                    <SeedBibleIcon
                      size={24}
                      className="sb-reader-toolbar-seed-icon"
                    />
                  }
                  label={t("bible", { defaultValue: "Bible" })}
                  active={activeMobileTab.value === "bible"}
                  onClick={() => {
                    // The Bible text is already showing, so there's nothing to
                    // dismiss — open the book selector instead of doing nothing.
                    if (activeMobileTab.value === "bible") {
                      openSelectorTool.value?.onSelect();
                      return;
                    }
                    isMoreMenuOpen.value = false;
                    sidebar.closeSearchPanel();
                    sidebar.closeChatPanel();
                    sidebar.closeSettings();
                    sidebar.closeSidebar();
                    // Close any fullscreen pane (e.g. Today).
                    panes.closeAll();
                    selectedToolbarToolId.value = null;
                  }}
                />

                <MobileBottomTab
                  iconNode={
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill={
                        activeMobileTab.value === "bookmarks"
                          ? "currentColor"
                          : "none"
                      }
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        d="M18 7V21L12 17L6 21V7C6 5.93913 6.42143 4.92172 7.17157 4.17157C7.92172 3.42143 8.93913 3 10 3H14C15.0609 3 16.0783 3.42143 16.8284 4.17157C17.5786 4.92172 18 5.93913 18 7Z"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  }
                  label={t("bookmarks", { defaultValue: "Bookmarks" })}
                  active={activeMobileTab.value === "bookmarks"}
                  onClick={openBookmarksView}
                />

                {moreTools.value.length > 0 ? (
                  <div className="sb-reader-toolbar-item sb-reader-toolbar-mobile-tab sb-reader-toolbar-more-anchor">
                    <button
                      type="button"
                      ref={moreButtonRef}
                      onClick={() => {
                        // Opening the More menu should dismiss whatever else is
                        // covering the reader — the search bar, the chat panel,
                        // the settings view, or the tabs/bookmarks drawer — the
                        // same way the other bottom tabs do. Extension panes are
                        // left alone, since those are opened *from* this menu.
                        if (!isMoreMenuOpen.value) {
                          sidebar.closeSearchPanel();
                          sidebar.closeChatPanel();
                          sidebar.closeSettings();
                          sidebar.closeSidebar();
                        }
                        isMoreMenuOpen.value = !isMoreMenuOpen.value;
                      }}
                      className={`sb-reader-toolbar-button sb-reader-toolbar-mobile-tab-button${
                        activeMobileTab.value === "more"
                          ? " sb-reader-toolbar-mobile-tab-button-active"
                          : ""
                      }`}
                      aria-label={t("more", { defaultValue: "More" })}
                      aria-expanded={isMoreMenuOpen.value}
                    >
                      <span
                        className="material-symbols-outlined sb-reader-toolbar-mobile-tab-icon"
                        aria-hidden="true"
                      >
                        menu
                      </span>
                      <span className="sb-reader-toolbar-mobile-tab-label">
                        {t("more", { defaultValue: "More" })}
                      </span>
                      {chatInMoreMenu.value &&
                        !isMoreMenuOpen.value &&
                        unreadChatIndicator.value && (
                          <span
                            className="sb-reader-toolbar-unread-indicator"
                            aria-label={
                              chats.wasMentioned.value
                                ? "Unread mention"
                                : `Unread messages: ${unreadChatIndicator.value}`
                            }
                          >
                            {unreadChatIndicator.value}
                          </span>
                        )}
                      {chatInMoreMenu.value &&
                        !isMoreMenuOpen.value &&
                        hasTypingInChats.value && (
                          <span
                            className="sb-reader-toolbar-typing-indicator"
                            aria-label={t("someone-is-typing", {
                              defaultValue: "Someone is typing...",
                            })}
                          />
                        )}
                    </button>

                    {isMoreMenuOpen.value && (
                      <MobileMoreMenu
                        tools={moreTools.value}
                        unreadChatIndicator={unreadChatIndicator.value}
                        chatWasMentioned={chats.wasMentioned.value}
                        hasTypingInChats={hasTypingInChats.value}
                        pinnedItems={[
                          {
                            id: "tabs",
                            label: t("tabs", {
                              defaultValue: "Tabs",
                            }),
                            iconNode: <SbTabsIcon />,
                            onClick: openTabsView,
                          },
                        ]}
                        onClose={() => {
                          isMoreMenuOpen.value = false;
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <MobileBottomTab
                    iconNode={<SbTabsIcon />}
                    label={t("tabs", { defaultValue: "Tabs" })}
                    active={activeMobileTab.value === "tabs"}
                    onClick={openTabsView}
                  />
                )}
              </>
            ) : (
              tools.value.flatMap((tool) => {
                const ToolIcon = tool.icon;
                const menuItems =
                  tool.getItems?.().filter((item) => item.visible.value) ?? [];
                const hasMenuItems = menuItems.length > 0;
                const hideLabel = tool.hideLabel;
                const label = translateTitle(t, tool.title);
                if (!tool.visible.value) return [];
                const itemElement = (
                  <div
                    key={tool.id}
                    className={`sb-reader-toolbar-item${hideLabel ? " sb-reader-toolbar-item-arrow" : ""}`}
                  >
                    <button
                      disabled={tool.disabled.value}
                      onClick={() => {
                        if (hasMenuItems) {
                          selectedToolbarToolId.value =
                            selectedToolbarToolId.value === tool.id
                              ? null
                              : tool.id;
                          return;
                        }

                        selectedToolbarToolId.value = null;
                        tool.onSelect();
                      }}
                      data-tool-id={tool.id}
                      className="sb-reader-toolbar-button"
                      aria-label={label}
                    >
                      <ToolIcon />
                      {hideLabel ? (
                        <span className="sr-only">{label}</span>
                      ) : (
                        <span className="sb-reader-toolbar-button-label">
                          {label}
                        </span>
                      )}
                      {tool.id === "open-chat" && unreadChatIndicator.value && (
                        <span
                          className="sb-reader-toolbar-unread-indicator"
                          aria-label={
                            chats.wasMentioned.value
                              ? "Unread mention"
                              : `Unread messages: ${unreadChatIndicator.value}`
                          }
                        >
                          {unreadChatIndicator.value}
                        </span>
                      )}
                      {tool.id === "open-chat" && hasTypingInChats.value && (
                        <span
                          className="sb-reader-toolbar-typing-indicator"
                          aria-label={t("someone-is-typing", {
                            defaultValue: "Someone is typing...",
                          })}
                        />
                      )}
                    </button>
                    {hasMenuItems &&
                      selectedToolbarToolId.value === tool.id && (
                        <div
                          className="sb-tool-context-menu"
                          role="menu"
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              event.preventDefault();
                              selectedToolbarToolId.value = null;
                              return;
                            }
                            handleVerticalListKeyNav(
                              event,
                              event.currentTarget
                            );
                          }}
                        >
                          {menuItems.map((item) => {
                            const MenuItemIcon = item.icon;
                            return (
                              <button
                                key={item.id}
                                disabled={item.disabled.value}
                                onClick={() => {
                                  item.onSelect();
                                  selectedToolbarToolId.value = null;
                                }}
                                className="sb-tool-context-menu-item"
                                role="menuitem"
                              >
                                <MenuItemIcon />
                                <span>{translateTitle(t, item.title)}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                  </div>
                );
                if (
                  tool.id === "previous-chapter" ||
                  tool.id === "previous-item"
                ) {
                  return [
                    itemElement,
                    <div
                      key="divider-after-prev"
                      className="sb-reader-toolbar-divider"
                      aria-hidden="true"
                    />,
                  ];
                }
                if (tool.id === "next-chapter" || tool.id === "next-item") {
                  return [
                    <div
                      key="divider-before-next"
                      className="sb-reader-toolbar-divider"
                      aria-hidden="true"
                    />,
                    itemElement,
                  ];
                }
                return [itemElement];
              })
            )}
          </div>
        </div>
      )}

      {isVerseToolbarVisible.value && verseToolbarTools.value.length > 0 && (
        <div
          ref={verseToolbarRef}
          className={`sb-verse-toolbar${
            isSmallScreen.value
              ? ` sb-verse-toolbar-mobile${
                  // Suppresses the settle animations, so the sheet tracks the
                  // finger exactly instead of easing towards it.
                  isVerseSheetDragging.value ? " sb-verse-sheet-dragging" : ""
                }`
              : " sb-verse-toolbar-draggable"
          }`}
          style={
            isSmallScreen.value
              ? {
                  transform: verseSheetDismissOffset.value
                    ? `translateY(${verseSheetDismissOffset.value}px)`
                    : undefined,
                }
              : {
                  left: `${clampedToolbarLeft.value}px`,
                  top: `${clampedToolbarTop.value}px`,
                }
          }
          onPointerDown={
            isSmallScreen.value
              ? handleVerseSheetPanelPointerDown
              : handleVerseToolbarPointerDown
          }
          onPointerMove={
            isSmallScreen.value
              ? handleVerseSheetHandlePointerMove
              : handleVerseToolbarPointerMove
          }
          onPointerUp={
            isSmallScreen.value
              ? handleVerseSheetHandlePointerUp
              : handleVerseToolbarPointerUp
          }
          onPointerCancel={
            isSmallScreen.value
              ? handleVerseSheetHandlePointerCancel
              : handleVerseToolbarPointerUp
          }
        >
          {isSmallScreen.value && (
            <>
              {/* The drag/tap gesture itself is handled by the panel (see
                  onPointerDown above), so this only needs to carry the
                  keyboard-accessible button role: the sheet has no "More"
                  card any more, so this is the only control that opens the
                  overflow row for non-pointer users. */}
              <div
                className="sb-verse-toolbar-handle-area"
                role="button"
                tabIndex={hasVerseSheetOverflow.value ? 0 : -1}
                aria-expanded={isVerseSheetExpanded.value}
                aria-label={
                  isVerseSheetExpanded.value
                    ? t("show-fewer-verse-actions", {
                        defaultValue: "Show fewer actions",
                      })
                    : t("show-more-verse-actions", {
                        defaultValue: "Show more actions",
                      })
                }
                onKeyDown={handleVerseSheetHandleKeyDown}
              >
                <div className="sb-verse-toolbar-handle" />
              </div>
              <button
                type="button"
                className="sb-verse-toolbar-close"
                onClick={() => {
                  // In highlight-picker mode, close just leaves the picker so the
                  // user can return to verse actions without losing the selection.
                  if (isHighlightPickerOpen.value) {
                    isHighlightPickerOpen.value = false;
                    return;
                  }
                  readingState.value?.clearSelectedVerses();
                }}
                aria-label={
                  isHighlightPickerOpen.value
                    ? t("back", { defaultValue: "Back" })
                    : t("close", { defaultValue: "Close" })
                }
                title={
                  isHighlightPickerOpen.value
                    ? t("back", { defaultValue: "Back" })
                    : t("close", { defaultValue: "Close" })
                }
              >
                <span className="material-symbols-outlined">
                  {isHighlightPickerOpen.value ? "arrow_back" : "close"}
                </span>
              </button>
            </>
          )}
          {(isHighlightPickerOpen.value || isSmallScreen.value) && (
            <div
              className={`sb-verse-toolbar-ref${
                isHighlightPickerOpen.value
                  ? " sb-verse-toolbar-ref-with-back"
                  : ""
              }`}
            >
              {/* Desktop keeps a back chevron next to the reference; mobile
                  matches YouVersion with a centered title only. */}
              {isHighlightPickerOpen.value && !isSmallScreen.value && (
                <button
                  type="button"
                  className="sb-verse-toolbar-back"
                  onClick={() => {
                    isHighlightPickerOpen.value = false;
                  }}
                  aria-label={t("back", { defaultValue: "Back" })}
                  title={t("back", { defaultValue: "Back" })}
                >
                  <span className="material-symbols-outlined">
                    chevron_left
                  </span>
                </button>
              )}
              <span
                className="sb-verse-toolbar-ref-text"
                aria-live="polite"
                title={selectedVersesReference.value}
              >
                {selectedVersesReference.value}
              </span>
            </div>
          )}
          {isHighlightPickerOpen.value ? (
            <div
              className="sb-verse-toolbar-tools sb-verse-toolbar-picker"
              role="toolbar"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  isHighlightPickerOpen.value = false;
                  return;
                }
                if (isSmallScreen.value) {
                  handleHorizontalListKeyNav(event, event.currentTarget);
                }
              }}
            >
              <div
                ref={colorSwatchesRef}
                className="sb-verse-toolbar-swatches"
                role="group"
                aria-label={t("highlight-colors", {
                  defaultValue: "Highlight colors",
                })}
                onScroll={() => {
                  if (!isSmallScreen.value) return;
                  const el = colorSwatchesRef.current;
                  if (!el) return;
                  // Any meaningful horizontal swipe dismisses the hint for this
                  // open session of the picker.
                  if (el.scrollLeft > 4) {
                    showHighlightColorSwipeHint.value = false;
                  }
                }}
                onKeyDown={(event) => {
                  if (isSmallScreen.value) {
                    handleHorizontalListKeyNav(event, event.currentTarget);
                  } else {
                    handleGridKeyNav(event, event.currentTarget);
                  }
                }}
              >
                {DEFAULT_HIGHLIGHT_IDS.map((colorId) => (
                  <button
                    key={colorId}
                    type="button"
                    className="sb-verse-toolbar-color-button"
                    onClick={() => {
                      const rs = readingState.value;
                      if (!rs) return;
                      applyHighlightWithSession(
                        rs,
                        sessionState.value,
                        { colorId },
                        !!login.userId.value
                      );
                    }}
                    aria-label={`Highlight ${colorId}`}
                    title={colorId}
                  >
                    <span
                      className="sb-verse-toolbar-color"
                      style={{
                        background: `var(--sb-highlight-${colorId}-color)`,
                      }}
                    />
                  </button>
                ))}

                {customHighlightColors.value.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    className="sb-verse-toolbar-color-button"
                    onClick={() => {
                      const rs = readingState.value;
                      if (!rs) return;
                      applyHighlightWithSession(
                        rs,
                        sessionState.value,
                        {
                          colorId: "yellow",
                          customColor: hex,
                          customFontColor: getContrastTextColor(hex),
                        },
                        !!login.userId.value
                      );
                    }}
                    onContextMenu={(event: MouseEvent) => {
                      event.preventDefault();
                      settings.removeCustomHighlightColor(hex);
                    }}
                    aria-label={`Highlight ${hex}`}
                    title={`${hex} — right-click to remove`}
                  >
                    <span
                      className="sb-verse-toolbar-color"
                      style={{ background: hex }}
                    />
                  </button>
                ))}

                {/* On mobile the "+" lives inside the scroll strip so custom
                    colors and defaults stay one continuous thumb-scroll row. */}
                {isSmallScreen.value && (
                  <button
                    type="button"
                    className="sb-verse-toolbar-plus sb-verse-toolbar-plus-inline"
                    onClick={() => {
                      colorInputRef.current?.click();
                    }}
                    aria-label={t("add-custom-color", {
                      defaultValue: "Add custom color",
                    })}
                    title={t("add-color", { defaultValue: "Add color" })}
                  >
                    <span className="material-symbols-outlined">add</span>
                  </button>
                )}
              </div>

              <div className="sb-verse-toolbar-picker-actions">
                {!isSmallScreen.value && (
                  <button
                    type="button"
                    className="sb-verse-toolbar-plus"
                    onClick={() => {
                      colorInputRef.current?.click();
                    }}
                    aria-label={t("add-custom-color", {
                      defaultValue: "Add custom color",
                    })}
                    title={t("add-color", { defaultValue: "Add color" })}
                  >
                    <span className="material-symbols-outlined">add</span>
                    <span className="sb-verse-toolbar-action-text">
                      {t("add", { defaultValue: "Add" })}
                    </span>
                  </button>
                )}
                <input
                  ref={colorInputRef}
                  type="color"
                  className="sb-verse-toolbar-color-input"
                  onChange={(event: Event) => {
                    const target = event.currentTarget as HTMLInputElement;
                    commitCustomColor(target.value);
                  }}
                  onInput={(event: Event) => {
                    const target = event.currentTarget as HTMLInputElement;
                    commitCustomColor(target.value);
                  }}
                  onBlur={finishCustomColor}
                />

                <button
                  type="button"
                  className="sb-verse-toolbar-clear"
                  disabled={!hasAnyHighlighted.value}
                  onClick={() => {
                    const rs = readingState.value;
                    if (!rs) return;
                    const session = sessionState.value;
                    if (
                      session &&
                      session.userCanDecorate(session.localSessionId.value)
                    ) {
                      // Clean up the shared decoration first so the removal
                      // propagates to other clients even if the local
                      // unhighlight is a no-op (e.g. user isn't logged in
                      // with HighlightsManager but the session had a
                      // decoration broadcast earlier).
                      removeSharedHighlightsFromSelection(session, rs);
                    }
                    // Clear the saved highlight too. Highlights broadcast to a
                    // session aren't saved, but a personal one can still be
                    // sitting on these verses — made before joining, or made
                    // while the user had no permission to broadcast — and
                    // "clear" has to mean the verse ends up unhighlighted.
                    void rs.unhighlightSelectedVerses();
                    // Clearing a highlight should clear the selection too,
                    // same as applying one (#1704).
                    rs.clearSelectedVerses();
                  }}
                  aria-label={t("clear-highlight", {
                    defaultValue: "Clear highlight",
                  })}
                  title={t("clear", { defaultValue: "Clear" })}
                >
                  <span className="material-symbols-outlined">ink_eraser</span>
                  <span className="sb-verse-toolbar-action-text">
                    {t("clear", { defaultValue: "Clear" })}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`sb-verse-toolbar-tools${
                isSmallScreen.value ? " sb-verse-toolbar-cards" : ""
              }`}
            >
              {(() => {
                const renderTool = (
                  tool: (typeof verseToolbarTools.value)[number]
                ) => {
                  const ToolIcon = tool.icon;
                  const menuItems =
                    tool.getItems?.().filter((item) => item.visible.value) ??
                    [];
                  const hasMenuItems = menuItems.length > 0;
                  const label = translateTitle(t, tool.title);
                  return tool.visible.value ? (
                    <div key={tool.id} className="sb-verse-toolbar-action-item">
                      <button
                        disabled={tool.disabled.value}
                        onClick={() => {
                          if (hasMenuItems) {
                            selectedVerseToolId.value =
                              selectedVerseToolId.value === tool.id
                                ? null
                                : tool.id;
                            return;
                          }

                          selectedVerseToolId.value = null;
                          tool.onSelect();
                        }}
                        className="sb-verse-toolbar-action"
                        aria-label={label}
                        title={label}
                      >
                        <span className="sb-verse-toolbar-action-icon">
                          <ToolIcon />
                        </span>
                        <span className="sb-verse-toolbar-action-label">
                          {label}
                        </span>
                      </button>
                      {hasMenuItems &&
                        selectedVerseToolId.value === tool.id && (
                          <div
                            className="sb-tool-context-menu"
                            role="menu"
                            onKeyDown={(event) => {
                              if (event.key === "Escape") {
                                event.preventDefault();
                                selectedVerseToolId.value = null;
                                return;
                              }
                              handleVerticalListKeyNav(
                                event,
                                event.currentTarget
                              );
                            }}
                          >
                            {menuItems.map((item) => {
                              const MenuItemIcon = item.icon;
                              return (
                                <button
                                  key={item.id}
                                  disabled={item.disabled.value}
                                  onClick={() => {
                                    item.onSelect();
                                    selectedVerseToolId.value = null;
                                  }}
                                  className="sb-tool-context-menu-item"
                                  role="menuitem"
                                >
                                  <MenuItemIcon />
                                  <span>{translateTitle(t, item.title)}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                    </div>
                  ) : null;
                };

                const nonCancel = verseToolbarTools.value.filter(
                  (tool) => tool.id !== "clear-selection"
                );
                const cancelTools = verseToolbarTools.value.filter(
                  (tool) => tool.id === "clear-selection"
                );

                const highlightLabel = t("highlight", {
                  defaultValue: "Highlight",
                });
                const rs = readingState.value;
                const selectedVerseNumbers =
                  rs?.selectedVerses.value.map((v) => v.verse.number) ?? [];
                const verseTarget =
                  selectedVerseNumbers.length === 0
                    ? undefined
                    : selectedVerseNumbers.length === 1
                      ? selectedVerseNumbers[0]
                      : ([
                          Math.min(...selectedVerseNumbers),
                          Math.max(...selectedVerseNumbers),
                        ] as [number, number]);
                const selectionBookmark =
                  rs && verseTarget !== undefined
                    ? bookmarks.getBookmarkForLocation(
                        rs.translationId.value,
                        rs.bookId.value,
                        rs.chapterNumber.value,
                        verseTarget
                      )
                    : undefined;
                const isSelectionBookmarked = selectionBookmark !== undefined;
                const bookmarkLabel = isSelectionBookmarked
                  ? t("edit-bookmark", { defaultValue: "Edit bookmark" })
                  : t("bookmark-verses", { defaultValue: "Bookmark" });

                const highlightCard = selectionUI.value.showHighlightColors ? (
                  <div key="highlight" className="sb-verse-toolbar-action-item">
                    <button
                      type="button"
                      className="sb-verse-toolbar-action sb-verse-toolbar-highlight-trigger"
                      onClick={() => {
                        isHighlightPickerOpen.value = true;
                        showHighlightColorSwipeHint.value = true;
                      }}
                      aria-label={t("highlight-selection", {
                        defaultValue: "Highlight selection",
                      })}
                      title={highlightLabel}
                    >
                      <span className="sb-verse-toolbar-action-icon">
                        <span className="material-symbols-outlined">
                          format_ink_highlighter
                        </span>
                      </span>
                      <span className="sb-verse-toolbar-action-label">
                        {highlightLabel}
                      </span>
                    </button>
                  </div>
                ) : null;

                const bookmarkCard = (
                  <div key="bookmark" className="sb-verse-toolbar-action-item">
                    <button
                      type="button"
                      className={`sb-verse-toolbar-action sb-verse-toolbar-bookmark-trigger${
                        isSelectionBookmarked
                          ? " sb-verse-toolbar-bookmark-trigger-active"
                          : ""
                      }`}
                      onClick={() => {
                        if (!rs) return;
                        const translationId = rs.translationId.value;
                        const bookId = rs.bookId.value;
                        const chapterNumber = rs.chapterNumber.value;
                        if (
                          !translationId ||
                          !bookId ||
                          !chapterNumber ||
                          verseTarget === undefined
                        ) {
                          return;
                        }
                        openBookmarkCategoryModal(
                          props.state,
                          {
                            translationId,
                            bookId,
                            chapterNumber,
                            verse: verseTarget,
                          },
                          selectionBookmark
                            ? {
                                mode: "edit",
                                bookmarkId: selectionBookmark.id,
                              }
                            : undefined
                        );
                      }}
                      aria-label={bookmarkLabel}
                      aria-pressed={isSelectionBookmarked}
                      title={bookmarkLabel}
                    >
                      <span className="sb-verse-toolbar-action-icon">
                        <span
                          className="material-symbols-outlined"
                          style={{
                            fontVariationSettings: isSelectionBookmarked
                              ? '"FILL" 1'
                              : '"FILL" 0',
                          }}
                        >
                          bookmark
                        </span>
                      </span>
                      <span className="sb-verse-toolbar-action-label">
                        {bookmarkLabel}
                      </span>
                    </button>
                  </div>
                );

                // Desktop keeps the single horizontal row (highlight, bookmark,
                // the registered tools, then cancel).
                if (!isSmallScreen.value) {
                  return (
                    <>
                      {highlightCard}
                      {bookmarkCard}
                      {nonCancel.map(renderTool)}
                      {cancelTools.map(renderTool)}
                    </>
                  );
                }

                // Mobile sheet: a card grid. The first row of actions is always
                // showing; the rest live in an overflow row that the grab handle
                // drags open. The X in the corner handles dismissal, so the
                // Cancel tool is dropped here.
                const actionCards = [
                  highlightCard,
                  bookmarkCard,
                  ...nonCancel.map(renderTool),
                ].filter(Boolean);

                // One full row of cards, matching the four-per-row grid below.
                // Keeping the collapsed sheet to a single row is what makes it
                // short by default.
                const COLLAPSED_COUNT = 4;
                // Annotations on the selection also make the sheet openable,
                // even when there aren't enough tool cards to overflow on
                // their own — otherwise there'd be nothing to drag/tap open
                // to see them.
                const hasOverflow =
                  actionCards.length > COLLAPSED_COUNT ||
                  selectionAnnotations.value.length > 0;
                const primaryCards = hasOverflow
                  ? actionCards.slice(0, COLLAPSED_COUNT)
                  : actionCards;
                const overflowCards = hasOverflow
                  ? actionCards.slice(COLLAPSED_COUNT)
                  : [];

                return (
                  <>
                    {primaryCards}
                    {hasOverflow && (
                      // Height rather than display: the row has to be in the
                      // layout at its full size for the drag to reveal it a pixel
                      // at a time, so it is clipped instead of removed.
                      <div
                        key="overflow"
                        // While fully closed the row is `visibility: hidden`, not
                        // merely clipped — otherwise its buttons stay in the tab
                        // order and the screen-reader tree while invisible. The
                        // handle above is the disclosure control that brings them
                        // back, which is why it carries `aria-expanded`.
                        className={`sb-verse-toolbar-overflow${
                          verseSheetRevealHeight.value === 0
                            ? " sb-verse-toolbar-overflow-closed"
                            : ""
                        }`}
                        style={{
                          height: `${verseSheetRevealHeight.value}px`,
                        }}
                      >
                        <div
                          className="sb-verse-toolbar-overflow-row"
                          ref={measureVerseSheetOverflow}
                        >
                          {overflowCards}
                          {selectionAnnotations.value.length > 0 && (
                            <div className="sb-verse-toolbar-annotations">
                              {groupAnnotationsByVerseRange(
                                selectionAnnotations.value
                              ).map((group) => {
                                const groupKey =
                                  group.annotations[0]?.id ??
                                  `${group.startVerseNumber}-${group.endVerseNumber}`;
                                return (
                                  <VerseToolbarAnnotationGroup
                                    key={groupKey}
                                    id={`sb-verse-toolbar-annotation-group-${groupKey}`}
                                    group={group}
                                    tabs={tabs}
                                    login={props.state.login}
                                    annotations={props.state.annotations}
                                    modals={props.state.modals}
                                    toast={props.state.app.toast}
                                    openDiscover={props.state.app.openDiscover}
                                    onReferenceClick={
                                      props.state.app.openVerseReference
                                    }
                                    otherPeoplePresent={annotationListHasOtherAuthors(
                                      selectionAnnotations.value,
                                      props.state.login.userId.value
                                    )}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
          {/* Replaces the old "More" card: a line of text at the foot of the
              sheet naming the gesture, instead of a button occupying a whole
              card slot. Only while there is something left to reveal, and it
              fades out as the sheet opens. Hidden from assistive tech because
              the gesture it describes isn't available to them — the handle
              itself carries the accessible toggle. */}
          {isSmallScreen.value &&
            !isHighlightPickerOpen.value &&
            hasVerseSheetOverflow.value &&
            !isVerseSheetExpanded.value && (
              <div
                className="sb-verse-toolbar-swipe-hint"
                // Purely decorative: the panel itself owns the drag/tap
                // gesture now, and the handle above remains the sole
                // *accessible* control, so this stays out of the a11y tree.
                aria-hidden="true"
                style={{
                  // Fades in step with the drag, so the hint gets out of the way
                  // as the sheet opens rather than blinking off at the end.
                  opacity: verseSheetOverflowHeight.value
                    ? 1 -
                      Math.min(
                        1,
                        verseSheetRevealHeight.value /
                          verseSheetOverflowHeight.value
                      )
                    : 1,
                }}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  keyboard_double_arrow_up
                </span>
                <span>
                  {t("swipe-up-more", {
                    defaultValue: "Swipe up to see more",
                  })}
                </span>
                {selectionAnnotations.value.length > 0 && (
                  <span>
                    &#x2022;{" "}
                    {t("x-notes", {
                      defaultValue: "{{count}} notes",
                      count: selectionAnnotations.value.length,
                    })}
                  </span>
                )}
              </div>
            )}
          {isSmallScreen.value && isHighlightPickerOpen.value && (
            <div
              className="sb-verse-toolbar-swipe-hint sb-verse-toolbar-swipe-hint-colors"
              aria-hidden="true"
              style={{
                opacity: showHighlightColorSwipeHint.value ? 1 : 0,
              }}
            >
              <span className="material-symbols-outlined">
                keyboard_double_arrow_right
              </span>

              <span>
                {t("swipe-to-see-more", {
                  defaultValue: "Swipe to see more",
                })}
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
