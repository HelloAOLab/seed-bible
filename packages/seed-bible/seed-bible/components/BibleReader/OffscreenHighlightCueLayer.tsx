import { useEffect, useLayoutEffect, useRef, useState } from "preact/compat";
import type { RefObject } from "preact";
import { useI18n } from "../../i18n/I18nManager";
import { Avatar } from "../Avatar/Avatar";
import {
  highlightCueMarkId,
  horizontalScrollEdges,
  offscreenSide,
  placeOffscreenHighlightCues,
  type HighlightCueMark,
  type MeasuredHighlightMark,
  type OffscreenHighlightCue,
} from "./offscreenHighlightCues";
import { findScrollContainer, measureReaderViewport } from "./readerViewport";

/**
 * How far a pointer must travel before a press on a bubble becomes a drag
 * through the stack, rather than a click that jumps to the verse.
 */
const DRAG_THRESHOLD_PX = 6;

/** How long the pills stay open after a new highlight lands off screen. */
export const CUE_NOTIFY_MS = 3000;

/**
 * Grace period after the pointer leaves the indicator or the pills before they
 * close, so it can cross the gap between the two.
 */
const HOVER_CLOSE_DELAY_MS = 250;

/** Highlight icons the collapsed indicator shows. Any further ones are left out. */
const MAX_INDICATOR_ICONS = 3;

/**
 * Off-screen highlights at the top and bottom edges of the reader. When a new
 * highlight lands off screen, pills open for a few seconds: each carries the
 * highlight colour, the avatar of whoever made it, an arrow toward the verse,
 * and "Highlighted verse N". They then collapse into a small indicator in the
 * end corner, which opens the pills again while hovered and jumps to the
 * nearest highlight when clicked.
 */
export function OffscreenHighlightCueLayer({
  contentRef,
  marks,
}: {
  contentRef: RefObject<HTMLDivElement>;
  marks: readonly HighlightCueMark[];
}) {
  const { t } = useI18n();
  const [cues, setCues] = useState<{
    up: OffscreenHighlightCue[];
    down: OffscreenHighlightCue[];
    top: number;
    height: number;
  } | null>(null);
  const scrollerRef = useRef<HTMLElement | null>(null);
  const signatureRef = useRef("");
  const frameRef = useRef<number | null>(null);
  const verseElementsRef = useRef<{
    key: string;
    elements: Map<number, HTMLElement>;
  } | null>(null);
  const [notifying, setNotifying] = useState(false);
  const notifyTimerRef = useRef<number | null>(null);
  // Highlights already accounted for, and the new ones still waiting to be
  // measured. A new highlight only opens the pills if it lands off screen;
  // one painted on the verse being read needs no notice.
  const knownMarksRef = useRef<Set<string>>(new Set());
  const pendingMarksRef = useRef<Set<string>>(new Set());

  const notify = () => {
    setNotifying(true);
    if (notifyTimerRef.current !== null) {
      window.clearTimeout(notifyTimerRef.current);
    }
    notifyTimerRef.current = window.setTimeout(() => {
      notifyTimerRef.current = null;
      setNotifying(false);
    }, CUE_NOTIFY_MS);
  };

  const measure = () => {
    const content = contentRef.current;
    if (!content || marks.length === 0) {
      verseElementsRef.current = null;
      if (signatureRef.current !== "") {
        signatureRef.current = "";
        setCues(null);
      }
      return;
    }

    const elements = verseElementsFor(content, marks, verseElementsRef);
    const box = content.getBoundingClientRect();
    const measured: MeasuredHighlightMark[] = [];
    for (const mark of marks) {
      const el = elements.get(mark.verse);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      measured.push({
        ...mark,
        top: rect.top - box.top,
        bottom: rect.bottom - box.top,
      });
    }

    const viewport = measureReaderViewport(content, scrollerRef.current);
    let landedOffscreen = false;
    for (const mark of measured) {
      // Not laid out yet: keep it pending until it has a box to judge.
      if (mark.bottom <= mark.top) continue;
      if (!pendingMarksRef.current.delete(highlightCueMarkId(mark))) continue;
      if (offscreenSide(mark, viewport)) landedOffscreen = true;
    }
    if (landedOffscreen) notify();

    const placed = placeOffscreenHighlightCues(measured, viewport);
    const height = Math.max(0, viewport.bottom - viewport.top);
    const signature = [
      Math.round(viewport.top),
      Math.round(height),
      placed.up.map(cueSignature).join(","),
      placed.down.map(cueSignature).join(","),
    ].join("|");
    if (signature === signatureRef.current) return;
    signatureRef.current = signature;
    if (placed.up.length === 0 && placed.down.length === 0) {
      setCues(null);
      return;
    }
    setCues({
      up: placed.up,
      down: placed.down,
      top: viewport.top,
      height,
    });
  };
  const measureRef = useRef(measure);
  measureRef.current = measure;

  const scheduleMeasure = () => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      measureRef.current();
    });
  };
  const scheduleRef = useRef(scheduleMeasure);
  scheduleRef.current = scheduleMeasure;

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    scrollerRef.current = findScrollContainer(content);
    const target: EventTarget = scrollerRef.current ?? window;
    const schedule = () => scheduleRef.current();
    target.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      target.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [contentRef]);

  const markIds = marks.map(highlightCueMarkId);
  const markIdsKey = markIds.join(",");
  // Declared before the measuring effect below so a measure taken in this
  // same commit already sees which highlights are new.
  useLayoutEffect(() => {
    const known = new Set(markIds);
    const pending = new Set<string>();
    for (const id of known) {
      if (!knownMarksRef.current.has(id) || pendingMarksRef.current.has(id)) {
        pending.add(id);
      }
    }
    knownMarksRef.current = known;
    pendingMarksRef.current = pending;
  }, [markIdsKey]);

  useLayoutEffect(() => {
    scheduleRef.current();
  });

  useEffect(
    () => () => {
      if (notifyTimerRef.current !== null) {
        window.clearTimeout(notifyTimerRef.current);
      }
    },
    []
  );

  if (!cues) return null;

  const jumpToVerse = (verse: number) => {
    const content = contentRef.current;
    const el = content?.querySelector<HTMLElement>(
      `.sb-verse[data-verse-number="${verse}"]`
    );
    if (!el) return;
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({
      block: "center",
      behavior: reduce ? "auto" : "smooth",
    });
  };

  return (
    <div
      className="sb-offscreen-cues"
      style={{ top: `${cues.top}px`, height: `${cues.height}px` }}
    >
      {cues.up.length > 0 && (
        <CueEdge
          direction="up"
          cues={cues.up}
          notifying={notifying}
          labelFor={(label) =>
            t("offscreen-highlight-above", {
              verses: label,
              defaultValue: "Highlight above, verse {{verses}}. Show it",
            })
          }
          onJump={jumpToVerse}
        />
      )}
      {cues.down.length > 0 && (
        <CueEdge
          direction="down"
          cues={cues.down}
          notifying={notifying}
          labelFor={(label) =>
            t("offscreen-highlight-below", {
              verses: label,
              defaultValue: "Highlight below, verse {{verses}}. Show it",
            })
          }
          onJump={jumpToVerse}
        />
      )}
    </div>
  );
}

/** Everything a bubble shows, so a profile picture arriving late still repaints. */
function cueSignature(cue: OffscreenHighlightCue): string {
  const author = cue.author;
  return [
    cue.key,
    cue.label,
    author?.displayName ?? "",
    author?.imageUrl ?? "",
    author?.genericFallback ? "g" : "",
  ].join("~");
}

function verseElementsFor(
  content: HTMLElement,
  marks: readonly HighlightCueMark[],
  cache: { current: { key: string; elements: Map<number, HTMLElement> } | null }
): Map<number, HTMLElement> {
  const key = marks.map((mark) => mark.verse).join(",");
  const cached = cache.current;
  if (
    cached &&
    cached.key === key &&
    [...cached.elements.values()].every((el) => el.isConnected)
  ) {
    return cached.elements;
  }
  const elements = new Map<number, HTMLElement>();
  for (const el of content.querySelectorAll<HTMLElement>(
    ".sb-verse[data-verse-number]"
  )) {
    const verse = Number(el.getAttribute("data-verse-number"));
    if (!Number.isInteger(verse) || verse < 1 || elements.has(verse)) continue;
    elements.set(verse, el);
  }
  cache.current = { key, elements };
  return elements;
}

function CueArrow({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      className="sb-offscreen-cue-arrow"
      viewBox="0 0 12 12"
      aria-hidden="true"
    >
      <path
        d={
          direction === "up"
            ? "M6 10.5 V1.5 M2 5.5 L6 1.5 L10 5.5"
            : "M6 1.5 V10.5 M2 6.5 L6 10.5 L10 6.5"
        }
        fill="none"
        stroke="currentColor"
        stroke-width="1.75"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
}

/**
 * One edge of the reader: the pills while a notice is showing or the pointer
 * is over them, and otherwise the collapsed indicator.
 */
function CueEdge({
  direction,
  cues,
  notifying,
  labelFor,
  onJump,
}: {
  direction: "up" | "down";
  cues: OffscreenHighlightCue[];
  notifying: boolean;
  labelFor: (label: string) => string;
  onJump: (verse: number) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const cancelClose = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };
  const open = () => {
    cancelClose();
    setHovered(true);
  };
  const close = () => {
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setHovered(false);
    }, HOVER_CLOSE_DELAY_MS);
  };
  useEffect(() => cancelClose, []);

  // A tap fires pointerenter too, and would leave the pills open behind the
  // jump it also makes. Only a mouse hovers.
  const hoverHandlers = {
    onPointerEnter: (event: PointerEvent) => {
      if (event.pointerType === "mouse") open();
    },
    onPointerLeave: (event: PointerEvent) => {
      if (event.pointerType === "mouse") close();
    },
    onFocusIn: open,
    onFocusOut: close,
  };

  // Cues run in verse order, so the nearest one above is the last.
  const nearestFirst = direction === "up" ? [...cues].reverse() : cues;
  const nearest = nearestFirst[0]!;
  const icons = nearestFirst.slice(0, MAX_INDICATOR_ICONS);

  return (
    <>
      {(notifying || hovered) && (
        <CueStack
          direction={direction}
          cues={cues}
          labelFor={labelFor}
          onJump={onJump}
          hoverHandlers={hoverHandlers}
        />
      )}
      {!notifying && (
        <button
          type="button"
          className={`sb-offscreen-cue-indicator sb-offscreen-cue-indicator-${direction}`}
          aria-label={labelFor(nearest.label)}
          onClick={() => onJump(nearest.verse)}
          {...hoverHandlers}
        >
          <CueArrow direction={direction} />
          <span className="sb-offscreen-cue-indicator-icons">
            {icons.map((cue, index) => (
              <span
                key={cue.key}
                className="sb-offscreen-cue-indicator-icon"
                data-verse={cue.verse}
                style={{
                  background: cue.background,
                  color: cue.textColor,
                  // The nearest highlight sits in front.
                  zIndex: icons.length - index,
                }}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  format_ink_highlighter
                </span>
              </span>
            ))}
          </span>
        </button>
      )}
    </>
  );
}

function CueStack({
  direction,
  cues,
  labelFor,
  onJump,
  hoverHandlers,
}: {
  direction: "up" | "down";
  cues: OffscreenHighlightCue[];
  labelFor: (label: string) => string;
  onJump: (verse: number) => void;
  hoverHandlers: {
    onPointerEnter: (event: PointerEvent) => void;
    onPointerLeave: (event: PointerEvent) => void;
    onFocusIn: () => void;
    onFocusOut: () => void;
  };
}) {
  const { t } = useI18n();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const dragRef = useRef({
    pointerId: -1,
    startX: 0,
    startScroll: 0,
    moved: false,
  });

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
  };

  const onPointerMove = (event: PointerEvent) => {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId) return;
    const el = scrollerRef.current;
    if (!el) return;
    const dx = event.clientX - drag.startX;
    if (!drag.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
      drag.moved = true;
      if (typeof el.setPointerCapture === "function") {
        el.setPointerCapture(event.pointerId);
      }
    }
    el.scrollLeft = drag.startScroll - dx;
  };

  const endDrag = (event: PointerEvent) => {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId) return;
    drag.pointerId = -1;
    if (!drag.moved) return;
    // The click that follows pointerup is still in this turn and must stay
    // swallowed. A drag that ends without a click (released outside, or
    // cancelled) would otherwise leave `moved` set and eat the next tap.
    window.setTimeout(() => {
      if (dragRef.current.pointerId === -1) dragRef.current.moved = false;
    }, 0);
  };

  const updateEdges = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const next = horizontalScrollEdges(
      el.scrollLeft,
      el.scrollWidth,
      el.clientWidth
    );
    setEdges((prev) =>
      prev.left === next.left && prev.right === next.right ? prev : next
    );
  };
  const updateEdgesRef = useRef(updateEdges);
  updateEdgesRef.current = updateEdges;

  useLayoutEffect(() => {
    updateEdgesRef.current();
  });

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => updateEdgesRef.current();
    el.addEventListener("scroll", onScroll, { passive: true });
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => updateEdgesRef.current());
      observer.observe(el);
    }
    return () => {
      el.removeEventListener("scroll", onScroll);
      observer?.disconnect();
    };
  }, []);

  const scrollRow = (side: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const left = side === "left" ? 0 : max;
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (typeof el.scrollTo === "function") {
      el.scrollTo({ left, behavior: reduce ? "auto" : "smooth" });
    } else {
      el.scrollLeft = left;
    }
    updateEdgesRef.current();
  };

  // A drag that passes the threshold must not also jump to the verse the
  // pointer came down on. A keyboard click (Enter/Space) has detail 0, so it
  // still jumps even if a drag ended without clearing `moved` yet.
  const onClickCapture = (event: MouseEvent) => {
    if (event.detail === 0 || !dragRef.current.moved) return;
    dragRef.current.moved = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      className={`sb-offscreen-cues-row sb-offscreen-cues-${direction}`}
      {...hoverHandlers}
    >
      {edges.left && (
        <button
          type="button"
          className="sb-offscreen-cues-scroll sb-offscreen-cues-scroll-left"
          aria-label={t("offscreen-highlight-scroll-left", {
            defaultValue: "More highlights to the left",
          })}
          onClick={() => scrollRow("left")}
        >
          <ScrollEdgeArrow side="left" />
        </button>
      )}
      <div
        ref={scrollerRef}
        className="sb-offscreen-cues-stack"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
      >
        {cues.map((cue) => (
          <button
            key={cue.key}
            type="button"
            className="sb-offscreen-cue"
            data-verse={cue.verse}
            style={{
              background: cue.background,
              color: cue.textColor,
            }}
            aria-label={labelFor(cue.label)}
            onClick={() => onJump(cue.verse)}
          >
            {cue.author && (
              <span className="sb-offscreen-cue-avatar">
                <Avatar
                  imageUrl={cue.author.imageUrl}
                  visual={cue.author.visual}
                  title={cue.author.displayName}
                  genericFallback={cue.author.genericFallback}
                />
              </span>
            )}
            <CueArrow direction={direction} />
            <span className="sb-offscreen-cue-text">
              {cue.label === String(cue.verse)
                ? t("highlighted-verse", {
                    verse: cue.label,
                    defaultValue: "Highlighted verse {{verse}}",
                  })
                : t("highlighted-verses", {
                    verses: cue.label,
                    defaultValue: "Highlighted verses {{verses}}",
                  })}
            </span>
          </button>
        ))}
      </div>
      {edges.right && (
        <button
          type="button"
          className="sb-offscreen-cues-scroll sb-offscreen-cues-scroll-right"
          aria-label={t("offscreen-highlight-scroll-right", {
            defaultValue: "More highlights to the right",
          })}
          onClick={() => scrollRow("right")}
        >
          <ScrollEdgeArrow side="right" />
        </button>
      )}
    </div>
  );
}

function ScrollEdgeArrow({ side }: { side: "left" | "right" }) {
  return (
    <svg
      className="sb-offscreen-cues-scroll-icon"
      viewBox="0 0 12 12"
      aria-hidden="true"
    >
      <path
        d={
          side === "left"
            ? "M8 1.5 L3.5 6 L8 10.5 Z"
            : "M4 1.5 L8.5 6 L4 10.5 Z"
        }
        fill="currentColor"
      />
    </svg>
  );
}
