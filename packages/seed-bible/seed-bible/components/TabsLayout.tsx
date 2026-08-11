import {
  BibleReader,
  CHAPTER_SKELETON_DELAY_MS,
} from "./BibleReader/BibleReader";
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
import { useCallback, useEffect, useRef, useState } from "preact/hooks";

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

// The swipe track is three panels wide — previous preview | current | next
// preview — so one panel is a third of it. Keep in sync with
// `.sb-reader-swipe-track` / `.sb-reader-swipe-panel` in BibleReader.css.
export const PANEL_PCT = 100 / 3;

// How long the track takes to slide over to a neighbouring panel.
const SWIPE_ANIMATION_MS = 250;

// How far a touch must travel before the gesture commits to an axis.
const SWIPE_LOCK_THRESHOLD_PX = 10;

/**
 * Cap on how long the track rests on the neighbouring panel waiting for the
 * chapter it navigated to. Navigation doesn't wait on the download, so until
 * then the centre panel still holds the outgoing chapter — recentring early is
 * what made a swipe flash it. Half the reader's skeleton delay, so a slow
 * chapter falls back to dimmed text before the placeholder appears.
 */
const SWIPE_SETTLE_BUDGET_MS = CHAPTER_SKELETON_DELAY_MS / 2;

export function TabSlotReader(props: TabSlotReaderProps) {
  const { slot, tab, state } = props;
  const readingState = tab.readingState;
  const isMobile = state?.app.isMobile.value ?? false;

  const swipeViewportRef = useRef<HTMLDivElement | null>(null);
  const swipeTrackRef = useRef<HTMLDivElement | null>(null);
  const swipeTouchStartX = useRef<number | null>(null);
  const swipeTouchStartY = useRef<number | null>(null);
  const swipeDirectionLocked = useRef<"h" | "v" | null>(null);
  const swipeCurrentDx = useRef(0);
  // Who owns the track's transform. Bumped by every new gesture, so a committed
  // swipe still waiting on its chapter knows it has been superseded.
  const swipeCommitToken = useRef(0);
  const swipeCommitTimer = useRef(0);
  // Timestamp of the newest touch sample accepted for this gesture.
  const swipeLastStamp = useRef(0);
  const lastScrollTopRef = useRef(0);

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

  // When a mobile pane opens (every pane fills the screen there), the verse
  // sheet yields and the default bottom toolbar comes back. Clear scroll-hide
  // so that bar isn't left translated off-screen — e.g. after Locations opens
  // a map from a verse selection while the user had scrolled down.
  useEffect(() => {
    if (!isMobile) return;
    return effect(() => {
      if ((state.panes?.panes?.value?.length ?? 0) > 0) {
        setIsScrolled(false);
      }
    });
  }, [isMobile, state]);

  // The element the reader actually scrolls in: the slot itself on desktop, the
  // centre swipe panel on mobile. Held as state rather than a ref so the
  // effects below re-run when the element genuinely changes — and *only* then.
  const [scroller, setScroller] = useState<HTMLDivElement | null>(null);

  // Memoised: a fresh function each render makes Preact detach and re-attach
  // the ref, which re-runs the scroll-restore effect below and yanks a partly
  // scrolled chapter back to its saved offset.
  const slotScrollerRefCallback = useCallback(
    (element: HTMLDivElement | null) => {
      if (!isMobile) {
        setScroller(element);
      }
    },
    [isMobile]
  );

  const currentScrollerRefCallback = useCallback(
    (element: HTMLDivElement | null) => {
      if (isMobile) {
        setScroller(element);
      }
    },
    [isMobile]
  );

  // Triggered by the *position* changing, not by `chapterData` arriving:
  // `applyPosition` has already zeroed `scrollPosition`, so this is what puts
  // the reader at the chapter heading while the placeholder shows. Kept
  // separate from the listener effect below — attaching a listener must never
  // move the reader, or every re-render that re-attaches it repeats this write.
  useEffect(() => {
    if (!scroller) {
      return;
    }

    return effect(() => {
      void readingState.translationId.value;
      void readingState.bookId.value;
      void readingState.chapterNumber.value;
      scroller.scrollTop = readingState.scrollPosition.peek();
    });
  }, [scroller, readingState]);

  // Bring a linked verse into view once its chapter is on screen.
  useEffect(() => {
    if (!scroller) {
      return;
    }

    let frame = 0;
    const dispose = effect(() => {
      const verseToScroll = readingState.scrollToVerse.value;
      if (!readingState.chapterData.value || verseToScroll === null) {
        return;
      }

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = 0;
        const targetVerse = scroller.querySelector(
          `[data-verse-number="${verseToScroll}"]`
        );
        if (!(targetVerse instanceof HTMLElement)) {
          return;
        }

        targetVerse.scrollIntoView({ block: "center", inline: "nearest" });
        batch(() => {
          readingState.scrollToVerse.value = null;
          readingState.scrollPosition.value = scroller.scrollTop;
        });
      });
    });

    return () => {
      cancelAnimationFrame(frame);
      dispose();
    };
  }, [scroller, readingState]);

  // Record where the reader has scrolled to, and drive the mobile chrome. Pure
  // observation — this effect never writes `scrollTop`.
  useEffect(() => {
    if (!scroller) {
      return;
    }

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scroller;

      // Only record the offset while the text on screen is the text the
      // position points at. Between the two — the reader has moved but the new
      // chapter is still downloading — a scroll event belongs to neither.
      const chapter = readingState.chapterData.peek();
      if (
        chapter?.translation.id === readingState.translationId.peek() &&
        chapter?.book.id === readingState.bookId.peek() &&
        chapter?.chapter.number === readingState.chapterNumber.peek()
      ) {
        readingState.scrollPosition.value = scrollTop;
      }

      if (!isMobile) {
        return;
      }

      // Re-show the toolbar within a few px of the end so the chapter controls
      // stay reachable even while scrolling down. Only when the content
      // overflows — otherwise `scrollHeight - clientHeight` is meaningless.
      const isScrollable = scrollHeight > clientHeight;
      const distanceToBottom = scrollHeight - (scrollTop + clientHeight);
      const reachedBottom =
        isScrollable && distanceToBottom <= BOTTOM_REVEAL_MARGIN;
      if (scrollTop <= 0 || reachedBottom) {
        setIsScrolled(false);
      } else if (scrollTop > lastScrollTopRef.current && scrollTop > 50) {
        setIsScrolled(true);
      } else if (scrollTop < lastScrollTopRef.current) {
        setIsScrolled(false);
      }
      lastScrollTopRef.current = scrollTop;
    };

    scroller.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scroller.removeEventListener("scroll", handleScroll);
    };
  }, [scroller, isMobile, readingState]);

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
    // Without this the prefetch holds a permanent claim on exactly the
    // adjacent-chapter URLs a fast skim is trying to cancel — a request is only
    // dropped once every caller that can walk away has — so cancellation would
    // be inert on mobile, which is where it matters most.
    const controller = new AbortController();
    const prefetchOptions = { signal: controller.signal };

    if (readingState.hasPrevious.value) {
      state.bibleData
        .getPreviousChapter(chapterData, prefetchOptions)
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

    if (readingState.hasNext.value) {
      state.bibleData
        .getNextChapter(chapterData, prefetchOptions)
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
      controller.abort();
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

    const isRtl = () =>
      readingState.chapterData.peek()?.translation.textDirection === "rtl";
    const centreTransform = () =>
      `translateX(${(isRtl() ? 1 : -1) * PANEL_PCT}%)`;

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      swipeTouchStartX.current = touch.clientX;
      swipeTouchStartY.current = touch.clientY;
      swipeDirectionLocked.current = null;
      swipeCurrentDx.current = 0;
      swipeLastStamp.current = event.timeStamp;

      // This gesture takes the track over from any committed swipe still
      // waiting on its chapter.
      swipeCommitToken.current += 1;

      const track = swipeTrackRef.current;
      if (track) {
        track.style.transition = "none";
        // Recentre unconditionally: a committed swipe may have left the track
        // resting on a neighbouring panel, and `onTouchMove` measures from
        // centre. A no-op when it is already there.
        track.style.transform = centreTransform();
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

      // Touch samples can arrive out of order. A move generated during the
      // *previous* gesture can sit in the queue while a chapter change blocks
      // the main thread, then be delivered mid-gesture — measured at 1.2s late —
      // carrying a coordinate from where the finger was back then. Acting on it
      // threw the track a couple of hundred pixels for one frame. Anything
      // older than the newest sample we have accepted is stale by definition;
      // the touchstart seeds this, so a sample predating the gesture is caught
      // too. Fails safe if a browser reports no useful timestamps: every
      // comparison is then false and nothing is dropped.
      if (event.timeStamp < swipeLastStamp.current) {
        return;
      }
      swipeLastStamp.current = event.timeStamp;

      const dx = touch.clientX - swipeTouchStartX.current;
      const dy = touch.clientY - swipeTouchStartY.current;

      if (!swipeDirectionLocked.current) {
        if (
          Math.abs(dx) > Math.abs(dy) &&
          Math.abs(dx) > SWIPE_LOCK_THRESHOLD_PX
        ) {
          swipeDirectionLocked.current = "h";
        } else if (Math.abs(dy) > SWIPE_LOCK_THRESHOLD_PX) {
          swipeDirectionLocked.current = "v";
          return;
        } else {
          return;
        }
      }

      if (swipeDirectionLocked.current === "v") {
        return;
      }

      if (event.cancelable) {
        event.preventDefault();
      }

      const rtl = isRtl();
      const hasNext = readingState.hasNext.value;
      const hasPrev = readingState.hasPrevious.value;
      // Discount the distance spent reaching the lock threshold, so the track
      // starts from where the gesture became horizontal rather than jumping by
      // the threshold the moment it engages.
      const travel = dx - Math.sign(dx) * SWIPE_LOCK_THRESHOLD_PX;
      let offset = travel;
      const attemptsNext = rtl ? dx > 0 : dx < 0;
      const attemptsPrev = rtl ? dx < 0 : dx > 0;

      if ((attemptsNext && !hasNext) || (attemptsPrev && !hasPrev)) {
        offset = Math.sign(dx) * Math.min(Math.abs(travel) * 0.15, 30);
      } else {
        const limit = window.innerWidth * 0.5;
        if (Math.abs(travel) > limit) {
          offset = Math.sign(dx) * (limit + (Math.abs(travel) - limit) * 0.2);
        }
      }

      swipeCurrentDx.current = offset;
      const track = swipeTrackRef.current;
      if (track) {
        const sign = rtl ? 1 : -1;
        track.style.transform = `translateX(calc(${sign * PANEL_PCT}% + ${offset}px))`;
      }
    };

    /**
     * Finishes a swipe past the threshold: slide to the neighbouring panel,
     * navigate, and recentre only once the new text is on screen. That panel is
     * a static preview of the chapter being fetched, so the wait shows the
     * right text.
     */
    const commitSwipe = (
      track: HTMLDivElement,
      landingTransform: string,
      navigate: () => Promise<void>
    ) => {
      const commit = ++swipeCommitToken.current;
      track.style.transition = `transform ${SWIPE_ANIMATION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`;
      track.style.transform = landingTransform;
      readingState.clearSelectedVerses();

      window.clearTimeout(swipeCommitTimer.current);

      // Held until the slide finishes: committing mid-animation swaps the
      // panels' contents under a moving track, which reads as a jump. Timing
      // has no bearing on whether Chrome honours the history entry a swipe
      // creates — see #1401.
      swipeCommitTimer.current = window.setTimeout(() => {
        // The navigation always runs, even if another gesture has since taken
        // the track over: the reader completed the swipe that asked for it.
        // Only the transform below is the superseding gesture's to own.
        const settled = navigate().catch(() => undefined);
        if (swipeCommitToken.current !== commit) {
          return;
        }

        let budget = 0;
        void Promise.race([
          settled,
          new Promise<void>((resolve) => {
            budget = window.setTimeout(resolve, SWIPE_SETTLE_BUDGET_MS);
          }),
        ]).then(() => {
          window.clearTimeout(budget);
          if (swipeCommitToken.current !== commit) {
            return;
          }
          track.style.transition = "none";
          track.style.transform = centreTransform();
        });
      }, SWIPE_ANIMATION_MS);
    };

    const onTouchEnd = () => {
      if (swipeDirectionLocked.current !== "h") {
        swipeTouchStartX.current = null;
        swipeDirectionLocked.current = null;
        return;
      }

      const dx = swipeCurrentDx.current;
      const threshold = 70;
      const rtl = isRtl();
      const hasNext = readingState.hasNext.value;
      const hasPrev = readingState.hasPrevious.value;
      const swipedLeft = dx < -threshold;
      const swipedRight = dx > threshold;
      const shouldLoadNext = rtl ? swipedRight : swipedLeft;
      const shouldLoadPrev = rtl ? swipedLeft : swipedRight;

      swipeTouchStartX.current = null;
      swipeDirectionLocked.current = null;
      swipeCurrentDx.current = 0;

      const track = swipeTrackRef.current;
      if (!track) {
        return;
      }

      const sign = rtl ? 1 : -1;

      if (shouldLoadNext && hasNext) {
        commitSwipe(track, `translateX(${sign * PANEL_PCT * 2}%)`, () =>
          readingState.loadNextChapter()
        );
      } else if (shouldLoadPrev && hasPrev) {
        commitSwipe(track, "translateX(0%)", () =>
          readingState.loadPreviousChapter()
        );
      } else {
        track.style.transition = "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
        track.style.transform = centreTransform();
      }
    };

    // The browser can take a gesture over mid-swipe (a system edge gesture, a
    // second finger). `touchend` never arrives in that case, so without this
    // the track stays parked wherever the finger left it and the next
    // `touchmove` measures from a stale origin.
    const onTouchCancel = () => {
      swipeTouchStartX.current = null;
      swipeTouchStartY.current = null;
      swipeDirectionLocked.current = null;
      swipeCurrentDx.current = 0;

      const track = swipeTrackRef.current;
      if (track) {
        track.style.transition = "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
        track.style.transform = centreTransform();
      }
    };

    viewport.addEventListener("touchstart", onTouchStart, { passive: true });
    viewport.addEventListener("touchmove", onTouchMove, { passive: false });
    viewport.addEventListener("touchend", onTouchEnd, { passive: true });
    viewport.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      // Retire any commit still in flight: the pending timer would otherwise
      // navigate on behalf of a component that no longer exists, and the token
      // bump stops a settled one writing to a track this effect no longer owns.
      window.clearTimeout(swipeCommitTimer.current);
      swipeCommitToken.current += 1;
      viewport.removeEventListener("touchstart", onTouchStart);
      viewport.removeEventListener("touchmove", onTouchMove);
      viewport.removeEventListener("touchend", onTouchEnd);
      viewport.removeEventListener("touchcancel", onTouchCancel);
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

      // Visual direction: the next chapter sits to the right in LTR and to the
      // left in RTL, matching the toolbar chevrons and swipe gesture. Read from
      // the translation rather than the loaded chapter so the arrow keys keep
      // working while the text for a new position is still on its way — and
      // deliberately not gated on `loading`, so repeated presses advance.
      const isRtl = readingState.translation.value?.textDirection === "rtl";
      const loadNext = event.key === (isRtl ? "ArrowLeft" : "ArrowRight");
      const canNavigate = loadNext
        ? readingState.hasNext.value
        : readingState.hasPrevious.value;
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

  // Drop the inline transform on a translation change so the track falls back
  // to the stylesheet's centred rest (which flips for RTL). In `useEffect`
  // because a bare `effect()` in the render body resubscribes on every render
  // and is never disposed.
  useEffect(
    () =>
      effect(() => {
        void readingState.translationId.value;
        const track = swipeTrackRef.current;
        if (!track) {
          return;
        }

        track.style.removeProperty("transform");
      }),
    [readingState]
  );

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
        swipeViewportRef,
        swipeTrackRef,
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
                      className="sb-tool-context-menu-item ssd"
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
