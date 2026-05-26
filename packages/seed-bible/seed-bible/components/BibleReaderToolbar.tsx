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

  const hiddenToolIds = new Set([
    "previous-chapter",
    "next-chapter",
    "open-selector",
    "open-sidebar",
    "open-search",
    "open-chat",
  ]);

  const extraItems = tools
    .filter((tool) => tool.visible.value && !hiddenToolIds.has(tool.id))
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
    //   id: "ask",
    //   label: t("ask", { defaultValue: "Ask" }),
    //   iconName: "auto_awesome",
    //   onClick: onClose,
    // },
    {
      id: "discovery",
      label: t("discovery", { defaultValue: "Discovery" }),
      iconName: "explore",
      onClick: onClose,
    },
    {
      id: "chat",
      label: t("chat", { defaultValue: "Chat" }),
      iconName: "chat_bubble_outline",
      onClick: onClose,
    },
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
 * Broadcasts a highlight to the rest of a shared session by creating one
 * `VerseDecoration` per selected verse. The decoration is synced through
 * `SessionsManager`'s existing decorations CRDT, so other connected clients
 * see the exact same visual styling.
 *
 * If the session's `highlightDurationSeconds` is set (non-null, non-zero),
 * we schedule a local removal after that many seconds — the removal also
 * propagates through the CRDT so every client clears it at once.
 */
function broadcastHighlightToSession(
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
  session: BibleReadingSession | null,
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
  const duration = session?.options.value.highlightDurationSeconds ?? null;
  const isTransient = session !== null && duration !== null && duration > 0;

  if (isTransient) {
    // Wipe any prior permanent highlight on these verses so the timer is
    // the sole source of truth for how long the highlight shows.
    void rs.unhighlightSelectedVerses();
  } else {
    void rs.highlightSelectedVerses(details);
  }

  broadcastHighlightToSession(session, rs, details);
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

  const previousChapterTool = useComputed(
    () => tools.value.find((tool) => tool.id === "previous-chapter") ?? null
  );
  const nextChapterTool = useComputed(
    () => tools.value.find((tool) => tool.id === "next-chapter") ?? null
  );
  const openSelectorTool = useComputed(
    () => tools.value.find((tool) => tool.id === "open-selector") ?? null
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
    return rs.selectedVerses.value.some((verse) => {
      const existing = rs.highlights.value.highlights.find((h) =>
        highlightContainsVerse(h, verse.verse.number)
      );
      return !!existing;
    });
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
            !sidebar.isSearchPanelOpen.value &&
            settings.settings.value.showNavArrows &&
            previousChapterTool.value && (
              <button
                disabled={previousChapterTool.value.disabled.value}
                onClick={previousChapterTool.value.onSelect}
                className="sb-reader-toolbar-floating-button sb-reader-toolbar-floating-button-left"
                aria-label={translateTitle(t, previousChapterTool.value.title)}
              >
                <previousChapterTool.value.icon />
              </button>
            )}

          {isSmallScreen.value &&
            !sidebar.isSearchPanelOpen.value &&
            settings.settings.value.showNavArrows &&
            nextChapterTool.value && (
              <button
                disabled={nextChapterTool.value.disabled.value}
                onClick={nextChapterTool.value.onSelect}
                className="sb-reader-toolbar-floating-button sb-reader-toolbar-floating-button-right"
                aria-label={translateTitle(t, nextChapterTool.value.title)}
              >
                <nextChapterTool.value.icon />
              </button>
            )}

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
                  onClick={() => {
                    // Placeholder — not wired up yet.
                    isMoreMenuOpen.value = false;
                  }}
                />

                <MobileBottomTab
                  iconNode={<SelfAvatarVisual state={props.state} />}
                  label={t("you", { defaultValue: "You" })}
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
                  iconNode={<SeedBibleIcon size={24} />}
                  label={t("bible", { defaultValue: "Bible" })}
                  active={
                    !sidebar.isSearchPanelOpen.value && !isMoreMenuOpen.value
                  }
                  onClick={() => {
                    isMoreMenuOpen.value = false;
                    sidebar.closeSearchPanel();
                    sidebar.closeChatPanel();
                    selectedToolbarToolId.value = null;
                    openSelectorTool.value?.onSelect();
                  }}
                />

                <MobileBottomTab
                  iconName="search"
                  label={t("search", { defaultValue: "Search" })}
                  active={sidebar.isSearchPanelOpen.value}
                  onClick={() => {
                    isMoreMenuOpen.value = false;
                    if (sidebar.isSearchPanelOpen.value) {
                      sidebar.closeSearchPanel();
                    } else {
                      sidebar.openSearchPanel();
                    }
                  }}
                />

                <div className="sb-reader-toolbar-item sb-reader-toolbar-mobile-tab sb-reader-toolbar-more-anchor">
                  <button
                    type="button"
                    onClick={() => {
                      isMoreMenuOpen.value = !isMoreMenuOpen.value;
                    }}
                    className={`sb-reader-toolbar-button sb-reader-toolbar-mobile-tab-button${
                      isMoreMenuOpen.value
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
                      tools={tools.value}
                      onClose={() => {
                        isMoreMenuOpen.value = false;
                      }}
                    />
                  )}
                </div>
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
          {isHighlightPickerOpen.value && (
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
                  // Clean up the shared decoration first so the removal
                  // propagates to other clients even if the local
                  // unhighlight is a no-op (e.g. user isn't logged in
                  // with HighlightsManager but the session had a
                  // decoration broadcast earlier).
                  removeSharedHighlightsFromSelection(sessionState.value, rs);
                  rs.unhighlightSelectedVerses();
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
                return (
                  <>
                    {selectionUI.value.showHighlightColors && (
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
                    )}
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
