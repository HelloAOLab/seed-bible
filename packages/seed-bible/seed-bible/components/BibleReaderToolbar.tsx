import { batch, useComputed, useSignal } from "@preact/signals";
import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";
import { useI18n } from "seed-bible.i18n.I18nManager";
import { translateTitle } from "seed-bible.components.Utils";
import { applyToolbarCustomization } from "seed-bible.managers.SettingsManager";
import { highlightContainsVerse } from "seed-bible.managers.HighlightsManager";
import type { BibleReadingSession } from "seed-bible.managers.SessionsManager";
import type { BibleReadingState } from "seed-bible.managers.BibleReadingManager";
import type { BibleReaderToolbarTool } from "seed-bible.managers.BibleToolsManager";
import {
  handleHorizontalListKeyNav,
  handleVerticalListKeyNav,
} from "seed-bible.components.KeyboardNav";
import { SeedBibleIcon } from "seed-bible.components.icons";
import {
  SelfAvatarVisual,
  getSelfDisplayName,
  openBookmarkCategoryModal,
} from "seed-bible.components.Tabs";

const DEFAULT_HIGHLIGHT_COLOR_IDS = ["yellow", "green", "blue"] as const;

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
}

function MobileMoreMenu(props: MobileMoreMenuProps) {
  const { onClose, tools } = props;
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
    // {
    //   id: "chat",
    //   label: t("chat", { defaultValue: "Chat" }),
    //   iconName: "chat_bubble_outline",
    //   onClick: () => {
    //     onClose();
    //     os.toast(
    //       t("chat-coming-soon", { defaultValue: "Chat is coming soon" })
    //     );
    //   },
    // },
    ...extraItems,
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

const { useEffect, useRef } = os.appHooks;

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
    sidebar,
    tools: toolsManager,
    settings,
    bookmarks,
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

  const viewportWidth = useSignal(
    typeof window === "undefined" ? 0 : window.innerWidth
  );
  const viewportHeight = useSignal(
    typeof window === "undefined" ? 0 : window.innerHeight
  );

  useEffect(() => {
    const onResize = () => {
      batch(() => {
        viewportWidth.value = window.innerWidth;
        viewportHeight.value = window.innerHeight;
      });
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const tools = useComputed(() => {
    const resolved = toolsManager.getToolbarTools({
      readingState: readingState.value!,
      sharedSession: sessionState.value,
      selectorState: selector,
      tabs: tabs,
      panesManager: panes,
      window: {
        innerWidth: viewportWidth,
        innerHeight: viewportHeight,
      },
      openSidebar: sidebar.openSidebar,
      openSearch: sidebar.openSearch,
      openChat: sidebar.openChatPanel,
    });
    return applyToolbarCustomization(resolved, settings.settings.value.toolbar);
  });

  const hiddenToolIds = new Set([
    "previous-chapter",
    "next-chapter",
    "open-selector",
    "open-sidebar",
    "open-search",
    "open-chat",
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
      window: {
        innerWidth: viewportWidth,
        innerHeight: viewportHeight,
      },
      openSidebar: sidebar.openSidebar,
      openSearch: sidebar.openSearch,
      openChat: sidebar.openChatPanel,
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
  // Align with the app-wide mobile breakpoint (`state.app.isMobile`, 768px).
  // Kept as a local computed signal so its own viewport listener continues to
  // drive re-renders even if `app.isMobile` is not consumed elsewhere.
  const isSmallScreen = useComputed(() => viewportWidth.value <= 768);
  const shouldReplaceDefaultToolbar = useComputed(
    () => isSmallScreen.value && hasVerseSelection.value
  );
  const isMoreMenuOpen = useSignal(false);
  const selectedToolbarToolId = useSignal<string | null>(null);
  const selectedVerseToolId = useSignal<string | null>(null);

  // Single source of truth for which bottom-bar tab is highlighted orange.
  // "more"/"search"/"you" are derived from real panel state; "today" and
  // "bible" have no panel of their own, so we remember the last one the user
  // tapped and use it as the fallback. Exactly one tab is ever active.
  const localBottomTab = useSignal<"today" | "bible">("bible");
  // True when the sidebar drawer is open showing the tabs/bookmarks view
  // (not the settings view) with the bookmark filter active.
  const isBookmarksViewOpen = useComputed(
    () =>
      sidebar.isMobileOpen.value &&
      !sidebar.isSettingsOpen.value &&
      bookmarks.isFilterActive.value
  );
  const activeMobileTab = useComputed<
    "today" | "you" | "bible" | "search" | "bookmarks" | "more"
  >(() => {
    if (isMoreMenuOpen.value) return "more";
    if (sidebar.isSearchPanelOpen.value) return "search";
    if (sidebar.isSettingsOpen.value) return "you";
    if (isBookmarksViewOpen.value) return "bookmarks";
    return localBottomTab.value;
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
        .getQuickTools({ readingState: readingState.value! })
        .find((tool) => tool.id === "ext_audioReader-play") ?? null
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
  const floatingX = useComputed(() =>
    Math.min(
      Math.max(floatingAnchor.value?.x ?? viewportWidth.value / 2, 84),
      Math.max(84, viewportWidth.value - 84)
    )
  );
  const floatingY = useComputed(() =>
    Math.max((floatingAnchor.value?.y ?? 0) - 64, 64)
  );

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

  // Reset picker when selection is cleared
  useEffect(() => {
    if (!hasVerseSelection.value) {
      isHighlightPickerOpen.value = false;
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
              const showNav = settings.settings.value.showNavArrows;
              const audio =
                audioPlayTool.value && audioPlayTool.value.visible.value
                  ? audioPlayTool.value
                  : null;
              const prev = showNav ? previousChapterTool.value : null;
              const next = showNav ? nextChapterTool.value : null;
              const selector = showNav ? openSelectorTool.value : null;
              if (!audio && !prev && !next && !selector) return null;

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
                  {audio && AudioIcon && (
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

                  {(prev || next || selector) && (
                    <div className="sb-reader-floating-nav-group">
                      {prev && PrevIcon && (
                        <button
                          type="button"
                          disabled={prev.disabled.value}
                          onClick={prev.onSelect}
                          className="sb-reader-floating-nav-arrow"
                          aria-label={translateTitle(t, prev.title)}
                        >
                          <PrevIcon />
                        </button>
                      )}

                      {selector && (
                        <button
                          type="button"
                          onClick={selector.onSelect}
                          className="sb-reader-floating-nav-label"
                        >
                          {readingState.value?.chapterData.value?.book.name ??
                            readingState.value?.bookId.value ??
                            " "}{" "}
                          {readingState.value?.chapterNumber.value}
                        </button>
                      )}

                      {next && NextIcon && (
                        <button
                          type="button"
                          disabled={next.disabled.value}
                          onClick={next.onSelect}
                          className="sb-reader-floating-nav-arrow"
                          aria-label={translateTitle(t, next.title)}
                        >
                          <NextIcon />
                        </button>
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
                    isMoreMenuOpen.value = false;
                    sidebar.closeSearchPanel();
                    sidebar.closeChatPanel();
                    sidebar.closeSettings();
                    sidebar.closeSidebar();
                    localBottomTab.value = "today";
                    os.toast(
                      t("today-coming-soon", {
                        defaultValue: "Today screen is coming soon",
                      })
                    );
                  }}
                />

                <MobileBottomTab
                  iconNode={<SelfAvatarVisual state={props.state} />}
                  label={t("you", { defaultValue: "You" })}
                  active={activeMobileTab.value === "you"}
                  aria-label={`Open account settings (${getSelfDisplayName(
                    props.state
                  )})`}
                  onClick={() => {
                    isMoreMenuOpen.value = false;
                    sidebar.closeSearchPanel();
                    sidebar.closeChatPanel();
                    sidebar.openSidebar();
                    sidebar.openSettingsToView("account");
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
                    localBottomTab.value = "bible";
                    // openSelectorTool.value?.onSelect();
                    selectedToolbarToolId.value = null;
                  }}
                />

                <MobileBottomTab
                  iconName="search"
                  label={t("search", { defaultValue: "Search" })}
                  active={activeMobileTab.value === "search"}
                  onClick={() => {
                    isMoreMenuOpen.value = false;
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
                  onClick={() => {
                    isMoreMenuOpen.value = false;
                    if (isBookmarksViewOpen.value) {
                      sidebar.closeSidebar();
                      return;
                    }
                    sidebar.closeSearchPanel();
                    sidebar.closeChatPanel();
                    // Clear any settings view so the drawer shows the tabs
                    // list, then (re-)open the drawer and switch on the
                    // bookmark filter so the bookmarks section is visible.
                    sidebar.closeSettings();
                    sidebar.openSidebar();
                    if (!bookmarks.isFilterActive.value) {
                      bookmarks.toggleFilter();
                    }
                  }}
                />

                {moreTools.value.length > 0 && (
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
                        onClose={() => {
                          isMoreMenuOpen.value = false;
                        }}
                      />
                    )}
                  </div>
                )}
              </>
            ) : (
              tools.value.flatMap((tool) => {
                const ToolIcon = tool.icon;
                const menuItems =
                  tool.getItems?.().filter((item) => item.visible.value) ?? [];
                const hasMenuItems = menuItems.length > 0;
                const isArrow =
                  tool.id === "previous-chapter" || tool.id === "next-chapter";
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
                if (tool.id === "previous-chapter") {
                  return [
                    itemElement,
                    <div
                      key="divider-after-prev"
                      className="sb-reader-toolbar-divider"
                      aria-hidden="true"
                    />,
                  ];
                }
                if (tool.id === "next-chapter") {
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
            <div className="sb-verse-toolbar-handle" aria-hidden="true" />
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
              </button>
            </div>
          ) : (
            <div className="sb-verse-toolbar-tools">
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
                return (
                  <>
                    {selectionUI.value.showHighlightColors &&
                      (isSmallScreen.value ? (
                        // Mobile: surface the highlight colors inline (matching
                        // the design) instead of behind a tap, with a trailing
                        // "more colors" swatch that opens the full picker
                        // (custom colors, add, clear).
                        <div className="sb-verse-toolbar-colors-inline">
                          {DEFAULT_HIGHLIGHT_COLOR_IDS.map((colorId) => (
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
                                  {
                                    colorId,
                                  }
                                );
                              }}
                              aria-label={`${highlightLabel} ${colorId}`}
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
                          <button
                            type="button"
                            className="sb-verse-toolbar-color-button sb-verse-toolbar-more-colors"
                            onClick={() => {
                              isHighlightPickerOpen.value = true;
                            }}
                            aria-label={t("more-colors", {
                              defaultValue: "More colors",
                            })}
                            title={t("more-colors", {
                              defaultValue: "More colors",
                            })}
                          >
                            <span className="sb-verse-toolbar-color sb-verse-toolbar-more-colors-swatch" />
                          </button>
                        </div>
                      ) : (
                        <div className="sb-verse-toolbar-action-item">
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
                      ))}
                    <div className="sb-verse-toolbar-action-item">
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
                    {nonCancel.map(renderTool)}
                    {cancelTools.map(renderTool)}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </>
  );
}
