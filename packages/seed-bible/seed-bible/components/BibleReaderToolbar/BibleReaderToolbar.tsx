import "./BibleReaderToolbar.css";
import { useComputed, useSignal } from "@preact/signals";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import { useI18n } from "../../i18n/I18nManager";
import { translateTitle } from "../../app/utils";
import {
  applyToolbarCustomization,
  UI_SIZE_SCALE_MAP,
} from "../../managers/SettingsManager";
import { highlightContainsVerse } from "../../managers/HighlightsManager";
import type { BibleReadingSession } from "../../managers/SessionsManager";
import type { BibleReadingState } from "../../managers/BibleReadingManager";
import type { BibleReaderToolbarTool } from "../../managers/BibleToolsManager";
import {
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
import type { TodayScreenAPI } from "@packages/today-screen/infrastructure/di/bootstrap";
import { getExtensionExports } from "../../managers";
import { playlistItemLabel } from "../playlistItemLabel";
import type { PlayingState } from "../../managers/PlaylistManager";

const DEFAULT_HIGHLIGHT_COLOR_IDS = ["yellow", "green", "blue"] as const;

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
 * see the exact same visual styling.
 *
 * If the session's `highlightDurationSeconds` is set (non-null, non-zero),
 * we schedule a local removal after that many seconds — the removal also
 * propagates through the CRDT so every client clears it at once.
 */
function broadcastDecorationToSession(
  session: BibleReadingSession | null,
  rs: BibleReadingState,
  details: {
    colorId: string;
    customColor?: string;
    customFontColor?: string;
  }
): void {
  if (!session) return;
  const verses = rs.selectedVerses.value;
  if (verses.length === 0) return;

  const duration = session.options.value.highlightDurationSeconds;
  const style = details.customColor
    ? {
        backgroundColor: details.customColor,
        color:
          details.customFontColor ?? getContrastTextColor(details.customColor),
      }
    : undefined;
  const className = details.customColor
    ? ""
    : `sb-highlight-${details.colorId}`;

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
        className,
        ...(style ? { style } : {}),
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
    const id = sharedHighlightDecorationId(
      verse.bookId,
      verse.chapterNumber,
      verse.verse.number
    );
    if (session) {
      session.removeSharedDecoration(id);
    } else {
      rs.removeDecoration(id);
    }
  }
}

/**
 * Applies a highlight to the current selection with the right lifetime for
 * the current context:
 *
 * - Not in a shared session → save permanently via HighlightsManager.
 * - In a shared session with `highlightDurationSeconds` = null (∞) → save
 *   permanently AND broadcast a decoration so other clients see it.
 * - In a shared session with a finite duration → broadcast a decoration
 *   only. Don't persist to HighlightsManager, and also clear any existing
 *   permanent highlight on the same verses so the originating user's view
 *   stays in sync with the timer.
 */
function applyHighlightWithSession(
  rs: BibleReadingState,
  session: BibleReadingSession | null,
  details: {
    colorId: string;
    customColor?: string;
    customFontColor?: string;
  }
): void {
  // const duration = session?.options.value.highlightDurationSeconds ?? null;
  // const isTransient = session !== null && duration !== null && duration > 0;

  if (!session || session.userCanDecorate(session.localSessionId.value)) {
    void rs.highlightSelectedVerses(details);
  }

  // if (isTransient) {
  //   // Wipe any prior permanent highlight on these verses so the timer is
  //   // the sole source of truth for how long the highlight shows.
  //   void rs.unhighlightSelectedVerses();
  // } else {
  //   void rs.highlightSelectedVerses(details);
  // }

  broadcastDecorationToSession(session, rs, details);
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
    extensions,
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

  const viewportWidth = props.state.app.viewportWidth;

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
      openChat: sidebar.openChatPanel,
      openDiscover: props.state.app.openDiscover,
      toast: props.state.app.toast,
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

  const hiddenToolIds = new Set([
    "previous-chapter",
    "next-chapter",
    "open-selector",
    "open-sidebar",
    "open-search",
  ]);

  const moreTools = useComputed(() =>
    tools.value.filter(
      (tool) => tool.visible.value && !hiddenToolIds.has(tool.id)
    )
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
  const shouldReplaceDefaultToolbar = useComputed(
    () => isSmallScreen.value && hasVerseSelection.value
  );
  // A pane fills the whole screen when it's fullscreen, or (on mobile) for any
  // open pane — mobile renders every pane fullscreen. Mirrors the "fills the
  // screen" rule in PanesManager/SeedBibleStateManager. Used to hide the
  // floating chapter nav so it doesn't float on top of a fullscreen pane.
  const isFullscreenPaneVisible = useComputed(() =>
    panes.panes.value.some(
      (pane) => pane.placement === "fullscreen" || isSmallScreen.value
    )
  );
  const isMoreMenuOpen = useSignal(false);
  const selectedToolbarToolId = useSignal<string | null>(null);
  const selectedVerseToolId = useSignal<string | null>(null);
  // Whether the mobile verse sheet shows its overflow actions (the "More" /
  // "Less" toggle). Collapsed by default; reset whenever the selection clears.
  const isVerseSheetExpanded = useSignal(false);

  // True when the sidebar drawer is open showing the tabs/bookmarks view
  // (not the settings view) with the bookmark filter active.
  const isBookmarksViewOpen = useComputed(
    () =>
      sidebar.isMobileOpen.value &&
      !sidebar.isSettingsOpen.value &&
      bookmarks.isFilterActive.value
  );

  const isTodayOpen = useComputed(() =>
    panes.panes.value.some((p) => p.id === "today-screen-pane")
  );
  const activeMobileTab = useComputed<
    "today" | "bible" | "search" | "tabs" | "bookmarks" | "more" | "none"
  >(() => {
    if (isMoreMenuOpen.value) return "more";
    if (sidebar.isSearchPanelOpen.value) return "search";
    // The account ("You") control now lives in the reader header, so an open
    // settings view no longer maps to a bottom-bar tab.
    if (sidebar.isSettingsOpen.value) return "none";
    if (isBookmarksViewOpen.value) {
      // Bookmarks is a top-level tab only when there's no overflow. When it
      // lives inside the More menu, keep nothing highlighted.
      return moreTools.value.length > 0 ? "none" : "bookmarks";
    }
    if (isTodayOpen.value) return "today";
    // Some other extension pane is covering the reader (opened from More).
    if (isFullscreenPaneVisible.value) return "more";
    if (sidebar.isMobileOpen.value) return "tabs";
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
  // The audio-reader extension's play/pause control, surfaced inside the
  // mobile floating nav pill. Null when the extension isn't installed; its
  // `visible` is only true on chapters that actually have audio.
  const audioPlayTool = useComputed(
    () =>
      toolsManager
        .getQuickTools({
          readingState: readingState.value!,
          playlists: props.state.playlists,
          features: props.state.features,
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
  const floatingX = useComputed(() => {
    const inset = 84 * uiScale.value;
    return Math.min(
      Math.max(floatingAnchor.value?.x ?? viewportWidth.value / 2, inset),
      Math.max(inset, viewportWidth.value - inset)
    );
  });
  const floatingY = useComputed(() => {
    const inset = 64 * uiScale.value;
    return Math.max((floatingAnchor.value?.y ?? 0) - inset, inset);
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

  // Verse toolbar highlight picker state
  const isHighlightPickerOpen = useSignal(false);
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const customColorCommitTimeoutRef = useRef<number | null>(null);
  const customHighlightColors = useComputed(
    () => settings.settings.value.customHighlightColors
  );
  const selectionUI = useComputed(() => settings.settings.value.selectionUI);

  // Debounce the commit so rapid `change` events from the native color
  // picker (fired as the user drags) don't add each intermediate color to
  // the custom palette — only the final settled color is saved.
  const commitCustomColor = (color: string) => {
    if (customColorCommitTimeoutRef.current !== null) {
      window.clearTimeout(customColorCommitTimeoutRef.current);
    }
    customColorCommitTimeoutRef.current = window.setTimeout(() => {
      settings.addCustomHighlightColor(color);
      const rs = readingState.value;
      if (rs) {
        applyHighlightWithSession(rs, sessionState.value, {
          colorId: "yellow",
          customColor: color,
          customFontColor: getContrastTextColor(color),
        });
      }
      customColorCommitTimeoutRef.current = null;
    }, 300);
  };

  const hasAnyHighlighted = useComputed(() => {
    const rs = readingState.value;
    if (!rs) return false;

    if (
      sessionState.value &&
      sessionState.value.userCanDecorate(
        sessionState.value.localSessionId.value
      )
    ) {
      // Shared sessions use decorations, not highlights
      const currentBookId = rs.bookId.value;
      const currentChapterNumber = rs.chapterNumber.value;

      return rs.selectedVerses.value.some((verse) =>
        rs.decorations.value.some(
          (d) =>
            d.bookId === currentBookId &&
            d.chapterNumber === currentChapterNumber &&
            d.verses.includes(verse.verse.number)
        )
      );
    } else {
      return rs.selectedVerses.value.some((verse) => {
        const existing = rs.highlights.value.highlights.find((h) =>
          highlightContainsVerse(h, verse.verse.number)
        );
        return !!existing;
      });
    }
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

  // Reset picker and the mobile sheet's expanded state when selection clears.
  useEffect(() => {
    if (!hasVerseSelection.value) {
      isHighlightPickerOpen.value = false;
      isVerseSheetExpanded.value = false;
    }
  }, [hasVerseSelection.value]);

  // Clicking anywhere outside the chapter content or the verse toolbar
  // dismisses the verse selection (and therefore the toolbar).
  useEffect(() => {
    if (!hasVerseSelection.value) return;

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(".sb-chapter-content")) return;
      if (target.closest(".sb-verse-toolbar")) return;
      readingState.value?.clearSelectedVerses();
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
    };
  }, [hasVerseSelection.value]);

  const { t } = useI18n();

  // Opens the Today screen. If the `today-screen` extension isn't installed
  // yet, install it (the same path Settings uses — this persists the install)
  // and then open it once it has initialized.
  const openTodayScreen = async () => {
    isMoreMenuOpen.value = false;
    sidebar.closeSearchPanel();
    sidebar.closeChatPanel();
    sidebar.closeSettings();
    sidebar.closeSidebar();
    panes.closeAll();

    const existing = getExtensionExports<TodayScreenAPI>("today-screen");
    if (existing) {
      existing.open();
      return;
    }

    const entry = extensions.extensions.value.find(
      (e) => e.id === "today-screen"
    );
    const todayPackage = entry?.extension;
    if (!todayPackage) {
      props.state.app.toast(
        t("today-coming-soon", {
          defaultValue: "Today screen is coming soon",
        })
      );
      return;
    }

    const installed = await extensions.loadExtension(todayPackage);
    if (installed) {
      getExtensionExports<TodayScreenAPI>("today-screen")?.open();
    } else {
      props.state.app.toast(
        t("today-coming-soon", {
          defaultValue: "Today screen is coming soon",
        })
      );
    }
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

  const getReaderNavLabel = () => {
    return (
      <>
        <div>
          {readingState.value?.chapterData.value?.book.name ??
            readingState.value?.bookId.value ??
            " "}
        </div>
        <div>{readingState.value?.chapterNumber.value}</div>
      </>
    );
  };

  const getPlayingNavLabel = (playing: PlayingState) => {
    const currentItem = playing.currentItem.value;
    if (currentItem) {
      const label = playlistItemLabel(currentItem, t, (bookId: string) => {
        const book = readingState.value?.chapterData.value?.book;
        return book?.name ?? book?.commonName ?? bookId;
      });
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
                          >
                            <PrevIcon />
                          </button>
                        )
                      )}

                      {selector && (
                        <button
                          type="button"
                          onClick={selector.onSelect}
                          onPointerDown={spawnRipple}
                          className="sb-reader-floating-nav-label"
                        >
                          {playing
                            ? getPlayingNavLabel(playing)
                            : getReaderNavLabel()}
                        </button>
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
                    isMoreMenuOpen.value = false;
                    sidebar.closeSearchPanel();
                    sidebar.closeChatPanel();
                    sidebar.closeSettings();
                    sidebar.closeSidebar();
                    // Close any fullscreen extension pane (e.g. Today).
                    panes.closeAll();
                    selectedToolbarToolId.value = null;
                  }}
                />

                <MobileBottomTab
                  iconNode={<SbTabsIcon />}
                  label={t("tabs", { defaultValue: "Tabs" })}
                  active={activeMobileTab.value === "tabs"}
                  onClick={() => {
                    isMoreMenuOpen.value = false;
                    if (activeMobileTab.value === "tabs") {
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
                    // Opened straight from the toolbar (not the book selector),
                    // so the tabs header should show a Close (X), not a Back
                    // arrow to the selector.
                    sidebar.tabsOpenedFromToolbar.value = true;
                    sidebar.openSidebar();
                  }}
                />

                {moreTools.value.length > 0 ? (
                  <div className="sb-reader-toolbar-item sb-reader-toolbar-mobile-tab sb-reader-toolbar-more-anchor">
                    <button
                      type="button"
                      onClick={() => {
                        // Opening the More menu should dismiss the
                        // tabs/bookmarks drawer if it's open.
                        if (!isMoreMenuOpen.value) {
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
                    </button>

                    {isMoreMenuOpen.value && (
                      <MobileMoreMenu
                        tools={moreTools.value}
                        pinnedItems={[
                          {
                            id: "bookmarks",
                            label: t("bookmarks", {
                              defaultValue: "Bookmarks",
                            }),
                            iconNode: (
                              <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
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
                            ),
                            onClick: openBookmarksView,
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
                )}
              </>
            ) : (
              tools.value.flatMap((tool) => {
                const ToolIcon = tool.icon;
                const menuItems =
                  tool.getItems?.().filter((item) => item.visible.value) ?? [];
                const hasMenuItems = menuItems.length > 0;
                const isArrow =
                  tool.id === "previous-chapter" ||
                  tool.id === "next-chapter" ||
                  tool.id === "previous-item" ||
                  tool.id === "next-item";
                const label = translateTitle(t, tool.title);
                if (!tool.visible.value) return [];
                const itemElement = (
                  <div
                    key={tool.id}
                    className={`sb-reader-toolbar-item${isArrow ? " sb-reader-toolbar-item-arrow" : ""}`}
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
                      className="sb-reader-toolbar-button"
                      aria-label={label}
                    >
                      <ToolIcon />
                      {isArrow ? (
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

      {hasVerseSelection.value && verseToolbarTools.value.length > 0 && (
        <div
          className={`sb-verse-toolbar${isSmallScreen.value ? " sb-verse-toolbar-mobile" : " sb-verse-toolbar-draggable"}`}
          style={
            isSmallScreen.value
              ? undefined
              : {
                  left: `${floatingX.value + verseToolbarOffset.value.dx}px`,
                  top: `${floatingY.value + verseToolbarOffset.value.dy}px`,
                }
          }
          onPointerDown={
            isSmallScreen.value ? undefined : handleVerseToolbarPointerDown
          }
          onPointerMove={
            isSmallScreen.value ? undefined : handleVerseToolbarPointerMove
          }
          onPointerUp={
            isSmallScreen.value ? undefined : handleVerseToolbarPointerUp
          }
          onPointerCancel={
            isSmallScreen.value ? undefined : handleVerseToolbarPointerUp
          }
        >
          {isSmallScreen.value && (
            <>
              <div className="sb-verse-toolbar-handle" aria-hidden="true" />
              <button
                type="button"
                className="sb-verse-toolbar-close"
                onClick={() => {
                  readingState.value?.clearSelectedVerses();
                }}
                aria-label={t("close", { defaultValue: "Close" })}
                title={t("close", { defaultValue: "Close" })}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </>
          )}
          {(isHighlightPickerOpen.value || isSmallScreen.value) && (
            <div
              className="sb-verse-toolbar-ref"
              aria-live="polite"
              title={selectedVersesReference.value}
            >
              {selectedVersesReference.value}
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
                handleHorizontalListKeyNav(event, event.currentTarget);
              }}
            >
              <button
                type="button"
                className="sb-verse-toolbar-back"
                onClick={() => {
                  isHighlightPickerOpen.value = false;
                }}
                aria-label={t("back", { defaultValue: "Back" })}
                title={t("back", { defaultValue: "Back" })}
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>

              {DEFAULT_HIGHLIGHT_COLOR_IDS.map((colorId) => (
                <button
                  key={colorId}
                  type="button"
                  className="sb-verse-toolbar-color-button"
                  onClick={() => {
                    const rs = readingState.value;
                    if (!rs) return;
                    applyHighlightWithSession(rs, sessionState.value, {
                      colorId,
                    });
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
                    applyHighlightWithSession(rs, sessionState.value, {
                      colorId: "yellow",
                      customColor: hex,
                      customFontColor: getContrastTextColor(hex),
                    });
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
              />

              <button
                type="button"
                className="sb-verse-toolbar-clear"
                disabled={!hasAnyHighlighted.value}
                onClick={() => {
                  const rs = readingState.value;
                  if (!rs) return;
                  if (
                    sessionState.value &&
                    sessionState.value.userCanDecorate(
                      sessionState.value.localSessionId.value
                    )
                  ) {
                    // Clean up the shared decoration first so the removal
                    // propagates to other clients even if the local
                    // unhighlight is a no-op (e.g. user isn't logged in
                    // with HighlightsManager but the session had a
                    // decoration broadcast earlier).
                    removeSharedHighlightsFromSelection(sessionState.value, rs);
                  } else {
                    rs.unhighlightSelectedVerses();
                  }
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
                const isSelectionBookmarked =
                  rs && verseTarget !== undefined
                    ? bookmarks.isLocationBookmarked(
                        rs.translationId.value,
                        rs.bookId.value,
                        rs.chapterNumber.value,
                        verseTarget
                      )
                    : false;
                const bookmarkLabel = isSelectionBookmarked
                  ? t("remove-bookmark", { defaultValue: "Remove bookmark" })
                  : t("bookmark-verses", { defaultValue: "Bookmark" });

                // const canHighlight = !sessionState.value || sessionState.value.userCanDecorate(sessionState.value.localSessionId.value);
                const highlightCard = selectionUI.value.showHighlightColors ? (
                  <div key="highlight" className="sb-verse-toolbar-action-item">
                    <button
                      type="button"
                      className="sb-verse-toolbar-action sb-verse-toolbar-highlight-trigger"
                      onClick={() => {
                        isHighlightPickerOpen.value = true;
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
                        if (isSelectionBookmarked) {
                          void bookmarks.removeBookmarkForLocation(
                            translationId,
                            bookId,
                            chapterNumber,
                            verseTarget
                          );
                          return;
                        }
                        openBookmarkCategoryModal(props.state, {
                          translationId,
                          bookId,
                          chapterNumber,
                          verse: verseTarget,
                        });
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

                // Mobile sheet: a card grid. Show the first few actions plus a
                // "More" toggle; the rest reveal under a "Less" toggle. The X
                // in the corner handles dismissal, so the Cancel tool is
                // dropped here.
                const actionCards = [
                  highlightCard,
                  bookmarkCard,
                  ...nonCancel.map(renderTool),
                ].filter(Boolean);

                const COLLAPSED_COUNT = 3;
                const needsToggle = actionCards.length > COLLAPSED_COUNT;
                const primaryCards = needsToggle
                  ? actionCards.slice(0, COLLAPSED_COUNT)
                  : actionCards;
                const overflowCards = needsToggle
                  ? actionCards.slice(COLLAPSED_COUNT)
                  : [];

                return (
                  <>
                    {primaryCards}
                    {needsToggle && (
                      <div
                        key="more-less"
                        className="sb-verse-toolbar-action-item"
                      >
                        <button
                          type="button"
                          className={`sb-verse-toolbar-action sb-verse-toolbar-more-toggle${
                            isVerseSheetExpanded.value
                              ? " sb-verse-toolbar-more-toggle-active"
                              : ""
                          }`}
                          onClick={() => {
                            isVerseSheetExpanded.value =
                              !isVerseSheetExpanded.value;
                          }}
                          aria-expanded={isVerseSheetExpanded.value}
                          aria-label={
                            isVerseSheetExpanded.value
                              ? t("less", { defaultValue: "Less" })
                              : t("more", { defaultValue: "More" })
                          }
                          title={
                            isVerseSheetExpanded.value
                              ? t("less", { defaultValue: "Less" })
                              : t("more", { defaultValue: "More" })
                          }
                        >
                          <span className="sb-verse-toolbar-action-icon">
                            <span className="material-symbols-outlined">
                              {isVerseSheetExpanded.value
                                ? "keyboard_arrow_up"
                                : "more_horiz"}
                            </span>
                          </span>
                          <span className="sb-verse-toolbar-action-label">
                            {isVerseSheetExpanded.value
                              ? t("less", { defaultValue: "Less" })
                              : t("more", { defaultValue: "More" })}
                          </span>
                        </button>
                      </div>
                    )}
                    {isVerseSheetExpanded.value && overflowCards}
                  </>
                );
              })()}
            </div>
          )}
          {isSmallScreen.value && (
            <div className="sb-verse-toolbar-swipe-hint" aria-hidden="true">
              <span className="material-symbols-outlined">
                keyboard_double_arrow_up
              </span>
              <span>
                {t("swipe-up-more", { defaultValue: "Swipe up to view more" })}
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
