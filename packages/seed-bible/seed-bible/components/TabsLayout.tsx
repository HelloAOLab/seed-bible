import { BibleReader } from "./BibleReader/BibleReader";
import { BelowReaderToolbar } from "./BelowReaderToolbar/BelowReaderToolbar";
import type { TranslationBookChapter } from "../managers/FreeUseBibleAPI";
import type { BibleSelectorState } from "../managers/BibleSelectorManager";
import type { ReaderTab, TabsManager } from "../managers/TabsManager";
import type { TabSlot, TabsLayoutManager } from "../managers/TabsLayoutManager";
import type { SeedBibleState } from "../managers/SeedBibleStateManager";
import { type ToolsManager } from "../managers/BibleToolsManager";
import { batch, effect } from "@preact/signals";
import { useI18n } from "../i18n/I18nManager";
import { translateTitle } from "../app/utils";
import { useEffect, useRef, useState } from "preact/hooks";

interface TabSlotReaderProps {
  slot: TabSlot;
  tab: ReaderTab;
  state: SeedBibleState;
}

// How close (in px) the mobile reader must be to the end of the chapter before
// the toolbar auto-expands back into view. A few pixels of slack absorbs
// sub-pixel rounding and elastic overscroll so the reveal fires reliably at
// the true bottom.
const BOTTOM_REVEAL_MARGIN = 4;

export function TabSlotReader(props: TabSlotReaderProps) {
  const { slot, tab, state } = props;
  const readingState = tab.readingState;
  const isMobile = state?.app.isMobile.value ?? false;

  const slotScrollerRef = useRef<HTMLDivElement | null>(null);
  const mobileScrollerRef = useRef<HTMLDivElement | null>(null);
  const swipeViewportRef = useRef<HTMLDivElement | null>(null);
  const swipeTrackRef = useRef<HTMLDivElement | null>(null);
  const swipeTouchStartX = useRef<number | null>(null);
  const swipeTouchStartY = useRef<number | null>(null);
  const swipeDirectionLocked = useRef<"h" | "v" | null>(null);
  const swipeCurrentDx = useRef(0);
  const currentChapterRef = useRef(readingState.chapterData.value);
  const lastScrollTopRef = useRef(0);
  const scrollerCleanupRef = useRef<(() => void) | null>(null);

  const [prevChapterPreview, setPrevChapterPreview] =
    useState<TranslationBookChapter | null>(null);
  const [nextChapterPreview, setNextChapterPreview] =
    useState<TranslationBookChapter | null>(null);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Mirror scroll-direction state to a body class so chrome rendered outside
  // this component (e.g. the global BibleReaderToolbar in app/main.tsx) can
  // hide/show in sync with the reader header.
  useEffect(() => {
    if (!isMobile) return;
    const className = "sb-scroll-hide-bars";
    if (isScrolled) {
      document.body.classList.add(className);
    } else {
      document.body.classList.remove(className);
    }
    return () => {
      document.body.classList.remove(className);
    };
  }, [isMobile, isScrolled]);

  const attachScroller = (element: HTMLDivElement | null) => {
    scrollerCleanupRef.current?.();
    scrollerCleanupRef.current = null;

    if (!element) {
      return;
    }

    const cleanup = effect(() => {
      if (readingState.chapterData.value) {
        element.scrollTop = readingState.scrollPosition.peek();
      }

      const verseToScroll = readingState.scrollToVerse.value;
      if (readingState.chapterData.value && verseToScroll !== null) {
        requestAnimationFrame(() => {
          const targetVerse = element.querySelector(
            `[data-verse-number="${verseToScroll}"]`
          );
          if (!(targetVerse instanceof HTMLElement)) {
            return;
          }

          targetVerse.scrollIntoView({ block: "center", inline: "nearest" });
          batch(() => {
            readingState.scrollToVerse.value = null;
            readingState.scrollPosition.value = element.scrollTop;
          });
        });
      }

      currentChapterRef.current = readingState.chapterData.value;

      const handleScroll = () => {
        if (
          currentChapterRef.current?.translation.id ===
            readingState.translationId.value &&
          currentChapterRef.current?.book.id === readingState.bookId.value &&
          currentChapterRef.current?.chapter.number ===
            readingState.chapterNumber.value
        ) {
          readingState.scrollPosition.value = element.scrollTop;
        }

        if (!isMobile) {
          return;
        }

        const currentScrollTop = element.scrollTop;
        // Distance from the current scroll position to the very bottom of the
        // chapter. When the reader lands within a small threshold of the end,
        // re-show the toolbar so the chapter-navigation controls are within
        // reach — even though the user is still scrolling down. Only counts
        // when the content actually overflows; otherwise there's no downward
        // scroll to reverse and `scrollHeight - clientHeight` isn't meaningful.
        const isScrollable = element.scrollHeight > element.clientHeight;
        const distanceToBottom =
          element.scrollHeight - (currentScrollTop + element.clientHeight);
        const reachedBottom =
          isScrollable && distanceToBottom <= BOTTOM_REVEAL_MARGIN;
        if (currentScrollTop <= 0 || reachedBottom) {
          setIsScrolled(false);
        } else if (
          currentScrollTop > lastScrollTopRef.current &&
          currentScrollTop > 50
        ) {
          setIsScrolled(true);
        } else if (currentScrollTop < lastScrollTopRef.current) {
          setIsScrolled(false);
        }
        lastScrollTopRef.current = currentScrollTop;
      };

      element.addEventListener("scroll", handleScroll, { passive: true });

      return () => {
        element.removeEventListener("scroll", handleScroll);
      };
    });

    scrollerCleanupRef.current = cleanup;
  };

  const slotScrollerRefCallback = (element: HTMLDivElement | null) => {
    slotScrollerRef.current = element;
    if (!isMobile) {
      attachScroller(element);
    }
  };

  const currentScrollerRefCallback = (element: HTMLDivElement | null) => {
    mobileScrollerRef.current = element;
    if (isMobile) {
      attachScroller(element);
    }
  };

  const swipeViewportRefCallback = (element: HTMLDivElement | null) => {
    swipeViewportRef.current = element;
  };

  const swipeTrackRefCallback = (element: HTMLDivElement | null) => {
    swipeTrackRef.current = element;
  };

  useEffect(() => {
    attachScroller(
      isMobile ? mobileScrollerRef.current : slotScrollerRef.current
    );

    return () => {
      scrollerCleanupRef.current?.();
      scrollerCleanupRef.current = null;
    };
  }, [isMobile, readingState]);

  const currentChapterValue = readingState.chapterData.value;

  useEffect(() => {
    if (!isMobile || !state) {
      setPrevChapterPreview(null);
      setNextChapterPreview(null);
      return;
    }

    const chapterData = currentChapterValue;
    if (!chapterData) {
      setPrevChapterPreview(null);
      setNextChapterPreview(null);
      return;
    }

    let cancelled = false;

    if (chapterData.previousChapterApiLink) {
      state.bibleData
        .getPreviousChapter(chapterData)
        .then((result) => {
          if (!cancelled) {
            setPrevChapterPreview(result ?? null);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setPrevChapterPreview(null);
          }
        });
    } else {
      setPrevChapterPreview(null);
    }

    if (chapterData.nextChapterApiLink) {
      state.bibleData
        .getNextChapter(chapterData)
        .then((result) => {
          if (!cancelled) {
            setNextChapterPreview(result ?? null);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setNextChapterPreview(null);
          }
        });
    } else {
      setNextChapterPreview(null);
    }

    return () => {
      cancelled = true;
    };
  }, [
    isMobile,
    state,
    currentChapterValue?.translation.id,
    currentChapterValue?.book.id,
    currentChapterValue?.chapter.number,
  ]);

  useEffect(() => {
    if (!isMobile) {
      return;
    }

    const viewport = swipeViewportRef.current;
    if (!viewport) {
      return;
    }

    const PANEL_PCT = 100 / 3;

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      swipeTouchStartX.current = touch.clientX;
      swipeTouchStartY.current = touch.clientY;
      swipeDirectionLocked.current = null;
      swipeCurrentDx.current = 0;

      const track = swipeTrackRef.current;
      if (track) {
        track.style.transition = "none";
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      if (
        swipeTouchStartX.current === null ||
        swipeTouchStartY.current === null
      ) {
        return;
      }

      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      const dx = touch.clientX - swipeTouchStartX.current;
      const dy = touch.clientY - swipeTouchStartY.current;

      if (!swipeDirectionLocked.current) {
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
          swipeDirectionLocked.current = "h";
        } else if (Math.abs(dy) > 10) {
          swipeDirectionLocked.current = "v";
          return;
        } else {
          return;
        }
      }

      if (swipeDirectionLocked.current === "v") {
        return;
      }

      const isRtl =
        readingState.chapterData.value?.translation.textDirection === "rtl";
      const hasNext = !!readingState.chapterData.value?.nextChapterApiLink;
      const hasPrev = !!readingState.chapterData.value?.previousChapterApiLink;
      let offset = dx;
      const attemptsNext = isRtl ? dx > 0 : dx < 0;
      const attemptsPrev = isRtl ? dx < 0 : dx > 0;

      if ((attemptsNext && !hasNext) || (attemptsPrev && !hasPrev)) {
        offset = Math.sign(dx) * Math.min(Math.abs(dx) * 0.15, 30);
      } else {
        const limit = window.innerWidth * 0.5;
        if (Math.abs(dx) > limit) {
          offset = Math.sign(dx) * (limit + (Math.abs(dx) - limit) * 0.2);
        }
      }

      swipeCurrentDx.current = offset;
      const track = swipeTrackRef.current;
      if (track) {
        const isRtl =
          readingState.chapterData.value?.translation.textDirection === "rtl";
        const sign = isRtl ? 1 : -1;
        track.style.transform = `translateX(calc(${sign * PANEL_PCT}% + ${offset}px))`;
      }
    };

    const onTouchEnd = () => {
      if (swipeDirectionLocked.current !== "h") {
        swipeTouchStartX.current = null;
        swipeDirectionLocked.current = null;
        return;
      }

      const dx = swipeCurrentDx.current;
      const threshold = 80;
      const isRtl =
        readingState.chapterData.value?.translation.textDirection === "rtl";
      const hasNext = !!readingState.chapterData.value?.nextChapterApiLink;
      const hasPrev = !!readingState.chapterData.value?.previousChapterApiLink;
      const swipedLeft = dx < -threshold;
      const swipedRight = dx > threshold;
      const shouldLoadNext = isRtl ? swipedRight : swipedLeft;
      const shouldLoadPrev = isRtl ? swipedLeft : swipedRight;

      swipeTouchStartX.current = null;
      swipeDirectionLocked.current = null;
      swipeCurrentDx.current = 0;

      const track = swipeTrackRef.current;
      if (!track) {
        return;
      }

      if (shouldLoadNext && hasNext) {
        track.style.transition = "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)";
        const sign = isRtl ? 1 : -1;
        const nextTransform = `translateX(${sign * PANEL_PCT * 2}%)`;
        track.style.transform = nextTransform;
        readingState.clearSelectedVerses();
        window.setTimeout(async () => {
          track.style.transition = "none";
          track.style.transform = `translateX(${sign * PANEL_PCT}%)`;
          await readingState.loadNextChapter();
        }, 250);
      } else if (shouldLoadPrev && hasPrev) {
        track.style.transition = "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)";
        const sign = isRtl ? 1 : -1;
        const prevTransform = "translateX(0%)";
        track.style.transform = prevTransform;
        readingState.clearSelectedVerses();
        window.setTimeout(async () => {
          track.style.transition = "none";
          track.style.transform = `translateX(${sign * PANEL_PCT}%)`;
          await readingState.loadPreviousChapter();
        }, 250);
      } else {
        track.style.transition = "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
        const sign = isRtl ? 1 : -1;
        track.style.transform = `translateX(${sign * PANEL_PCT}%)`;
      }
    };

    viewport.addEventListener("touchstart", onTouchStart, { passive: true });
    viewport.addEventListener("touchmove", onTouchMove, { passive: true });
    viewport.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      viewport.removeEventListener("touchstart", onTouchStart);
      viewport.removeEventListener("touchmove", onTouchMove);
      viewport.removeEventListener("touchend", onTouchEnd);
    };
  }, [isMobile, readingState]);

  // Keyboard chapter navigation for the selected slot. Left/Right move between
  // chapters (respecting text direction, like the swipe gesture and toolbar
  // chevrons), and Up surfaces the search panel. Down is intentionally unbound.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }

      // Only the selected slot responds, and never while typing in a field.
      if (state.tabsLayout.selectedSlotId.value !== slot.id) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        state.sidebar.openSearch();
        return;
      }

      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      const chapterData = readingState.chapterData.value;
      if (!chapterData || readingState.loading.value) {
        return;
      }

      // Visual direction: the next chapter sits to the right in LTR and to the
      // left in RTL, matching the toolbar chevrons and swipe gesture.
      const isRtl = chapterData.translation.textDirection === "rtl";
      const loadNext = event.key === (isRtl ? "ArrowLeft" : "ArrowRight");
      const canNavigate = loadNext
        ? !!chapterData.nextChapterApiLink
        : !!chapterData.previousChapterApiLink;
      if (!canNavigate) {
        return;
      }

      event.preventDefault();
      readingState.clearSelectedVerses();
      if (loadNext) {
        void readingState.loadNextChapter();
      } else {
        void readingState.loadPreviousChapter();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [readingState, state, slot.id]);

  effect(() => {
    void readingState.translationId.value;
    const track = swipeTrackRef.current;
    if (!track) {
      return;
    }

    track.style.removeProperty("transform");
  });

  const openAllSettings = () => {
    if (!state) {
      return;
    }

    setShowMobileSettings(false);
    window.setTimeout(() => {
      state.sidebar.openSettings();
      state.sidebar.openSidebar();
    }, 50);
  };

  const mobileChrome = isMobile
    ? {
        isScrolled,
        prevChapterPreview,
        nextChapterPreview,
        showMobileSettings,
        onOpenMobileSettings: () => {
          setShowMobileSettings(true);
          // Teach the settings sheet the first time the user opens it (mirrors
          // the tabs-layout contextual tip). Triggered from the button's own
          // handler so the tip fires reliably — the modal tour overlay can't be
          // tapped "through" to the real button.
          state?.tutorial.startContextual("mobile-settings");
        },
        onCloseMobileSettings: () => setShowMobileSettings(false),
        onOpenAllSettings: openAllSettings,
        swipeViewportRefCallback,
        swipeTrackRefCallback,
        currentScrollerRefCallback,
      }
    : undefined;

  return (
    <div
      className={`sb-pane-reader${isMobile ? " sb-pane-reader-mobile" : ""}`}
      ref={slotScrollerRefCallback}
    >
      <BibleReader
        currentSlot={slot}
        readingState={readingState}
        selectorState={state.selector}
        state={state}
        mobileChrome={mobileChrome}
        sharedSession={tab.sharedSession}
      />
      {!isMobile && (
        <BelowReaderToolbar
          toolsManager={state.tools}
          readingState={readingState}
          sharedSession={tab.sharedSession}
          selectorState={state.selector}
          tabsManager={state.tabs}
          panesManager={state.panes}
          tabsLayoutManager={state.tabsLayout}
          openSidebar={state.sidebar.openSidebar}
          openSearch={state.sidebar.openSearch}
          currentSlot={slot}
          toast={state.app.toast}
          openChat={state.sidebar.openChatPanel}
          chats={state.chats}
          features={state.features}
        />
      )}
    </div>
  );
}

function EmptySlotToolbar({
  toolsManager,
  selectorState,
  tabsLayoutManager,
  slot,
  tabs,
}: {
  toolsManager: ToolsManager;
  selectorState: BibleSelectorState;
  tabsLayoutManager: TabsLayoutManager;
  slot: TabSlot;
  tabs: TabsManager;
}) {
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const tools = toolsManager.getEmptySlotTools({
    selectorState,
    tabsLayoutManager,
    currentSlot: slot,
    tabs,
  });

  const { t } = useI18n();

  return (
    <div className="sb-empty-pane-toolbar">
      {tools.map((tool) => {
        const title = translateTitle(t, tool.title);
        const ToolIcon = tool.icon;
        const menuItems =
          tool.getItems?.().filter((item) => item.visible.value) ?? [];
        const hasMenuItems = menuItems.length > 0;
        return tool.visible.value ? (
          <div key={tool.id} className="sb-empty-pane-toolbar-item">
            <button
              disabled={tool.disabled.value}
              onClick={(event: MouseEvent) => {
                event.stopPropagation();
                if (hasMenuItems) {
                  setSelectedToolId((prev) =>
                    prev === tool.id ? null : tool.id
                  );
                  return;
                }

                setSelectedToolId(null);
                tool.onSelect();
              }}
              className="sb-empty-pane-toolbar-button"
              title={title}
            >
              <ToolIcon />
              <span className="sb-empty-pane-toolbar-label">{title}</span>
            </button>
            {hasMenuItems && selectedToolId === tool.id && (
              <div className="sb-tool-context-menu">
                {menuItems.map((item) => {
                  const MenuItemIcon = item.icon;
                  return (
                    <button
                      key={item.id}
                      disabled={item.disabled.value}
                      onClick={(event: MouseEvent) => {
                        event.stopPropagation();
                        item.onSelect();
                        setSelectedToolId(null);
                      }}
                      className="sb-tool-context-menu-item"
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
      })}
    </div>
  );
}

function getLayoutGridDimensions(layout: string): {
  cols: number;
  rows: number;
} {
  switch (layout) {
    case "split-2v":
      return { cols: 2, rows: 1 };
    case "split-3v":
      return { cols: 3, rows: 1 };
    case "split-4v":
      return { cols: 4, rows: 1 };
    case "grid-2x2":
      return { cols: 2, rows: 2 };
    case "split-left-two-right":
      return { cols: 2, rows: 2 };
    case "stacked-2":
      return { cols: 1, rows: 2 };
    default:
      return { cols: 1, rows: 1 };
  }
}

interface AttachedResizeDragState {
  type: "column" | "row";
  index: number;
  startPos: number;
  startSizes: number[];
}

interface TabsLayoutProps {
  state: SeedBibleState;
}

export function TabsLayout(props: TabsLayoutProps) {
  const { state } = props;
  const {
    app,
    tabsLayout: tabsLayoutManager,
    selector: selectorState,
    tabs: tabsManager,
    tools: toolsManager,
  } = state;
  const slots = app.effectiveSlots.value;
  const layout = app.effectiveSlotLayout.value;
  const selectedSlotId = app.panelsEnabled.value
    ? tabsLayoutManager.selectedSlotId.value
    : (slots[0]?.id ?? null);

  const slotElementMapRef = useRef(new Map<string, HTMLElement>());
  const layoutContainerRef = useRef<HTMLDivElement | null>(null);
  const { cols: layoutCols, rows: layoutRows } =
    getLayoutGridDimensions(layout);
  const [columnSizes, setColumnSizes] = useState<number[]>(() =>
    Array.from({ length: layoutCols }, () => 1 / layoutCols)
  );
  const [rowSizes, setRowSizes] = useState<number[]>(() =>
    Array.from({ length: layoutRows }, () => 1 / layoutRows)
  );
  const attachedResizeDragRef = useRef<AttachedResizeDragState | null>(null);

  const effectiveColumnSizes =
    columnSizes.length === layoutCols
      ? columnSizes
      : Array.from({ length: layoutCols }, () => 1 / layoutCols);
  const effectiveRowSizes =
    rowSizes.length === layoutRows
      ? rowSizes
      : Array.from({ length: layoutRows }, () => 1 / layoutRows);

  useEffect(() => {
    setColumnSizes(Array.from({ length: layoutCols }, () => 1 / layoutCols));
    setRowSizes(Array.from({ length: layoutRows }, () => 1 / layoutRows));
  }, [layout]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const resizeDrag = attachedResizeDragRef.current;
      if (!resizeDrag) {
        return;
      }

      event.preventDefault();
      const container = layoutContainerRef.current;
      if (!container) {
        return;
      }
      const rect = container.getBoundingClientRect();

      if (resizeDrag.type === "column") {
        const left = resizeDrag.startSizes[resizeDrag.index] ?? 0;
        const right = resizeDrag.startSizes[resizeDrag.index + 1] ?? 0;
        const deltaFrac = (event.clientX - resizeDrag.startPos) / rect.width;
        const newLeft = left + deltaFrac;
        const newRight = right - deltaFrac;
        const minFrac = 80 / rect.width;
        if (newLeft >= minFrac && newRight >= minFrac) {
          const next = [...resizeDrag.startSizes];
          next[resizeDrag.index] = newLeft;
          next[resizeDrag.index + 1] = newRight;
          setColumnSizes(next);
        }
      } else {
        const top = resizeDrag.startSizes[resizeDrag.index] ?? 0;
        const bottom = resizeDrag.startSizes[resizeDrag.index + 1] ?? 0;
        const deltaFrac = (event.clientY - resizeDrag.startPos) / rect.height;
        const newTop = top + deltaFrac;
        const newBottom = bottom - deltaFrac;
        const minFrac = 60 / rect.height;
        if (newTop >= minFrac && newBottom >= minFrac) {
          const next = [...resizeDrag.startSizes];
          next[resizeDrag.index] = newTop;
          next[resizeDrag.index + 1] = newBottom;
          setRowSizes(next);
        }
      }
    };

    const handlePointerUp = () => {
      attachedResizeDragRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  return (
    <div
      className="sb-panes-layout"
      data-layout={layout}
      ref={layoutContainerRef}
      style={{
        ...(layoutCols > 1
          ? {
              gridTemplateColumns: effectiveColumnSizes
                .map((s) => `minmax(0,${s}fr)`)
                .join(" "),
            }
          : {}),
        ...(layoutRows > 1
          ? {
              gridTemplateRows: effectiveRowSizes
                .map((s) => `minmax(0,${s}fr)`)
                .join(" "),
            }
          : {}),
      }}
    >
      {slots.map((slot, index) => (
        <div
          key={slot.id}
          className={`sb-pane-shell sb-pane-slot-${index + 1}${
            slot.id === selectedSlotId ? " sb-pane-shell-active" : ""
          }`}
          ref={(element: HTMLElement | null) => {
            if (element) {
              slotElementMapRef.current.set(slot.id, element);
            } else {
              slotElementMapRef.current.delete(slot.id);
            }
          }}
          onClick={() => app.selectSlot(slot.id)}
        >
          {slot.tab ? (
            <TabSlotReader slot={slot} tab={slot.tab} state={state} />
          ) : (
            <EmptySlotToolbar
              toolsManager={toolsManager}
              selectorState={selectorState}
              tabsLayoutManager={tabsLayoutManager}
              slot={slot}
              tabs={tabsManager}
            />
          )}
        </div>
      ))}

      {layoutCols > 1 &&
        effectiveColumnSizes.slice(0, -1).map((_, i) => {
          const leftPercent =
            effectiveColumnSizes.slice(0, i + 1).reduce((a, b) => a + b, 0) *
            100;
          return (
            <div
              key={`col-resize-${i}`}
              className="sb-pane-resize-handle sb-pane-resize-handle-col"
              style={{ left: `calc(${leftPercent}% - 3px)` }}
              onPointerDown={(event: PointerEvent) => {
                event.preventDefault();
                event.stopPropagation();
                attachedResizeDragRef.current = {
                  type: "column",
                  index: i,
                  startPos: event.clientX,
                  startSizes: [...effectiveColumnSizes],
                };
              }}
            />
          );
        })}

      {layoutRows > 1 &&
        effectiveRowSizes.slice(0, -1).map((_, i) => {
          const topPercent =
            effectiveRowSizes.slice(0, i + 1).reduce((a, b) => a + b, 0) * 100;
          return (
            <div
              key={`row-resize-${i}`}
              className="sb-pane-resize-handle sb-pane-resize-handle-row"
              style={{
                top: `calc(${topPercent}% - 3px)`,
                left:
                  layout === "split-left-two-right"
                    ? `${effectiveColumnSizes[0]! * 100}%`
                    : "0",
                right: "0",
              }}
              onPointerDown={(event: PointerEvent) => {
                event.preventDefault();
                event.stopPropagation();
                attachedResizeDragRef.current = {
                  type: "row",
                  index: i,
                  startPos: event.clientY,
                  startSizes: [...effectiveRowSizes],
                };
              }}
            />
          );
        })}
    </div>
  );
}
