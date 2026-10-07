import { useLayoutEffect, useRef, useState } from "preact/compat";
import type { RefObject } from "preact";
import { useI18n } from "../../i18n/I18nManager";
import {
  horizontalScrollEdges,
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

/**
 * Circles at the top and bottom edges of the reader for highlights that are
 * currently off screen. Each one carries the highlight colour, an arrow toward
 * the verse, and the verse number. They overlap in a horizontal row like
 * cards until hovered, then spread apart; a row wider than the reader scrolls.
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

  const measure = () => {
    const content = contentRef.current;
    if (!content || marks.length === 0) {
      if (signatureRef.current !== "") {
        signatureRef.current = "";
        setCues(null);
      }
      return;
    }

    const box = content.getBoundingClientRect();
    const measured: MeasuredHighlightMark[] = [];
    for (const mark of marks) {
      const el = content.querySelector<HTMLElement>(
        `.sb-verse[data-verse-number="${mark.verse}"]`
      );
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      measured.push({
        ...mark,
        top: rect.top - box.top,
        bottom: rect.bottom - box.top,
      });
    }

    const viewport = measureReaderViewport(content, scrollerRef.current);
    const placed = placeOffscreenHighlightCues(measured, viewport);
    const height = Math.max(0, viewport.bottom - viewport.top);
    const signature = [
      Math.round(viewport.top),
      Math.round(height),
      placed.up.map((cue) => cue.key + cue.label).join(","),
      placed.down.map((cue) => cue.key + cue.label).join(","),
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

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    scrollerRef.current = findScrollContainer(content);
    const target: EventTarget = scrollerRef.current ?? window;
    let frame: number | null = null;
    const schedule = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        measureRef.current();
      });
    };
    target.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      target.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [contentRef]);

  useLayoutEffect(() => {
    measureRef.current();
  });

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
        <CueStack
          direction="up"
          cues={cues.up}
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
        <CueStack
          direction="down"
          cues={cues.down}
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

function CueArrow({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      className="sb-offscreen-cue-arrow"
      viewBox="0 0 12 12"
      aria-hidden="true"
    >
      <path
        d={direction === "up" ? "M6 2 L10.5 8 H1.5 Z" : "M6 10 L1.5 4 H10.5 Z"}
        fill="currentColor"
      />
    </svg>
  );
}

function CueStack({
  direction,
  cues,
  labelFor,
  onJump,
}: {
  direction: "up" | "down";
  cues: OffscreenHighlightCue[];
  labelFor: (label: string) => string;
  onJump: (verse: number) => void;
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
    if (dragRef.current.pointerId !== event.pointerId) return;
    dragRef.current.pointerId = -1;
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
  // pointer came down on. Keyboard activation never sets `moved`, so Enter
  // still jumps.
  const onClickCapture = (event: MouseEvent) => {
    if (!dragRef.current.moved) return;
    dragRef.current.moved = false;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div className={`sb-offscreen-cues-row sb-offscreen-cues-${direction}`}>
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
        {cues.map((cue, index) => (
          <button
            key={cue.key}
            type="button"
            className="sb-offscreen-cue"
            data-verse={cue.verse}
            style={{
              background: cue.background,
              color: cue.textColor,
              // Each later circle sits on top of the one before it, so the row
              // reads as a deck of cards rather than a flat line.
              zIndex: index + 1,
            }}
            aria-label={labelFor(cue.label)}
            onClick={() => onJump(cue.verse)}
          >
            <CueArrow direction={direction} />
            <span className="sb-offscreen-cue-verse">{cue.label}</span>
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
