import type { VerseDecoration } from "../../managers/BibleReadingManager";
import type { ChapterHighlight } from "../../managers/HighlightsManager";
import type { ReaderViewport } from "./readerViewport";

/**
 * One highlighted verse, ready to be placed against the reader viewport.
 * `styleKey` is what consecutive verses must share to collapse into one bubble.
 */
export interface HighlightCueMark {
  verse: number;
  styleKey: string;
  background: string;
  textColor: string;
}

/** A verse whose box has been measured in chapter-content coordinates. */
export interface MeasuredHighlightMark extends HighlightCueMark {
  top: number;
  bottom: number;
}

/** One bubble for a run of off-screen highlighted verses. */
export interface OffscreenHighlightCue {
  key: string;
  direction: "up" | "down";
  /** First verse of the run. A click scrolls here. */
  verse: number;
  /** Shown on the bubble: a single number, or a range when several verses share it. */
  label: string;
  background: string;
  textColor: string;
}

/** How a highlight is painted on a bubble, matching the ribbon's own colour. */
export function highlightCueStyle(highlight: {
  colorId: string;
  customColor?: string;
  customFontColor?: string;
}): Pick<HighlightCueMark, "styleKey" | "background" | "textColor"> {
  if (highlight.customColor) {
    return {
      styleKey: `custom:${highlight.customColor}:${highlight.customFontColor ?? ""}`,
      background: highlight.customColor,
      textColor:
        highlight.customFontColor ?? contrastText(highlight.customColor),
    };
  }
  return {
    styleKey: `preset:${highlight.colorId}`,
    background: `var(--sb-highlight-${highlight.colorId}-color, transparent)`,
    textColor: `var(--sb-highlight-${highlight.colorId}-font-color, #333333)`,
  };
}

function contrastText(color: string): string {
  const match = color
    .trim()
    .replace("#", "")
    .match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) return "#333333";
  const r = parseInt(match[1] ?? "00", 16);
  const g = parseInt(match[2] ?? "00", 16);
  const b = parseInt(match[3] ?? "00", 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? "#333333" : "#ffffff";
}

function verseNumbersOf(verse: ChapterHighlight["verse"]): number[] {
  if (typeof verse === "number") return [verse];
  const numbers: number[] = [];
  for (let n = verse[0]; n <= verse[1]; n++) numbers.push(n);
  return numbers;
}

/**
 * True when a decoration paints a slice of the verse text rather than the
 * whole verse. The ribbon and the off-screen bubbles both skip these: they
 * work per verse, so a fragment would look like the whole verse was highlighted.
 */
export function hasContentTargeting(decoration: VerseDecoration): boolean {
  const hasTargetContent =
    typeof decoration.targetContent === "string" &&
    decoration.targetContent.trim().length > 0;
  const hasIndexRange =
    typeof decoration.startIndex === "number" ||
    typeof decoration.endIndex === "number";
  return hasTargetContent || hasIndexRange;
}

/**
 * Decoration highlights for this chapter, one entry per verse. Later
 * decorations win. Verses that aren't a whole verse number are dropped so a
 * bubble and the ribbon always agree on what is highlighted.
 */
export function decorationHighlightsByVerse(
  decorations: readonly VerseDecoration[],
  chapter: {
    translationId: string;
    bookId: string;
    chapterNumber: number;
  }
): Map<number, ChapterHighlight> {
  const byVerse = new Map<number, ChapterHighlight>();
  for (const decoration of decorations) {
    if (!decoration.highlight || hasContentTargeting(decoration)) continue;
    if (
      (decoration.translationId &&
        decoration.translationId !== chapter.translationId) ||
      decoration.bookId !== chapter.bookId ||
      decoration.chapterNumber !== chapter.chapterNumber
    ) {
      continue;
    }
    for (const verseNumber of decoration.verses) {
      if (!Number.isInteger(verseNumber) || verseNumber < 1) continue;
      byVerse.set(verseNumber, {
        ...decoration.highlight,
        verse: verseNumber,
      });
    }
  }
  return byVerse;
}

/**
 * Every highlighted verse in this chapter, one mark per verse. A decoration
 * highlight (a session peer, or an extension) covers a saved highlight on the
 * same verse, matching how the ribbon layer paints them. Content-targeted
 * decorations are skipped: the ribbon can't paint a text fragment, so a bubble
 * for one would point at a verse that isn't actually highlighted.
 *
 * Saved highlights are omitted when the reader is hiding them, since jumping
 * to the verse would land on nothing visible. Decoration highlights stay.
 */
export function collectHighlightCueMarks(options: {
  highlights: readonly ChapterHighlight[];
  decorations: readonly VerseDecoration[];
  translationId: string;
  bookId: string;
  chapterNumber: number;
  showSavedHighlights: boolean;
}): HighlightCueMark[] {
  const byVerse = new Map<number, HighlightCueMark>();

  if (options.showSavedHighlights) {
    for (const highlight of options.highlights) {
      const style = highlightCueStyle(highlight);
      for (const verse of verseNumbersOf(highlight.verse)) {
        byVerse.set(verse, { verse, ...style });
      }
    }
  }

  for (const [verse, highlight] of decorationHighlightsByVerse(
    options.decorations,
    options
  )) {
    byVerse.set(verse, { verse, ...highlightCueStyle(highlight) });
  }

  return [...byVerse.values()].sort((a, b) => a.verse - b.verse);
}

/**
 * A verse this close to the viewport edge (in px) counts as on screen, so a
 * highlight that is only a hair past the fold doesn't flicker a bubble.
 */
const VIEWPORT_SLACK_PX = 2;

type Side = "up" | "down";

function sideOf(
  mark: MeasuredHighlightMark,
  viewport: ReaderViewport
): Side | null {
  // No box means the verse hasn't been laid out yet. It isn't off-screen.
  if (mark.bottom <= mark.top) return null;
  if (mark.bottom <= viewport.top + VIEWPORT_SLACK_PX) return "up";
  if (mark.top >= viewport.bottom - VIEWPORT_SLACK_PX) return "down";
  return null;
}

function cueLabel(start: number, end: number): string {
  return start === end ? String(start) : `${start}–${end}`;
}

/**
 * Bubbles for highlighted verses that sit entirely above or below the visible
 * reader. Consecutive verses of the same colour on the same side collapse into
 * one bubble labelled with their range, so a highlight of verses 1–2 is one
 * arrow rather than two identical ones.
 */
export function placeOffscreenHighlightCues(
  marks: readonly MeasuredHighlightMark[],
  viewport: ReaderViewport
): { up: OffscreenHighlightCue[]; down: OffscreenHighlightCue[] } {
  if (viewport.bottom <= viewport.top) return { up: [], down: [] };

  const sorted = [...marks].sort((a, b) => a.verse - b.verse);
  const up: OffscreenHighlightCue[] = [];
  const down: OffscreenHighlightCue[] = [];

  let run: {
    side: Side;
    styleKey: string;
    verse: number;
    end: number;
    background: string;
    textColor: string;
  } | null = null;

  const flush = () => {
    if (!run) return;
    const cue: OffscreenHighlightCue = {
      key: `${run.side}:${run.styleKey}:${run.verse}`,
      direction: run.side,
      verse: run.verse,
      label: cueLabel(run.verse, run.end),
      background: run.background,
      textColor: run.textColor,
    };
    (run.side === "up" ? up : down).push(cue);
    run = null;
  };

  for (const mark of sorted) {
    const side = sideOf(mark, viewport);
    if (
      run &&
      side === run.side &&
      mark.styleKey === run.styleKey &&
      mark.verse === run.end + 1
    ) {
      run.end = mark.verse;
      continue;
    }
    flush();
    if (!side) continue;
    run = {
      side,
      styleKey: mark.styleKey,
      verse: mark.verse,
      end: mark.verse,
      background: mark.background,
      textColor: mark.textColor,
    };
  }
  flush();

  return { up, down };
}

/**
 * A row that fits shows no arrows. Otherwise an arrow appears only on a side
 * that still has circles past the edge: none on the left at the start of the
 * row, none on the right once the end is in view.
 */
export function horizontalScrollEdges(
  scrollLeft: number,
  scrollWidth: number,
  clientWidth: number
): { left: boolean; right: boolean } {
  const max = scrollWidth - clientWidth;
  if (max <= 1) return { left: false, right: false };
  return {
    left: scrollLeft > 1,
    right: scrollLeft < max - 1,
  };
}
