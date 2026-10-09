import "./ScriptureNote.css";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import { createPortal } from "preact/compat";
import type { RefObject } from "preact";
import { useI18n } from "../../i18n/I18nManager";
import type {
  PlayingState,
  PlaylistItemData,
} from "../../managers/PlaylistManager";
import { PlaylistHtmlContent } from "../PlaylistHtmlContent/PlaylistHtmlContent";
import { playlistItemLabel } from "../playlistItemLabel";
import { MaterialIcon } from "../icons";
import { computePopover, type Rect } from "../Tutorial/Tutorial";
import {
  findScrollContainer,
  readBottomChromeInset,
} from "../BibleReader/readerViewport";

type ScriptureItem = Extract<PlaylistItemData, { type: "bible-verse" }>;

/** The playing step's scripture item when it carries a note, else null. */
export function currentScriptureNoteItem(
  playing: PlayingState | null
): (ScriptureItem & { note: string }) | null {
  const item = playing?.currentItem.value;
  if (item?.type !== "bible-verse" || !item.note?.trim()) {
    return null;
  }
  return item as ScriptureItem & { note: string };
}

/** Space between the popover and the passage it points at. */
const POPOVER_GAP = 16;
/** Inset from the reader's edges for a popover docked in its corner. */
const DOCK_INSET = 16;

interface Box {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

function toBox(r: DOMRect | Box): Box {
  return { top: r.top, left: r.left, right: r.right, bottom: r.bottom };
}

function intersect(a: Box, b: Box): Box | null {
  const box = {
    top: Math.max(a.top, b.top),
    left: Math.max(a.left, b.left),
    right: Math.min(a.right, b.right),
    bottom: Math.min(a.bottom, b.bottom),
  };
  return box.right > box.left && box.bottom > box.top ? box : null;
}

function union(a: Box | null, b: Box): Box {
  if (!a) return b;
  return {
    top: Math.min(a.top, b.top),
    left: Math.min(a.left, b.left),
    right: Math.max(a.right, b.right),
    bottom: Math.max(a.bottom, b.bottom),
  };
}

/**
 * The part of the screen this reader's pane shows: its scroll container (or the
 * reader itself when the page scrolls) clipped to the window, above the fixed
 * bottom toolbar so the popover never lands under it. The scroll container,
 * not the reader, because the reader is only as wide as its text column and is
 * centred in the pane — the gutters beside the text belong to the pane.
 */
function visibleReaderBox(root: HTMLElement): Box | null {
  const pane = findScrollContainer(root) ?? root;
  return intersect(toBox(pane.getBoundingClientRect()), {
    top: 0,
    left: 0,
    right: window.innerWidth,
    bottom: window.innerHeight - readBottomChromeInset(),
  });
}

/**
 * Screen boxes of the verses an item covers, in reading order. A whole-chapter
 * item has no verses, so it points at the chapter's heading instead.
 */
function passageBoxes(root: HTMLElement, item: ScriptureItem): Box[] {
  const { verse, endVerse, toEndOfChapter } = item.ref;
  if (verse == null) {
    const heading = root.querySelector(".sb-bible-reader-title");
    return heading ? [toBox(heading.getBoundingClientRect())] : [];
  }
  const last = toEndOfChapter ? Infinity : (endVerse ?? verse);
  const boxes: Box[] = [];
  for (const el of root.querySelectorAll<HTMLElement>(
    ".sb-verse[data-verse-number]"
  )) {
    const n = Number(el.dataset.verseNumber);
    if (n >= verse && n <= last) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 || r.height > 0) boxes.push(toBox(r));
    }
  }
  return boxes;
}

interface Placement {
  frame: Box;
  style: Record<string, string>;
  side: ReturnType<typeof computePopover>["side"];
  arrowStyle: Record<string, string>;
}

function fitsFrame(
  style: Record<string, string>,
  size: { w: number; h: number },
  frame: { w: number; h: number }
): boolean {
  const top = parseFloat(style.top ?? "");
  const left = parseFloat(style.left ?? "");
  return (
    top >= 0 && left >= 0 && top + size.h <= frame.h && left + size.w <= frame.w
  );
}

/**
 * Where the popover goes. It sits in the gutter beside the text column, level
 * with the passage — on the right for left-to-right text, the left for
 * right-to-left — when the gutter is wide enough, and underneath the passage
 * when it isn't. Each is tried against the visible part of the whole passage,
 * then against just its first visible verse (a long passage can fill the
 * reader, leaving no room under it). Failing both it docks in the reader's
 * corner with no pointer, which is also where it waits while the passage is
 * scrolled out of view.
 */
function placePopover(
  root: HTMLElement,
  item: ScriptureItem,
  measured: { w: number; h: number } | null
): Placement | null {
  const frame = visibleReaderBox(root);
  if (!frame) return null;
  const size = { w: frame.right - frame.left, h: frame.bottom - frame.top };
  const relative = (box: Box): Rect => ({
    top: box.top - frame.top,
    left: box.left - frame.left,
    width: box.right - box.left,
    height: box.bottom - box.top,
  });

  const rtl = getComputedStyle(root).direction === "rtl";
  // Targets span the text column's full width, not just the passage's own
  // words, so "beside" means the gutter past the column rather than the gap
  // after a verse that ends mid-line, and "underneath" centres on the column.
  const column = root
    .querySelector(".sb-chapter-content")
    ?.getBoundingClientRect();
  const acrossColumn = (box: Box): Box | null =>
    column && column.width > 0
      ? intersect({ ...box, left: column.left, right: column.right }, frame)
      : box;

  const visible = passageBoxes(root, item)
    .map((box) => intersect(box, frame))
    .filter((box): box is Box => !!box);
  const candidates: Box[] = [];
  if (visible.length > 0) {
    candidates.push(visible.reduce<Box | null>(union, null)!);
    candidates.push(visible[0]!);
  }
  for (const passage of candidates) {
    const target = acrossColumn(passage);
    if (!target) continue;
    // `computePopover` tries the given side first, then underneath.
    const layout = computePopover(
      relative(target),
      rtl ? "left" : "right",
      size,
      measured,
      POPOVER_GAP
    );
    const popSize = {
      w: parseFloat(layout.style.width ?? "0"),
      h: measured?.h ?? 0,
    };
    if (layout.side && fitsFrame(layout.style, popSize, size)) {
      return { frame, ...layout };
    }
  }

  const width = Math.min(300, Math.max(0, size.w - DOCK_INSET * 2));
  return {
    frame,
    side: null,
    arrowStyle: {},
    style: {
      top: `${Math.max(DOCK_INSET, size.h - (measured?.h ?? 0) - DOCK_INSET)}px`,
      left: `${rtl ? DOCK_INSET : Math.max(DOCK_INSET, size.w - width - DOCK_INSET)}px`,
      width: `${width}px`,
    },
  };
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Desktop: the playing scripture item's note in a coachmark-style popover that
 * points at the passage in this reader, with previous/next to step through the
 * playlist. Unlike the tutorial it has no backdrop — the reader stays usable —
 * and it can be hidden for the current step.
 */
export function ScriptureNotePopover(props: {
  playing: PlayingState;
  readerRef: RefObject<HTMLElement>;
  resolveBookName: (bookId: string) => string;
}) {
  const { playing, readerRef, resolveBookName } = props;
  const item = currentScriptureNoteItem(playing);
  const step = playing.currentIndex.value;
  // Keyed on the step so hiding one note doesn't hide the next one.
  return item ? (
    <ScriptureNotePopoverBody
      key={step}
      item={item}
      playing={playing}
      readerRef={readerRef}
      resolveBookName={resolveBookName}
    />
  ) : null;
}

function ScriptureNotePopoverBody(props: {
  item: ScriptureItem & { note: string };
  playing: PlayingState;
  readerRef: RefObject<HTMLElement>;
  resolveBookName: (bookId: string) => string;
}) {
  const { item, playing, readerRef, resolveBookName } = props;
  const { t } = useI18n();
  const [hidden, setHidden] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const measuredRef = useRef<{ w: number; h: number } | null>(null);

  // Rendered into <body> so the reader's stacking contexts and transforms
  // can't clip the popover or offset its fixed positioning.
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.body), []);

  useEffect(() => {
    if (hidden) return;
    let frameRequest = 0;
    const measure = () => {
      frameRequest = 0;
      const root = readerRef.current;
      const pop = popoverRef.current;
      if (pop) {
        const r = pop.getBoundingClientRect();
        if (r.height > 0) {
          measuredRef.current = { w: r.width, h: r.height };
        }
      }
      const next = root ? placePopover(root, item, measuredRef.current) : null;
      setPlacement((prev) => (sameJson(prev, next) ? prev : next));
    };
    const schedule = () => {
      if (!frameRequest) frameRequest = requestAnimationFrame(measure);
    };
    measure();
    // The chapter loads and the verse scrolls into view after the step
    // changes, and fonts or images can shift the text, so keep re-measuring
    // on a slow tick as well as on scroll and resize.
    const interval = window.setInterval(schedule, 250);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      if (frameRequest) cancelAnimationFrame(frameRequest);
    };
  }, [hidden, item, readerRef]);

  // The first placement uses a guessed height; re-place once the real one is
  // known so a tall note doesn't run past the reader.
  useLayoutEffect(() => {
    const pop = popoverRef.current;
    const root = readerRef.current;
    if (!pop || !root) return;
    const r = pop.getBoundingClientRect();
    const prev = measuredRef.current;
    if (r.height > 0 && (!prev || Math.abs(prev.h - r.height) > 1)) {
      measuredRef.current = { w: r.width, h: r.height };
      const next = placePopover(root, item, measuredRef.current);
      setPlacement((current) => (sameJson(current, next) ? current : next));
    }
  });

  if (!host || !placement) return null;

  const { frame } = placement;
  const layerStyle = {
    top: `${frame.top}px`,
    left: `${frame.left}px`,
    width: `${frame.right - frame.left}px`,
    height: `${frame.bottom - frame.top}px`,
  };
  const label = playlistItemLabel(item, t, resolveBookName);
  const total = playing.queue.value.length;

  return createPortal(
    <div className="sb-scripture-note-layer" style={layerStyle}>
      {hidden ? (
        <button
          type="button"
          className="sb-scripture-note-show"
          onClick={() => setHidden(false)}
        >
          <MaterialIcon>sticky_note_2</MaterialIcon>
          {t("playlist-scripture-note-show", { defaultValue: "Show note" })}
        </button>
      ) : (
        <div
          ref={popoverRef}
          className={`sb-scripture-note-popover${
            placement.side ? "" : " sb-scripture-note-popover--docked"
          }`}
          style={placement.style}
          role="dialog"
          aria-label={t("playlist-scripture-note-aria", {
            defaultValue: "Note on {{passage}}",
            passage: label,
          })}
        >
          {placement.side ? (
            <span
              className={`sb-tour-arrow sb-tour-arrow-${placement.side}`}
              style={placement.arrowStyle}
              aria-hidden="true"
            />
          ) : null}
          <div className="sb-scripture-note-header">
            <h3 className="sb-scripture-note-title" dir="auto">
              {label}
            </h3>
            <button
              type="button"
              className="sb-scripture-note-hide"
              onClick={() => setHidden(true)}
              aria-label={t("playlist-scripture-note-hide", {
                defaultValue: "Hide note",
              })}
            >
              <MaterialIcon>close</MaterialIcon>
            </button>
          </div>
          <div className="sb-scripture-note-body">
            <PlaylistHtmlContent html={item.note} />
          </div>
          <div className="sb-scripture-note-actions">
            {playing.hasPrevious.value ? (
              <button
                type="button"
                className="sb-tour-btn sb-tour-btn-back"
                onClick={() => void playing.previous()}
              >
                {t("previous", { defaultValue: "Previous" })}
              </button>
            ) : null}
            {total > 1 ? (
              <span className="sb-scripture-note-progress">
                {t("playlist-scripture-note-progress", {
                  defaultValue: "{{current}} of {{total}}",
                  current: playing.currentIndex.value + 1,
                  total,
                })}
              </span>
            ) : null}
            <button
              type="button"
              className="sb-tour-btn sb-tour-btn-next"
              disabled={!playing.canPressNext.value}
              onClick={() => void playing.next()}
            >
              {t("next", { defaultValue: "Next" })}
              <span className="sb-tour-next-arrow" dir="ltr" aria-hidden="true">
                →
              </span>
            </button>
          </div>
        </div>
      )}
    </div>,
    host
  );
}

/**
 * Mobile: the playing scripture item's note in a sheet that sits directly on
 * top of the floating chapter navigation, so the playlist's previous/next stay
 * reachable underneath. It can be collapsed to its title bar for the current
 * step.
 */
export function ScriptureNoteSheet(props: {
  playing: PlayingState;
  resolveBookName: (bookId: string) => string;
}) {
  const { playing, resolveBookName } = props;
  const item = currentScriptureNoteItem(playing);
  const step = playing.currentIndex.value;
  return item ? (
    <ScriptureNoteSheetBody
      key={step}
      item={item}
      resolveBookName={resolveBookName}
    />
  ) : null;
}

function ScriptureNoteSheetBody(props: {
  item: ScriptureItem & { note: string };
  resolveBookName: (bookId: string) => string;
}) {
  const { item, resolveBookName } = props;
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const label = playlistItemLabel(item, t, resolveBookName);

  return (
    <section
      className={`sb-scripture-note-sheet${
        collapsed ? " sb-scripture-note-sheet--collapsed" : ""
      }`}
      aria-label={t("playlist-scripture-note-aria", {
        defaultValue: "Note on {{passage}}",
        passage: label,
      })}
    >
      <button
        type="button"
        className="sb-scripture-note-sheet-header"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((value) => !value)}
      >
        <MaterialIcon className="sb-scripture-note-sheet-icon">
          sticky_note_2
        </MaterialIcon>
        <span className="sb-scripture-note-title" dir="auto">
          {label}
        </span>
        <MaterialIcon className="sb-scripture-note-sheet-chevron">
          {collapsed ? "expand_less" : "expand_more"}
        </MaterialIcon>
      </button>
      {collapsed ? null : (
        <div className="sb-scripture-note-body">
          <PlaylistHtmlContent html={item.note} />
        </div>
      )}
    </section>
  );
}
