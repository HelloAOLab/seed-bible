import { batch, useComputed, useSignal } from "@preact/signals";
import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";
import { useI18n } from "seed-bible.i18n.I18nManager";
import { translateTitle } from "seed-bible.components.Utils";
import { applyToolbarCustomization } from "seed-bible.managers.SettingsManager";
import { highlightContainsVerse } from "seed-bible.managers.HighlightsManager";
import type { BibleReadingSession } from "seed-bible.managers.SessionsManager";
import type { BibleReadingState } from "seed-bible.managers.BibleReadingManager";
import {
  handleHorizontalListKeyNav,
  handleVerticalListKeyNav,
} from "seed-bible.components.KeyboardNav";
import { TabsIcon } from "seed-bible.components.icons";
import { useEffect, useRef } from "preact/hooks";

const DEFAULT_HIGHLIGHT_COLOR_IDS = ["yellow", "green", "blue"] as const;

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
  const selectedOverflowToolId = useSignal<string | null>(null);

  const previousChapterTool = useComputed(
    () => tools.value.find((tool) => tool.id === "previous-chapter") ?? null
  );
  const nextChapterTool = useComputed(
    () => tools.value.find((tool) => tool.id === "next-chapter") ?? null
  );
  const openSelectorTool = useComputed(
    () => tools.value.find((tool) => tool.id === "open-selector") ?? null
  );
  const openSidebarTool = useComputed(
    () => tools.value.find((tool) => tool.id === "open-sidebar") ?? null
  );
  const overflowTools = useComputed(() =>
    tools.value.filter(
      (tool) =>
        tool.visible.value &&
        tool.id !== "previous-chapter" &&
        tool.id !== "next-chapter" &&
        tool.id !== "open-selector" &&
        tool.id !== "open-sidebar"
    )
  );
  const hasOverflowTools = useComputed(() => overflowTools.value.length > 0);

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
                <div className="sb-reader-toolbar-item sb-reader-toolbar-mobile-tabs-item">
                  <button
                    disabled={
                      !openSidebarTool.value ||
                      openSidebarTool.value.disabled.value
                    }
                    onClick={() => {
                      selectedToolbarToolId.value = null;
                      openSidebarTool.value?.onSelect();
                    }}
                    className="sb-reader-toolbar-button sb-reader-toolbar-mobile-tabs-button"
                    aria-label={translateTitle(
                      t,
                      openSidebarTool.value?.title ?? {
                        key: "tabs",
                        defaultValue: "Tabs",
                      }
                    )}
                  >
                    <span className="sb-reader-toolbar-mobile-tabs-icon">
                      <TabsIcon />
                    </span>
                    <span className="sb-reader-toolbar-mobile-tabs-label">
                      {t("tabs", { defaultValue: "Tabs" })}
                    </span>
                  </button>
                </div>

                <div className="sb-reader-toolbar-item sb-reader-toolbar-center-item">
                  <button
                    disabled={
                      !openSelectorTool.value ||
                      openSelectorTool.value.disabled.value
                    }
                    onClick={() => {
                      selectedToolbarToolId.value = null;
                      openSelectorTool.value?.onSelect();
                    }}
                    className="sb-reader-toolbar-button"
                    aria-label={translateTitle(
                      t,
                      openSelectorTool.value?.title ?? {
                        key: "open_book_selector",
                        defaultValue: "Open Book Selector",
                      }
                    )}
                  >
                    {openSelectorTool.value ? (
                      <openSelectorTool.value.icon />
                    ) : null}
                  </button>
                </div>

                {/*
                  More button intentionally commented out — mobile layout
                  now only shows Tabs (left) and the book selector (right)
                  to match the design.
                <div className="sb-reader-toolbar-item sb-reader-toolbar-more-anchor">
                  {hasOverflowTools.value && (
                    <>
                      <button
                        onClick={() => {
                          isMoreMenuOpen.value = !isMoreMenuOpen.value;
                        }}
                        className="sb-reader-toolbar-button"
                        aria-label={t("more-tools", {
                          defaultValue: "More tools",
                        })}
                      >
                        <span>{t("more", { defaultValue: "More" })}</span>
                      </button>
                      {isMoreMenuOpen.value && (
                        <div
                          className="sb-reader-toolbar-more-menu"
                          role="menu"
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              event.preventDefault();
                              isMoreMenuOpen.value = false;
                              return;
                            }
                            handleVerticalListKeyNav(
                              event,
                              event.currentTarget
                            );
                          }}
                        >
                          {overflowTools.value.map((tool) => {
                            const ToolIcon = tool.icon;
                            return tool.visible.value ? (
                              <div key={tool.id}>
                                <button
                                  disabled={tool.disabled.value}
                                  onClick={() => {
                                    const menuItems = tool.getItems?.() ?? [];
                                    if (menuItems.length > 0) {
                                      selectedOverflowToolId.value =
                                        selectedOverflowToolId.value === tool.id
                                          ? null
                                          : tool.id;
                                      return;
                                    }

                                    selectedOverflowToolId.value = null;
                                    tool.onSelect();
                                    isMoreMenuOpen.value = false;
                                  }}
                                  className="sb-reader-toolbar-more-item"
                                >
                                  <ToolIcon />
                                  <span>{translateTitle(t, tool.title)}</span>
                                </button>
                                {selectedOverflowToolId.value === tool.id &&
                                  (() => {
                                    const menuItems =
                                      tool
                                        .getItems?.()
                                        .filter((item) => item.visible.value) ??
                                      [];
                                    if (menuItems.length === 0) {
                                      return null;
                                    }

                                    return (
                                      <div
                                        className="sb-tool-context-menu sb-tool-context-menu-inline"
                                        role="menu"
                                      >
                                        {menuItems.map((item) => {
                                          const MenuItemIcon = item.icon;
                                          return (
                                            <button
                                              key={item.id}
                                              disabled={item.disabled.value}
                                              onClick={() => {
                                                item.onSelect();
                                                selectedOverflowToolId.value =
                                                  null;
                                                isMoreMenuOpen.value = false;
                                              }}
                                              className="sb-tool-context-menu-item"
                                              role="menuitem"
                                            >
                                              <MenuItemIcon />
                                              <span>
                                                {translateTitle(t, item.title)}
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    );
                                  })()}
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
                */}
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
