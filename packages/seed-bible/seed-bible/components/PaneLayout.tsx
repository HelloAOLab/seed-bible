import { BibleReader } from "../components/BibleReader";
import { BelowReaderToolbar } from "../components/BelowReaderToolbar";
import { CasualOSApp } from "../components/CasualOSApp";
import type { TranslationBookChapter } from "../managers/FreeUseBibleAPI";
import type { BibleSelectorState } from "../managers/BibleSelectorManager";
import type { ReaderTab, TabsManager } from "../managers/TabsManager";
import type {
  CasualOSPattern,
  DetachedPaneAnchor,
  Pane,
  PaneLayoutId,
  PanesManager,
} from "../managers/PanesManager";
import type { SeedBibleState } from "../managers/SeedBibleStateManager";
import { type ToolsManager } from "../managers/BibleToolsManager";
import { UI_TEXT_SIZE_SCALE_MAP } from "../managers/SettingsManager";
import { batch, effect } from "@preact/signals";
import { useI18n } from "../i18n/I18nManager";
import { translateTitle } from "../components/Utils";
import { MaterialIcon } from "../components/icons";
import { useEffect, useRef, useState } from "preact/hooks";

// const ATTACHED_PANE_MIN_SIZE_PX = 180;

type MultiPaneLayoutId = Exclude<PaneLayoutId, "single">;

interface AttachedPaneSizesState {
  "split-2v": { columns: number[] };
  "split-left-two-right": { columns: number[]; rows: number[] };
  "split-3v": { columns: number[] };
  "grid-2x2": { columns: number[]; rows: number[] };
  "split-4v": { columns: number[] };
}

// type AttachedResizeHandleDescriptor = {
//   id: string;
//   axis: "x" | "y";
//   ratio: number;
//   crossStart: number;
//   crossEnd: number;
// };

// const DEFAULT_ATTACHED_PANE_SIZES: AttachedPaneSizesState = {
//   "split-2v": { columns: [1, 1] },
//   "split-left-two-right": { columns: [1.2, 1], rows: [1, 1] },
//   "split-3v": { columns: [1, 1, 1] },
//   "grid-2x2": { columns: [1, 1], rows: [1, 1] },
//   "split-4v": { columns: [1, 1, 1, 1] },
// };

// function clamp(value: number, min: number, max: number) {
//   return Math.max(min, Math.min(max, value));
// }

// function toGridTrack(value: number) {
//   return `minmax(0, ${value}fr)`;
// }

// function getRatioAtIndex(values: number[], index: number) {
//   const total = values.reduce((sum, current) => sum + current, 0);
//   if (total <= 0) {
//     return 0;
//   }

//   const before = values
//     .slice(0, index + 1)
//     .reduce((sum, current) => sum + current, 0);
//   return clamp(before / total, 0, 1);
// }

// function resizeAdjacentTracks(
//   tracks: number[],
//   index: number,
//   deltaPx: number,
//   containerSizePx: number
// ) {
//   if (index < 0 || index >= tracks.length - 1 || containerSizePx <= 0) {
//     return tracks;
//   }

//   const nextTracks = [...tracks];
//   const currentTrack = tracks[index] ?? 0;
//   const adjacentTrack = tracks[index + 1] ?? 0;
//   const pairTotal = currentTrack + adjacentTrack;
//   const minimumTrack =
//     (ATTACHED_PANE_MIN_SIZE_PX / containerSizePx) * pairTotal;
//   const boundedMinimumTrack = clamp(minimumTrack, 0.05, pairTotal / 2 - 0.0001);
//   if (boundedMinimumTrack * 2 >= pairTotal) {
//     return tracks;
//   }

//   const deltaTrack = (deltaPx / containerSizePx) * pairTotal;
//   const nextCurrentTrack = clamp(
//     currentTrack + deltaTrack,
//     boundedMinimumTrack,
//     pairTotal - boundedMinimumTrack
//   );

//   nextTracks[index] = nextCurrentTrack;
//   nextTracks[index + 1] = pairTotal - nextCurrentTrack;
//   return nextTracks;
// }

// function getAttachedResizeHandles(
//   layout: PaneLayoutId,
//   attachedPaneSizes: AttachedPaneSizesState
// ): AttachedResizeHandleDescriptor[] {
//   if (layout === "split-2v") {
//     return [
//       {
//         id: "col-0",
//         axis: "x",
//         ratio: getRatioAtIndex(attachedPaneSizes["split-2v"].columns, 0),
//         crossStart: 0,
//         crossEnd: 1,
//       },
//     ];
//   }

//   if (layout === "split-3v") {
//     return [0, 1].map((index) => ({
//       id: `col-${index}`,
//       axis: "x" as const,
//       ratio: getRatioAtIndex(attachedPaneSizes["split-3v"].columns, index),
//       crossStart: 0,
//       crossEnd: 1,
//     }));
//   }

//   if (layout === "split-4v") {
//     return [0, 1, 2].map((index) => ({
//       id: `col-${index}`,
//       axis: "x" as const,
//       ratio: getRatioAtIndex(attachedPaneSizes["split-4v"].columns, index),
//       crossStart: 0,
//       crossEnd: 1,
//     }));
//   }

//   if (layout === "grid-2x2") {
//     return [
//       {
//         id: "col-0",
//         axis: "x",
//         ratio: getRatioAtIndex(attachedPaneSizes["grid-2x2"].columns, 0),
//         crossStart: 0,
//         crossEnd: 1,
//       },
//       {
//         id: "row-0",
//         axis: "y",
//         ratio: getRatioAtIndex(attachedPaneSizes["grid-2x2"].rows, 0),
//         crossStart: 0,
//         crossEnd: 1,
//       },
//     ];
//   }

//   if (layout === "split-left-two-right") {
//     const columnRatio = getRatioAtIndex(
//       attachedPaneSizes["split-left-two-right"].columns,
//       0
//     );

//     return [
//       {
//         id: "col-0",
//         axis: "x",
//         ratio: columnRatio,
//         crossStart: 0,
//         crossEnd: 1,
//       },
//       {
//         id: "row-0",
//         axis: "y",
//         ratio: getRatioAtIndex(
//           attachedPaneSizes["split-left-two-right"].rows,
//           0
//         ),
//         crossStart: columnRatio,
//         crossEnd: 1,
//       },
//     ];
//   }

//   return [];
// }

// function getAttachedLayoutStyle(
//   layout: PaneLayoutId,
//   attachedPaneSizes: AttachedPaneSizesState
// ) {
//   if (layout === "split-2v") {
//     return {
//       gridTemplateColumns: attachedPaneSizes["split-2v"].columns
//         .map(toGridTrack)
//         .join(" "),
//     };
//   }

//   if (layout === "split-left-two-right") {
//     return {
//       gridTemplateColumns: attachedPaneSizes["split-left-two-right"].columns
//         .map(toGridTrack)
//         .join(" "),
//       gridTemplateRows: attachedPaneSizes["split-left-two-right"].rows
//         .map(toGridTrack)
//         .join(" "),
//     };
//   }

//   if (layout === "split-3v") {
//     return {
//       gridTemplateColumns: attachedPaneSizes["split-3v"].columns
//         .map(toGridTrack)
//         .join(" "),
//     };
//   }

//   if (layout === "grid-2x2") {
//     return {
//       gridTemplateColumns: attachedPaneSizes["grid-2x2"].columns
//         .map(toGridTrack)
//         .join(" "),
//       gridTemplateRows: attachedPaneSizes["grid-2x2"].rows
//         .map(toGridTrack)
//         .join(" "),
//     };
//   }

//   if (layout === "split-4v") {
//     return {
//       gridTemplateColumns: attachedPaneSizes["split-4v"].columns
//         .map(toGridTrack)
//         .join(" "),
//     };
//   }

//   return {};
// }

interface GridPortalPaneProps {
  portal: string;
  portalType: "grid" | "map";
  inst: string;
  pattern: CasualOSPattern;
  query: Record<string, string> | null;
}

const FULLSCREEN_EXIT_BUTTON_CSS = `
  .sb-fullscreen-exit-wrapper {
    position: fixed;
    top: 12px;
    right: 12px;
    z-index: 1000;
    pointer-events: auto;
  }

  .sb-fullscreen-exit-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border: none;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.72);
    color: white;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.32);
    -webkit-backdrop-filter: blur(4px);
    backdrop-filter: blur(4px);
  }

  .sb-fullscreen-exit-button:hover {
    background: rgba(0, 0, 0, 0.88);
  }

  .sb-fullscreen-exit-button .material-symbols-outlined {
    font-size: 18px;
  }
`;

function GridPortalPane(props: GridPortalPaneProps) {
  const { portal, portalType, pattern, inst } = props;
  const portalTitle = portalType === "map" ? "Map Portal" : "Grid Portal";

  const iframeUrl = new URL("https://ao.bot/");

  iframeUrl.searchParams.set("inst", inst);

  if (portalType === "map") {
    iframeUrl.searchParams.set("mapPortal", portal);
  } else if (portalType === "grid") {
    iframeUrl.searchParams.set("gridPortal", portal);
  }

  if ("aux" in pattern) {
    iframeUrl.searchParams.set("patternAux", pattern.aux);
  } else {
    iframeUrl.searchParams.set("pattern", pattern.name);
  }

  if (props.query) {
    for (const [key, value] of Object.entries(props.query)) {
      iframeUrl.searchParams.set(key, value);
    }
  }

  let allow = "";

  if (import.meta.env.DEV) {
    allow += "local-network-access";
  }

  return (
    <>
      <div className="sb-grid-portal-pane">
        <div className="sb-grid-portal-pane-badge">{portalTitle}</div>
        <div className="sb-grid-portal-pane-name">{portal}</div>
      </div>
      <iframe
        className="sb-grid-portal-pane-iframe"
        src={iframeUrl.toString()}
        referrerPolicy={"origin-when-cross-origin"}
        allow={allow}
      ></iframe>
    </>
  );
}

interface PaneReaderScrollerProps {
  pane: Pane;
  tab: ReaderTab;
  state: SeedBibleState;
  displayBelowReaderToolbar: boolean;
}

export function PaneReader(props: PaneReaderScrollerProps) {
  const { pane, tab, state, displayBelowReaderToolbar } = props;
  const readingState = tab.readingState;
  const isMobile = state?.app.isMobile.value ?? false;

  const paneScrollerRef = useRef<HTMLDivElement | null>(null);
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
        if (currentScrollTop <= 0) {
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

  const paneScrollerRefCallback = (element: HTMLDivElement | null) => {
    paneScrollerRef.current = element;
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
      isMobile ? mobileScrollerRef.current : paneScrollerRef.current
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

  // Keyboard chapter navigation for the selected pane. Left/Right move between
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

      // Only the selected pane responds, and never while typing in a field.
      if (state.panes.selectedPaneId.value !== pane.id) {
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
  }, [readingState, state, pane.id]);

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
          // the pane-layout contextual tip). Triggered from the button's own
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
      ref={paneScrollerRefCallback}
    >
      <BibleReader
        currentPane={pane}
        readingState={readingState}
        selectorState={state.selector}
        state={state}
        mobileChrome={mobileChrome}
      />
      {!isMobile && displayBelowReaderToolbar && (
        <BelowReaderToolbar
          toolsManager={state.tools}
          readingState={readingState}
          sharedSession={tab.sharedSession}
          selectorState={state.selector}
          tabsManager={state.tabs}
          panesManager={state.panes}
          openSidebar={state.sidebar.openSidebar}
          openSearch={state.sidebar.openSearch}
          currentPane={pane}
          toast={state.app.toast}
          openChat={state.sidebar.openChatPanel}
          chats={state.chats}
        />
      )}
    </div>
  );
}

function EmptyPaneToolbar({
  toolsManager,
  selectorState,
  panesManager,
  pane,
  tabs,
}: {
  toolsManager: ToolsManager;
  selectorState: BibleSelectorState;
  panesManager: PanesManager;
  pane: Pane;
  tabs: TabsManager;
}) {
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const tools = toolsManager.getEmptyPaneTools({
    selectorState,
    panesManager,
    currentPane: pane,
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
    default:
      return { cols: 1, rows: 1 };
  }
}

interface PaneLayoutProps {
  state: SeedBibleState;
}

export function PaneLayout(props: PaneLayoutProps) {
  const { state } = props;
  const {
    app,
    panes: panesManager,
    selector: selectorState,
    tabs: tabsManager,
    tools: toolsManager,
  } = state;
  // Read at call time (not captured) so the long-lived pointermove listener never uses a stale UI scale.
  const getUiScale = () =>
    UI_TEXT_SIZE_SCALE_MAP[state.settings.settings.value.uiTextSize];
  const panes = app.effectivePanes.value;
  const layout = app.panelsEnabled.value ? panesManager.layout.value : "single";
  const selectedPaneId = app.panelsEnabled.value
    ? panesManager.selectedPaneId.value
    : (panes[0]?.id ?? null);
  const dragStateRef = useRef<
    | {
        type: "detached";
        mode: "move" | "resize";
        paneId: string;
        startX: number;
        startY: number;
        anchor?: DetachedPaneAnchor;
      }
    | {
        type: "attached-resize";
        layout: MultiPaneLayoutId;
        splitterId: string;
        axis: "x" | "y";
        startClient: number;
        containerSizePx: number;
        startSizes: AttachedPaneSizesState;
      }
    | null
  >(null);
  const paneElementMapRef = useRef(new Map<string, HTMLElement>());
  const attachedPanes = panes.filter((pane) => !pane.detached);
  const detachedPanes = panes.filter((pane) => pane.detached);

  const layoutContainerRef = useRef<HTMLDivElement | null>(null);
  const { cols: layoutCols, rows: layoutRows } =
    getLayoutGridDimensions(layout);
  const [columnSizes, setColumnSizes] = useState<number[]>(() =>
    Array.from({ length: layoutCols }, () => 1 / layoutCols)
  );
  const [rowSizes, setRowSizes] = useState<number[]>(() =>
    Array.from({ length: layoutRows }, () => 1 / layoutRows)
  );
  const attachedResizeDragRef = useRef<{
    type: "column" | "row";
    index: number;
    startPos: number;
    startSizes: number[];
  } | null>(null);

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
      // Handle attached pane resize
      const resizeDrag = attachedResizeDragRef.current;
      if (resizeDrag) {
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
        return;
      }

      // Handle detached pane drag
      const dragState = dragStateRef.current;
      if (!dragState) {
        return;
      }

      if (dragState.type === "attached-resize") {
        // const deltaPx =
        //   dragState.axis === "x"
        //     ? event.clientX - dragState.startClient
        //     : event.clientY - dragState.startClient;
        // const splitterIndex = Number.parseInt(
        //   dragState.splitterId.split("-")[1] ?? "-1",
        //   10
        // );

        // setAttachedPaneSizes((previousSizes) => {
        //   const baseSizes = dragState.startSizes;

        //   if (dragState.layout === "split-2v") {
        //     return {
        //       ...previousSizes,
        //       "split-2v": {
        //         columns: resizeAdjacentTracks(
        //           baseSizes["split-2v"].columns,
        //           0,
        //           deltaPx,
        //           dragState.containerSizePx
        //         ),
        //       },
        //     };
        //   }

        //   if (dragState.layout === "split-left-two-right") {
        //     if (dragState.splitterId === "col-0") {
        //       return {
        //         ...previousSizes,
        //         "split-left-two-right": {
        //           ...previousSizes["split-left-two-right"],
        //           columns: resizeAdjacentTracks(
        //             baseSizes["split-left-two-right"].columns,
        //             0,
        //             deltaPx,
        //             dragState.containerSizePx
        //           ),
        //         },
        //       };
        //     }

        //     return {
        //       ...previousSizes,
        //       "split-left-two-right": {
        //         ...previousSizes["split-left-two-right"],
        //         rows: resizeAdjacentTracks(
        //           baseSizes["split-left-two-right"].rows,
        //           0,
        //           deltaPx,
        //           dragState.containerSizePx
        //         ),
        //       },
        //     };
        //   }

        //   if (dragState.layout === "split-3v") {
        //     return {
        //       ...previousSizes,
        //       "split-3v": {
        //         columns: resizeAdjacentTracks(
        //           baseSizes["split-3v"].columns,
        //           splitterIndex,
        //           deltaPx,
        //           dragState.containerSizePx
        //         ),
        //       },
        //     };
        //   }

        //   if (dragState.layout === "grid-2x2") {
        //     if (dragState.splitterId === "col-0") {
        //       return {
        //         ...previousSizes,
        //         "grid-2x2": {
        //           ...previousSizes["grid-2x2"],
        //           columns: resizeAdjacentTracks(
        //             baseSizes["grid-2x2"].columns,
        //             0,
        //             deltaPx,
        //             dragState.containerSizePx
        //           ),
        //         },
        //       };
        //     }

        //     return {
        //       ...previousSizes,
        //       "grid-2x2": {
        //         ...previousSizes["grid-2x2"],
        //         rows: resizeAdjacentTracks(
        //           baseSizes["grid-2x2"].rows,
        //           0,
        //           deltaPx,
        //           dragState.containerSizePx
        //         ),
        //       },
        //     };
        //   }

        //   return {
        //     ...previousSizes,
        //     "split-4v": {
        //       columns: resizeAdjacentTracks(
        //         baseSizes["split-4v"].columns,
        //         splitterIndex,
        //         deltaPx,
        //         dragState.containerSizePx
        //       ),
        //     },
        //   };
        // });
        return;
      }

      const deltaX =
        dragState.anchor === "side"
          ? dragState.startX - event.clientX
          : event.clientX - dragState.startX;
      const deltaY =
        dragState.anchor === "bottom"
          ? dragState.startY - event.clientY
          : event.clientY - dragState.startY;

      if (dragState.mode === "move") {
        panesManager.movePane(dragState.paneId, deltaX, deltaY);
      } else {
        panesManager.resizePane(dragState.paneId, deltaX, deltaY, getUiScale());
      }

      dragStateRef.current = {
        ...dragState,
        startX: event.clientX,
        startY: event.clientY,
      };
    };

    const handlePointerUp = () => {
      dragStateRef.current = null;
      attachedResizeDragRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [panesManager]);

  useEffect(() => {
    const syncGridPortalBounds = () => {
      const portalPane =
        panes.find(
          (pane) => pane.gridPortal !== null || pane.mapPortal !== null
        ) ?? null;
      if (!portalPane) {
        return;
      }

      const paneElement = paneElementMapRef.current.get(portalPane.id);
      if (!paneElement) {
        return;
      }
    };

    syncGridPortalBounds();
    window.addEventListener("resize", syncGridPortalBounds);
    window.addEventListener("scroll", syncGridPortalBounds, true);
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => syncGridPortalBounds());
    paneElementMapRef.current.forEach((element) => observer?.observe(element));

    return () => {
      window.removeEventListener("resize", syncGridPortalBounds);
      window.removeEventListener("scroll", syncGridPortalBounds, true);
      observer?.disconnect();
    };
  }, [panes]);

  const { t } = useI18n();

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
      {attachedPanes.map((pane, index) => (
        <div
          key={pane.id}
          className={`sb-pane-shell sb-pane-slot-${index + 1}${
            pane.id === selectedPaneId ? " sb-pane-shell-active" : ""
          }`}
          ref={(element: HTMLElement | null) => {
            if (element) {
              paneElementMapRef.current.set(pane.id, element);
            } else {
              paneElementMapRef.current.delete(pane.id);
            }
          }}
          onClick={() => app.selectPane(pane.id)}
        >
          {pane.gridPortal !== null || pane.mapPortal !== null ? (
            <GridPortalPane
              portal={pane.gridPortal ?? pane.mapPortal ?? ""}
              portalType={pane.mapPortal !== null ? "map" : "grid"}
              inst={pane.inst!}
              pattern={pane.pattern!}
              query={pane.query}
            />
          ) : pane.component !== null ? (
            <div className="sb-pane-component">
              <pane.component />
            </div>
          ) : pane.tab ? (
            <PaneReader
              pane={pane}
              tab={pane.tab}
              state={state}
              displayBelowReaderToolbar={true}
            />
          ) : (
            <EmptyPaneToolbar
              toolsManager={toolsManager}
              selectorState={selectorState}
              panesManager={panesManager}
              pane={pane}
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

      {detachedPanes.map((pane, index) => (
        <div
          key={pane.id}
          className={`sb-pane-shell sb-pane-shell-detached${
            pane.detachedAnchor !== "floating"
              ? " sb-pane-shell-detached-anchored"
              : ""
          }${pane.id === selectedPaneId ? " sb-pane-shell-active" : ""}`}
          data-anchor={pane.detachedAnchor}
          style={{
            ...(pane.detachedAnchor === "fullscreen"
              ? {
                  position: "fixed",
                  top: "0px",
                  left: "0px",
                  right: "0px",
                  bottom: "0px",
                  width: "100%",
                  height: "100%",
                }
              : pane.detachedAnchor === "side"
                ? {
                    position: "fixed",
                    top: "0px",
                    right: "0px",
                    bottom: "0px",
                    left: "auto",
                    width: `${pane.width}px`,
                    height: "auto",
                  }
                : pane.detachedAnchor === "bottom"
                  ? {
                      position: "fixed",
                      left: "0px",
                      right: "0px",
                      bottom: "0px",
                      top: "auto",
                      width: "auto",
                      height: `${pane.height}px`,
                    }
                  : {
                      left: `${pane.x}px`,
                      top: `${pane.y}px`,
                      width: `${pane.width}px`,
                      height: `${pane.height}px`,
                    }),
            zIndex:
              pane.detachedAnchor === "fullscreen"
                ? 100
                : pane.id === selectedPaneId
                  ? 70 + detachedPanes.length
                  : 50 + index,
          }}
          ref={(element: HTMLElement | null) => {
            if (element) {
              paneElementMapRef.current.set(pane.id, element);
            } else {
              paneElementMapRef.current.delete(pane.id);
            }
          }}
          onPointerDown={() => app.selectPane(pane.id)}
        >
          <div className="sb-pane-detached-body">
            {pane.gridPortal !== null || pane.mapPortal !== null ? (
              <GridPortalPane
                portal={pane.gridPortal ?? pane.mapPortal ?? ""}
                portalType={pane.mapPortal !== null ? "map" : "grid"}
                inst={pane.inst!}
                pattern={pane.pattern!}
                query={pane.query}
              />
            ) : pane.component !== null ? (
              <div className="sb-pane-component">
                <pane.component />
              </div>
            ) : pane.tab ? (
              <PaneReader
                pane={pane}
                tab={pane.tab}
                state={state}
                displayBelowReaderToolbar={false}
              />
            ) : (
              <EmptyPaneToolbar
                toolsManager={toolsManager}
                selectorState={selectorState}
                panesManager={panesManager}
                pane={pane}
                tabs={tabsManager}
              />
            )}
            {pane.detachedAnchor === "floating" && (
              <div
                className={`sb-pane-detached-resize-handle`}
                onPointerDown={(event: PointerEvent) => {
                  event.stopPropagation();
                  event.preventDefault();
                  app.selectPane(pane.id);
                  dragStateRef.current = {
                    type: "detached",
                    mode: "resize",
                    paneId: pane.id,
                    anchor: pane.detachedAnchor,
                    startX: event.clientX,
                    startY: event.clientY,
                  };
                }}
              ></div>
            )}
          </div>

          {pane.detachedAnchor === "fullscreen" && (
            <CasualOSApp id={`pane-fullscreen-exit-${pane.id}`}>
              <>
                <style>{FULLSCREEN_EXIT_BUTTON_CSS}</style>
                <div className="sb-fullscreen-exit-wrapper">
                  <button
                    className="sb-fullscreen-exit-button"
                    onClick={() =>
                      panesManager.setDetachedAnchor(pane.id, "floating")
                    }
                  >
                    <span className="material-symbols-outlined">
                      fullscreen_exit
                    </span>
                    <span>
                      {t("exit-full-screen", {
                        defaultValue: "Exit Full Screen",
                      })}
                    </span>
                  </button>
                </div>
              </>
            </CasualOSApp>
          )}

          {pane.detachedAnchor !== "fullscreen" && (
            <div
              className="sb-detached-pane-toolbar"
              onPointerDown={(event: PointerEvent) => {
                if (pane.detachedAnchor !== "floating") {
                  return;
                }
                event.stopPropagation();
                app.selectPane(pane.id);
                dragStateRef.current = {
                  type: "detached",
                  mode: "move",
                  paneId: pane.id,
                  startX: event.clientX,
                  startY: event.clientY,
                };
              }}
            >
              {pane.detachedAnchor === "floating" && (
                <>
                  <div className="sb-detached-pane-toolbar-item">
                    <button
                      className="sb-detached-pane-toolbar-button"
                      aria-label={t("small-window")}
                      title={t("small-window")}
                      onPointerDown={(event: PointerEvent) => {
                        event.stopPropagation();
                      }}
                      onClick={(event: MouseEvent) => {
                        event.stopPropagation();
                        panesManager.resizePane(
                          pane.id,
                          400 - pane.width,
                          300 - pane.height,
                          getUiScale()
                        );
                      }}
                    >
                      <span className="material-symbols-outlined">
                        magnification_small
                      </span>
                      <span className="sr-only">{t("small-window")}</span>
                    </button>
                  </div>
                  <div className="sb-detached-pane-toolbar-item">
                    <button
                      className="sb-detached-pane-toolbar-button"
                      aria-label={t("large-window")}
                      title={t("large-window")}
                      onPointerDown={(event: PointerEvent) => {
                        event.stopPropagation();
                      }}
                      onClick={(event: MouseEvent) => {
                        event.stopPropagation();
                        panesManager.resizePane(
                          pane.id,
                          600 - pane.width,
                          400 - pane.height,
                          getUiScale()
                        );
                      }}
                    >
                      <span className="material-symbols-outlined">
                        magnification_large
                      </span>
                      <span className="sr-only">{t("large-window")}</span>
                    </button>
                  </div>
                </>
              )}

              <div className="sb-detached-pane-toolbar-item">
                <button
                  className="sb-detached-pane-toolbar-button"
                  aria-label={t("toggle-fullscreen-panel")}
                  title={t("fullscreen")}
                  onPointerDown={(event: PointerEvent) => {
                    event.stopPropagation();
                  }}
                  onClick={(event: MouseEvent) => {
                    event.stopPropagation();
                    panesManager.setDetachedAnchor(
                      pane.id,
                      pane.detachedAnchor === "fullscreen"
                        ? "floating"
                        : "fullscreen"
                    );
                  }}
                >
                  <span className="material-symbols-outlined">fullscreen</span>
                  <span className="sr-only">{t("fullscreen")}</span>
                </button>
              </div>

              {pane.detachedAnchor !== "side" && (
                <div className="sb-detached-pane-toolbar-item">
                  <button
                    className="sb-detached-pane-toolbar-button"
                    aria-label={t("anchor-to-side")}
                    title={t("anchor-to-side")}
                    onPointerDown={(event: PointerEvent) => {
                      event.stopPropagation();
                    }}
                    onClick={(event: MouseEvent) => {
                      event.stopPropagation();
                      panesManager.setDetachedAnchor(pane.id, "side");
                    }}
                  >
                    <span className="material-symbols-outlined flip-x">
                      right_panel_open
                    </span>
                    <span className="sr-only">{t("anchor-to-side")}</span>
                  </button>
                </div>
              )}

              {pane.detachedAnchor !== "floating" && (
                <div className="sb-detached-pane-toolbar-item">
                  <button
                    className="sb-detached-pane-toolbar-button"
                    aria-label={t("return-to-floating-window")}
                    title={t("return-to-floating-window")}
                    onPointerDown={(event: PointerEvent) => {
                      event.stopPropagation();
                    }}
                    onClick={(event: MouseEvent) => {
                      event.stopPropagation();
                      panesManager.setDetachedAnchor(pane.id, "floating");
                    }}
                  >
                    <span className="material-symbols-outlined">
                      open_in_new
                    </span>
                    <span className="sr-only">
                      {t("return-to-floating-window")}
                    </span>
                  </button>
                </div>
              )}

              <div className="sb-detached-pane-toolbar-item">
                <button
                  className="sb-detached-pane-toolbar-button"
                  aria-label={t("close-panel")}
                  title={t("close")}
                  onPointerDown={(event: PointerEvent) => {
                    event.stopPropagation();
                  }}
                  onClick={(event: MouseEvent) => {
                    event.stopPropagation();
                    panesManager.closePane(pane.id);
                  }}
                >
                  <span className="material-symbols-outlined">close</span>
                  <span className="sr-only">{t("close")}</span>
                </button>
              </div>
            </div>
          )}

          {pane.detachedAnchor !== "fullscreen" &&
            pane.detachedAnchor !== "floating" && (
              <div
                className={`sb-pane-detached-resize-handle${
                  pane.detachedAnchor === "side"
                    ? " sb-pane-detached-resize-handle-side"
                    : pane.detachedAnchor === "bottom"
                      ? " sb-pane-detached-resize-handle-bottom"
                      : ""
                }`}
                onPointerDown={(event: PointerEvent) => {
                  event.stopPropagation();
                  event.preventDefault();
                  app.selectPane(pane.id);
                  dragStateRef.current = {
                    type: "detached",
                    mode: "resize",
                    paneId: pane.id,
                    anchor: pane.detachedAnchor,
                    startX: event.clientX,
                    startY: event.clientY,
                  };
                }}
              >
                {pane.detachedAnchor === "side" && (
                  <MaterialIcon>drag_indicator</MaterialIcon>
                )}
              </div>
            )}
        </div>
      ))}
    </div>
  );
}
