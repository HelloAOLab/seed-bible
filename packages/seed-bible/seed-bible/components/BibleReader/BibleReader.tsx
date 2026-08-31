import "./BibleReader.inline.css";
import {
  type TranslationBookChapter,
  type ChapterVerse,
} from "../../managers/FreeUseBibleAPI";
import {
  Fragment,
  type ComponentChildren,
  type JSX,
  type RefObject,
} from "preact";
import {
  Suspense,
  useEffect,
  useRef,
  useLayoutEffect,
  useState,
} from "preact/compat";
import { computed, type ReadonlySignal, type Signal } from "@preact/signals";
import {
  adjacentInlineRect,
  buildRibbonPath,
  collectLineRects,
  type RibbonRect,
  RIBBON_RADIUS_EM,
  RIBBON_PAD_X_EM,
} from "../../app/highlightRibbon";
import type {
  BibleReadingState,
  BibleSelectedVerse,
  VerseDecoration,
} from "../../managers/BibleReadingManager";
import type {
  ChapterHighlight,
  ChapterHighlights,
} from "../../managers/HighlightsManager";
import type { BibleSelectorState } from "../../managers/BibleSelectorManager";
import type { TabSlot } from "../../managers/TabsLayoutManager";
import type { ScriptureElementsBehavior } from "../../managers/SettingsManager";
import type { SeedBibleState } from "../../managers/SeedBibleStateManager";
import {
  annotationVerseNumbers,
  type Annotation,
  type AnnotationsManager,
} from "../../managers/AnnotationsManager";
import type { BibleReadingSession } from "../../managers/SessionsManager";
import { useI18n } from "../../i18n/I18nManager";
import { MobileSettingsSheet } from "../../components/MobileSettingsSheet/MobileSettingsSheet";
import { MobileSessionParticipants } from "../../components/SessionParticipants/SessionParticipants";
import { InfoSettingsIcon } from "../../components/icons";
import { QuickToolbar } from "../../components/QuickToolbar/QuickToolbar";
import { Skeleton, SkeletonContainer } from "../Skeleton/Skeleton";
import {
  SelfAvatarVisual,
  getSelfDisplayName,
  openBookmarkCategoryModal,
} from "../Tabs/Tabs";
import { VerseReferenceText } from "../../app/verseReferenceLink";
import { flingSafeTapHandlers } from "../../app/flingSafeTap";

interface ReaderBookmarkButtonProps {
  state: SeedBibleState;
  translationId: string | null;
  bookId: string | null;
  chapterNumber: number | null;
}

/**
 * Toggle for the chapter currently shown in the reader. Sits in the top-right
 * of the chapter content area: filled + orange when the chapter is saved,
 * outlined when not. Opens the category picker to save into an existing or
 * new folder; when already bookmarked, removes the chapter-level bookmark.
 */
function ReaderBookmarkButton(props: ReaderBookmarkButtonProps) {
  const { state, translationId, bookId, chapterNumber } = props;
  const { t } = useI18n();
  const canBookmark = !!(translationId && bookId && chapterNumber);
  const isBookmarked =
    canBookmark &&
    state.bookmarks.isLocationBookmarked(translationId, bookId, chapterNumber);

  return (
    <button
      type="button"
      className={`sb-bible-reader-bookmark-button${
        isBookmarked ? " sb-bible-reader-bookmark-button-active" : ""
      }`}
      onClick={() => {
        if (!canBookmark || !translationId || !bookId || !chapterNumber) {
          return;
        }
        if (isBookmarked) {
          void state.bookmarks.removeBookmarkForLocation(
            translationId,
            bookId,
            chapterNumber
          );
          return;
        }
        openBookmarkCategoryModal(state, {
          translationId,
          bookId,
          chapterNumber,
        });
      }}
      disabled={!canBookmark}
      aria-pressed={isBookmarked}
      aria-label={
        isBookmarked
          ? t("remove-bookmark", { defaultValue: "Remove bookmark" })
          : t("add-bookmark", { defaultValue: "Bookmark chapter" })
      }
      title={
        isBookmarked
          ? t("remove-bookmark", { defaultValue: "Remove bookmark" })
          : t("add-bookmark", { defaultValue: "Bookmark chapter" })
      }
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill={isBookmarked ? "currentColor" : "none"}
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
    </button>
  );
}

interface ChapterNotesButtonProps {
  state: SeedBibleState;
  bookId: string | null;
  chapterNumber: number | null;
}

/**
 * Shows the note count for the chapter currently in view; hidden entirely
 * when the chapter has no annotations. Opens the Discover pane, which lists
 * the chapter's annotations grouped by verse range.
 */
function ChapterNotesButton(props: ChapterNotesButtonProps) {
  const { state, bookId, chapterNumber } = props;
  const { t } = useI18n();
  const noteCount =
    bookId && chapterNumber
      ? state.annotations.getAnnotationsForChapter(bookId, chapterNumber).value
          .length
      : 0;

  if (noteCount === 0) {
    return null;
  }

  const label = t("chapter-notes-count", {
    defaultValue: "{{count}} notes for this chapter",
    count: noteCount,
  });

  return (
    <button
      type="button"
      className="sb-bible-reader-mobile-header-notes"
      // Mirrors the account button below: stop the tap here so the reader
      // pane wrapper's pointerdown handler doesn't interfere with opening
      // Discover.
      onPointerDown={(e: PointerEvent) => e.stopPropagation()}
      onClick={(e: MouseEvent) => {
        e.stopPropagation();
        state.app.openDiscover();
      }}
      aria-label={label}
      title={label}
    >
      <span className="material-symbols-outlined" aria-hidden="true">
        sticky_note_2
      </span>
      <span className="sb-bible-reader-mobile-header-notes-count">
        {noteCount}
      </span>
    </button>
  );
}

interface VerseLine {
  indentLevel: number;
  parts: ChapterVerse["content"];
}

function getPoemIndentLevel(part: ChapterVerse["content"][0]) {
  if (
    part &&
    typeof part === "object" &&
    "text" in part &&
    typeof part.text === "string" &&
    typeof part.poem === "number" &&
    part.poem > 0
  ) {
    return part.poem;
  }

  return null;
}

function isFootnotePart(part: ChapterVerse["content"][0]) {
  return (
    !!part &&
    typeof part === "object" &&
    "noteId" in part &&
    typeof part.noteId === "number"
  );
}

type VerseSegment =
  | { type: "inline"; parts: ChapterVerse["content"] }
  | { type: "poetry"; lines: VerseLine[] };

interface ContentDecorationRange {
  start: number;
  end: number;
  className: string;
  style?: JSX.CSSProperties;
}

function getInlineText(part: ChapterVerse["content"][0]): string {
  if (typeof part === "string") {
    return part;
  }

  if (part && typeof part === "object" && "text" in part) {
    return typeof part.text === "string" ? part.text : "";
  }

  return "";
}

function getVersePlainText(content: ChapterVerse["content"]): string {
  return content.map((part) => getInlineText(part)).join("");
}

/**
 * A highlight resolved for one verse, plus where it came from. `broadcast` is
 * true for a highlight carried by a decoration — a session peer's, or an
 * extension's — as opposed to one the reader saved themselves.
 */
interface ResolvedHighlight {
  highlight: ChapterHighlight;
  broadcast: boolean;
}

function hasContentTargeting(decoration: VerseDecoration): boolean {
  const hasTargetContent =
    typeof decoration.targetContent === "string" &&
    decoration.targetContent.trim().length > 0;
  const hasIndexRange =
    typeof decoration.startIndex === "number" ||
    typeof decoration.endIndex === "number";

  return hasTargetContent || hasIndexRange;
}

function toContentDecorationRanges(
  verseText: string,
  decorations: VerseDecoration[]
): ContentDecorationRange[] {
  const verseLength = verseText.length;

  const clampIndex = (value: number) =>
    Math.max(0, Math.min(verseLength, Math.floor(value)));

  return decorations.flatMap((decoration) => {
    const className = decoration.className?.trim() ?? "";
    const style = decoration.style;

    const hasStart = typeof decoration.startIndex === "number";
    const hasEnd = typeof decoration.endIndex === "number";
    const windowStart = hasStart ? clampIndex(decoration.startIndex!) : 0;
    const windowEnd = hasEnd ? clampIndex(decoration.endIndex!) : verseLength;

    if (windowEnd <= windowStart) {
      return [];
    }

    const targetContent = decoration.targetContent?.trim();
    if (!targetContent) {
      return [
        {
          start: windowStart,
          end: windowEnd,
          className,
          style,
        },
      ];
    }

    const windowText = verseText.slice(windowStart, windowEnd);
    const ranges: ContentDecorationRange[] = [];
    let searchStart = 0;

    while (searchStart <= windowText.length) {
      const matchStartInWindow = windowText.indexOf(targetContent, searchStart);
      if (matchStartInWindow === -1) {
        break;
      }

      const absoluteStart = windowStart + matchStartInWindow;
      ranges.push({
        start: absoluteStart,
        end: absoluteStart + targetContent.length,
        className,
        style,
      });
      searchStart = matchStartInWindow + targetContent.length;
    }

    return ranges;
  });
}

function splitVerseIntoSegments(
  content: ChapterVerse["content"]
): VerseSegment[] {
  const segments: VerseSegment[] = [];
  let currentInlineParts: ChapterVerse["content"] = [];
  let currentPoetryLines: VerseLine[] = [];
  let currentPoetryLine: VerseLine = { indentLevel: 0, parts: [] };
  let inPoetry = false;

  const pushCurrentPoetryLine = () => {
    if (currentPoetryLine.parts.length > 0) {
      currentPoetryLines.push({
        indentLevel: currentPoetryLine.indentLevel,
        parts: [...currentPoetryLine.parts],
      });
      currentPoetryLine = {
        indentLevel: currentPoetryLine.indentLevel,
        parts: [],
      };
    }
  };

  const flushPoetry = () => {
    pushCurrentPoetryLine();
    if (currentPoetryLines.length > 0) {
      segments.push({ type: "poetry", lines: currentPoetryLines });
      currentPoetryLines = [];
    }
    currentPoetryLine = { indentLevel: 0, parts: [] };
    inPoetry = false;
  };

  const flushInline = () => {
    if (currentInlineParts.length > 0) {
      segments.push({ type: "inline", parts: currentInlineParts });
      currentInlineParts = [];
    }
  };

  for (const part of content) {
    const isFootnote = isFootnotePart(part);
    const indentLevel = getPoemIndentLevel(part);
    const isLineBreak =
      part &&
      typeof part === "object" &&
      "lineBreak" in part &&
      part.lineBreak === true;

    if (isFootnote) {
      if (inPoetry) {
        currentPoetryLine.parts.push(part);
      } else {
        currentInlineParts.push(part);
      }
      continue;
    }

    if (indentLevel !== null) {
      if (!inPoetry) {
        flushInline();
        inPoetry = true;
      }
      if (
        currentPoetryLine.parts.length > 0 &&
        currentPoetryLine.indentLevel !== indentLevel
      ) {
        pushCurrentPoetryLine();
      }
      currentPoetryLine.indentLevel = indentLevel;
      currentPoetryLine.parts.push(part);
    } else if (isLineBreak) {
      if (inPoetry) {
        pushCurrentPoetryLine();
      } else {
        currentInlineParts.push(part);
      }
    } else {
      if (inPoetry) {
        flushPoetry();
      }
      currentInlineParts.push(part);
    }
  }

  if (inPoetry) {
    flushPoetry();
  } else {
    flushInline();
  }
  return segments;
}

function renderInlineContent(
  part: ChapterVerse["content"][0],
  index: number,
  onOpenFootnote: (noteId: number) => void,
  showHeadings: boolean,
  showFootnotes: boolean,
  showRedLettering: boolean,
  contentRanges: ContentDecorationRange[] = [],
  partStartIndex = 0
) {
  const splitTextByDecorations = (text: string) => {
    const partEndIndex = partStartIndex + text.length;
    const ranges = contentRanges
      .filter(
        (range) => range.end > partStartIndex && range.start < partEndIndex
      )
      .map((range) => ({
        start: Math.max(0, range.start - partStartIndex),
        end: Math.min(text.length, range.end - partStartIndex),
        className: range.className,
        style: range.style,
      }))
      .sort((left, right) => {
        if (left.start !== right.start) {
          return left.start - right.start;
        }
        return left.end - right.end;
      });

    if (ranges.length === 0) {
      return [
        {
          text,
          className: "",
          style: undefined as JSX.CSSProperties | undefined,
        },
      ];
    }

    const boundaries = new Set<number>([0, text.length]);
    for (const range of ranges) {
      boundaries.add(range.start);
      boundaries.add(range.end);
    }

    const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);
    const segments: Array<{
      text: string;
      className: string;
      style?: JSX.CSSProperties;
    }> = [];

    for (let i = 0; i < sortedBoundaries.length - 1; i += 1) {
      const segmentStart = sortedBoundaries[i]!;
      const segmentEnd = sortedBoundaries[i + 1]!;
      if (segmentStart === segmentEnd) {
        continue;
      }

      const segmentText = text.slice(segmentStart, segmentEnd);
      if (!segmentText) {
        continue;
      }

      const activeRanges = ranges.filter(
        (range) => segmentStart >= range.start && segmentEnd <= range.end
      );
      const className = activeRanges
        .map((range) => range.className)
        .filter((name) => name.length > 0)
        .join(" ");
      const style = activeRanges.reduce<JSX.CSSProperties | undefined>(
        (merged, range) => {
          if (!range.style) {
            return merged;
          }

          return {
            ...(merged ?? {}),
            ...range.style,
          };
        },
        undefined
      );

      segments.push({
        text: segmentText,
        className,
        style,
      });
    }

    return segments;
  };

  if (typeof part === "string") {
    const segments = splitTextByDecorations(part);
    return (
      <span key={index}>
        {segments.map((segment, segmentIndex) => (
          <span
            key={`${index}-${segmentIndex}`}
            className={segment.className}
            style={segment.style}
          >
            {segment.text}
          </span>
        ))}
      </span>
    );
  }

  if (!part || typeof part !== "object") {
    return null;
  }

  if ("text" in part && typeof part.text === "string") {
    let className = "";
    if (part.wordsOfJesus && showRedLettering) {
      className += " sb-words-of-jesus";
    }

    const segments = splitTextByDecorations(part.text);
    return (
      <span key={index} className={className.trim()}>
        {segments.map((segment, segmentIndex) => (
          <span
            key={`${index}-${segmentIndex}`}
            className={segment.className}
            style={segment.style}
          >
            {(index > 0 ? " " : "") + segment.text}
          </span>
        ))}
      </span>
    );
  }

  if ("heading" in part && typeof part.heading === "string") {
    if (!showHeadings) {
      return null;
    }
    return <strong key={index}>{part.heading}</strong>;
  }

  if ("lineBreak" in part && part.lineBreak === true) {
    return <br key={index} />;
  }

  if ("noteId" in part && typeof part.noteId === "number") {
    if (!showFootnotes) {
      return <span> </span>;
    }
    return (
      <button
        key={index}
        className="sb-inline-footnote-button"
        aria-label={`Open footnote ${part.noteId}`}
        title={`Open footnote ${part.noteId}`}
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          onOpenFootnote(part.noteId);
        }}
      >
        <span className="material-symbols-outlined">info</span>
      </button>
    );
  }

  return null;
}

/**
 * Pointer type of the most recent `pointerdown` on a poetry verse's outer
 * span, read by that same verse's `onClick` guard below to decide how
 * forgiving its tap region is. Module scope rather than a ref: `renderVerseNode`
 * is a plain helper re-created on every call, not a component, so it has
 * nowhere of its own to persist state between the pointerdown and the click
 * that follows it (same reasoning as the module-scope state in
 * `app/flingSafeTap.ts`).
 */
let lastVersePointerType = "";

/** Clears the module-scope pointer-type state so tests cannot leak it between cases. */
export function resetLastVersePointerTypeForTests() {
  lastVersePointerType = "";
}

function renderChapterContent(
  chapterData: TranslationBookChapter | null,
  onVerseClick: (verse: BibleSelectedVerse, event: MouseEvent) => void,
  selectedVerses: BibleSelectedVerse[],
  onOpenFootnote: (noteId: number, verse: ChapterVerse | null) => void,
  highlights: ChapterHighlight[],
  decorations: VerseDecoration[],
  chapterAnnotations: Annotation[],
  scriptureElements: ScriptureElementsBehavior,
  onAnnotationVerseClick: (
    verse: BibleSelectedVerse,
    verseNumber: number,
    event: MouseEvent
  ) => void
) {
  if (!chapterData) {
    return null;
  }

  const getVerseDecorations = (verseNumber: number) => {
    return decorations.filter(
      (decoration) =>
        (!decoration.translationId ||
          decoration.translationId === chapterData.translation.id) &&
        decoration.bookId === chapterData.book.id &&
        decoration.chapterNumber === chapterData.chapter.number &&
        decoration.verses.includes(verseNumber)
    );
  };

  // Decorations asking to be drawn as highlights (`decoration.highlight`),
  // flattened to one entry per verse. Content-targeted decorations are skipped:
  // the ribbon layer works per verse-run and can't paint a text fragment.
  // Later decorations win, matching how their CSS is layered below.
  const decorationHighlights = new Map<number, ChapterHighlight>();
  for (const decoration of decorations) {
    if (!decoration.highlight || hasContentTargeting(decoration)) {
      continue;
    }
    if (
      (decoration.translationId &&
        decoration.translationId !== chapterData.translation.id) ||
      decoration.bookId !== chapterData.book.id ||
      decoration.chapterNumber !== chapterData.chapter.number
    ) {
      continue;
    }
    for (const verseNumber of decoration.verses) {
      decorationHighlights.set(verseNumber, {
        ...decoration.highlight,
        verse: verseNumber,
      });
    }
  }

  // `showHighlights` hides the reader's *saved* highlights. Decoration
  // highlights are a live signal from a session peer or an extension, so they
  // stay visible either way — as they did when they were plain CSS.
  //
  // `broadcast` distinguishes the two for rendering: a decoration highlight is
  // drawn as an outline, a saved one as a solid ribbon. A broadcast covers the
  // reader's own highlight rather than replacing it, so the outline is what
  // says "this isn't yours, and yours is still underneath".
  const getVerseHighlight = (verseNumber: number): ResolvedHighlight | null => {
    const decorated = decorationHighlights.get(verseNumber);
    if (decorated) {
      return { highlight: decorated, broadcast: true };
    }

    if (!scriptureElements.showHighlights) {
      return null;
    }

    for (const highlight of highlights) {
      if (typeof highlight.verse === "number") {
        if (highlight.verse === verseNumber) {
          return { highlight, broadcast: false };
        }
        continue;
      }

      const [start, end] = highlight.verse;
      if (verseNumber >= start && verseNumber <= end) {
        return { highlight, broadcast: false };
      }
    }

    return null;
  };

  // The highlight background is drawn behind the text by the ribbon layer (see
  // ChapterContent), so a highlighted run's wrapper paints no background itself.
  // It only carries the readable font color and a `fill` (a CSS-var reference for
  // preset colors, or the custom hex) that the layer reads back off the DOM.
  const getHighlightPresentation = (resolved: ResolvedHighlight | null) => {
    if (!resolved) {
      return {
        className: "",
        style: undefined as JSX.CSSProperties | undefined,
        fill: null as string | null,
        broadcast: false,
      };
    }

    const { highlight, broadcast } = resolved;

    // A custom colour stands on its own — the font colour is optional and the
    // text inherits when it's absent. Requiring both meant a highlight with
    // only a custom colour silently rendered as its preset instead.
    if (highlight.customColor) {
      return {
        className: "sb-highlight",
        style: highlight.customFontColor
          ? ({ color: highlight.customFontColor } as JSX.CSSProperties)
          : undefined,
        fill: highlight.customColor,
        broadcast,
      };
    }

    // The `transparent` fallback matters: a colorId with no matching theme
    // variable would otherwise make `fill` invalid at computed-value time, and
    // `fill` inherits down to its initial value of black — a solid black bar
    // behind the verse. Colour ids don't all come from our own picker (an
    // extension can pass one through from a chat message), so an unrecognised
    // one has to fail invisible.
    return {
      className: `sb-highlight sb-highlight-${highlight.colorId}`,
      style: undefined as JSX.CSSProperties | undefined,
      fill: `var(--sb-highlight-${highlight.colorId}-color, transparent)`,
      broadcast,
    };
  };

  const getDecorationPresentation = (verseDecorations: VerseDecoration[]) => {
    const matchingDecorations = verseDecorations.filter((decoration) => {
      return !hasContentTargeting(decoration);
    });

    return matchingDecorations.reduce(
      (presentation, decoration) => ({
        className: decoration.className
          ? `${presentation.className} ${decoration.className}`
          : presentation.className,
        style: decoration.style
          ? {
              ...(presentation.style ?? {}),
              ...decoration.style,
            }
          : presentation.style,
      }),
      {
        className: "",
        style: undefined as JSX.CSSProperties | undefined,
      }
    );
  };

  // Also keys on `broadcast`, so a broadcast highlight never merges into one run
  // with a saved highlight of the same colour — they draw differently.
  const getHighlightColorKey = (resolved: ResolvedHighlight | null) => {
    if (!resolved) {
      return null;
    }
    const { highlight, broadcast } = resolved;
    const prefix = broadcast ? "broadcast:" : "";
    if (highlight.customColor) {
      return `${prefix}custom:${highlight.customColor}:${highlight.customFontColor ?? ""}`;
    }
    return `${prefix}${highlight.colorId}`;
  };

  // Only matches an annotation to the verse number it *starts* at (the
  // lowest verse it targets), not every verse it spans — a Genesis 1:3-6
  // note marks verse 3 only, not 4, 5, and 6 too.
  const getVerseAnnotations = (verseNumber: number): Annotation[] =>
    chapterAnnotations.filter((annotation) => {
      const verseNumbers = annotationVerseNumbers(annotation);
      return (
        verseNumbers.length > 0 && Math.min(...verseNumbers) === verseNumber
      );
    });

  // Renders a verse's number when shown, boxed if the verse has a covering
  // annotation; when verse numbers are hidden, an annotated verse still shows
  // a `sticky_note_2` icon in that spot so the indicator survives the setting.
  // An annotated number/icon is clickable, jumping straight to its note.
  const renderVerseNumberOrIcon = (
    verseNumber: number,
    verse: BibleSelectedVerse
  ) => {
    const hasAnnotation = getVerseAnnotations(verseNumber).length > 0;
    const handleAnnotationClick = (event: MouseEvent) =>
      onAnnotationVerseClick(verse, verseNumber, event);

    if (scriptureElements.showVerseNumbers) {
      return (
        <sup
          className={
            hasAnnotation
              ? "sb-verse-number sb-verse-number-annotated"
              : "sb-verse-number"
          }
          onClick={hasAnnotation ? handleAnnotationClick : undefined}
          role={hasAnnotation ? "button" : undefined}
          tabIndex={hasAnnotation ? 0 : undefined}
        >
          {verseNumber}
        </sup>
      );
    }
    if (!hasAnnotation) {
      return null;
    }
    return (
      <sup
        className="sb-verse-number sb-verse-annotation-icon"
        onClick={handleAnnotationClick}
        role="button"
        tabIndex={0}
      >
        <span className="material-symbols-outlined">sticky_note_2</span>
      </sup>
    );
  };

  // Renders a single verse's `<span class="sb-verse">`. The highlight background
  // is never painted here — an enclosing run wrapper (below) carries it and the
  // ribbon layer draws it behind the text. Verse decorations still apply here.
  const renderVerseNode = (value: ChapterVerse, entryIndex: number) => {
    const verse: BibleSelectedVerse = {
      bookId: chapterData.book.id,
      chapterNumber: chapterData.chapter.number,
      verse: value,
      translationId: chapterData.translation.id,
    };
    const isSelected = selectedVerses.some(
      (v) =>
        v.verse.number === value.number &&
        v.bookId === chapterData.book.id &&
        v.chapterNumber === chapterData.chapter.number
    );
    const segments = splitVerseIntoSegments(value.content);
    const hasPoetry = segments.some((s) => s.type === "poetry");
    const verseDecorations = getVerseDecorations(value.number);
    const decorationPresentation = getDecorationPresentation(verseDecorations);
    const contentDecorations = verseDecorations.filter((decoration) =>
      hasContentTargeting(decoration)
    );
    const contentRanges = toContentDecorationRanges(
      getVersePlainText(value.content),
      contentDecorations
    );
    let currentTextOffset = 0;
    const getPartTextStartIndex = (part: ChapterVerse["content"][0]) => {
      const startIndex = currentTextOffset;
      currentTextOffset += getInlineText(part).length;
      return startIndex;
    };
    const verseClassName = [
      "sb-verse",
      hasPoetry ? "sb-verse-poetry" : "",
      isSelected ? "sb-verse-selected" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const verseDecoratorClassName = [
      "sb-verse-decorator",
      decorationPresentation.className.trim(),
    ]
      .filter(Boolean)
      .join(" ");
    const verseDecoratorStyle = {
      ...(decorationPresentation.style ?? {}),
    };

    if (hasPoetry) {
      return (
        <span
          key={`verse-${entryIndex}`}
          className={verseClassName}
          data-verse-number={value.number}
          onPointerDown={(event: PointerEvent) => {
            lastVersePointerType = event.pointerType;
          }}
          onClick={(event: MouseEvent) => {
            // Poetry lines are `display: block` so each one spans the full
            // content width — a tap in the blank margin past a short line's
            // last word still lands inside this outer span even though it's
            // nowhere near the verse's actual text. On a mouse, where a
            // precise miss is unambiguous, only a click that reaches an
            // actual `.sb-verse-decorator` (the inline span the rendered
            // words themselves sit in) counts as selecting the verse — the
            // reader's outside-click handling (`BibleReaderToolbar.tsx`) is
            // then free to treat the rest of the block as a dismiss. A touch
            // tap is far less precise, though, and there's no in-between
            // "blank space" for a finger to miss into that a mouse pointer
            // couldn't also land on deliberately — so a touch keeps the
            // original, forgiving behavior of the whole block.
            const target = event.target as HTMLElement | null;
            const verseTapSelector =
              lastVersePointerType === "touch"
                ? ".sb-verse"
                : ".sb-verse-decorator";
            if (!target?.closest(verseTapSelector)) return;
            onVerseClick(verse, event);
          }}
          style={{
            cursor: "pointer",
          }}
          role="button"
          tabIndex={0}
        >
          {segments.map((segment, segIndex) => {
            if (segment.type === "inline") {
              return (
                <span
                  key={`verse-${entryIndex}-seg-${segIndex}-inline`}
                  className={verseDecoratorClassName}
                  style={verseDecoratorStyle}
                >
                  {segIndex === 0 &&
                    renderVerseNumberOrIcon(value.number, verse)}
                  {segment.parts.map((part, partIndex) =>
                    renderInlineContent(
                      part,
                      segIndex * 10000 + partIndex,
                      (noteId) => onOpenFootnote(noteId, value),
                      scriptureElements.showHeadings,
                      scriptureElements.showFootnotes,
                      scriptureElements.showRedLettering,
                      contentRanges,
                      getPartTextStartIndex(part)
                    )
                  )}
                </span>
              );
            }
            return segment.lines.map((line, lineIndex) => (
              <span
                key={`verse-${entryIndex}-seg-${segIndex}-line-${lineIndex}`}
                className="sb-verse-line"
                style={{
                  paddingInlineStart:
                    line.indentLevel > 0
                      ? `${line.indentLevel * 30}px`
                      : undefined,
                }}
              >
                <span
                  className={verseDecoratorClassName}
                  style={verseDecoratorStyle}
                >
                  {segIndex === 0 &&
                    lineIndex === 0 &&
                    renderVerseNumberOrIcon(value.number, verse)}
                  {line.parts.map((part, partIndex) =>
                    renderInlineContent(
                      part,
                      partIndex,
                      (noteId) => onOpenFootnote(noteId, value),
                      scriptureElements.showHeadings,
                      scriptureElements.showFootnotes,
                      scriptureElements.showRedLettering,
                      contentRanges,
                      getPartTextStartIndex(part)
                    )
                  )}
                </span>
              </span>
            ));
          })}
        </span>
      );
    }

    return (
      <span
        key={`verse-${entryIndex}`}
        className={verseClassName}
        data-verse-number={value.number}
        onClick={(event: MouseEvent) => {
          onVerseClick(verse, event);
        }}
        style={{
          cursor: "pointer",
        }}
        role="button"
        tabIndex={0}
      >
        <span className={verseDecoratorClassName} style={verseDecoratorStyle}>
          {renderVerseNumberOrIcon(value.number, verse)}
          {value.content.map((part, index) =>
            renderInlineContent(
              part,
              index,
              (noteId) => onOpenFootnote(noteId, value),
              scriptureElements.showHeadings,
              scriptureElements.showFootnotes,
              scriptureElements.showRedLettering,
              contentRanges,
              getPartTextStartIndex(part)
            )
          )}
        </span>
      </span>
    );
  };

  const isVerseEntry = (entry: unknown): entry is ChapterVerse =>
    !!entry &&
    typeof entry === "object" &&
    (entry as { type?: unknown }).type === "verse" &&
    typeof (entry as ChapterVerse).number === "number" &&
    Array.isArray((entry as ChapterVerse).content);

  const entries = chapterData.chapter.content;
  const nodes: (JSX.Element | null)[] = [];

  // Verse text carries no leading/trailing spaces of its own — with numbers on,
  // the number's own margins are what keep one verse off the back of the
  // previous one. Hide the numbers and adjacent verses collide
  // ("...had your fill.Do not work..."), so emit a real space between them.
  // It sits between the verse spans rather than inside one, so highlight
  // ribbons and verse selection still stop at a verse's own glyphs, and it
  // collapses away at a line break like any other space.
  const needsVerseSpacing = !scriptureElements.showVerseNumbers;
  let previousWasVerse = false;

  // Keyed so the separator is a first-class sibling of the keyed verses it sits
  // between, rather than an unkeyed string mixed in among them. A fragment adds
  // nothing to the DOM — what renders is the bare text node either way.
  const verseSeparator = (key: string) => <Fragment key={key}> </Fragment>;

  for (let i = 0; i < entries.length; ) {
    const entry = entries[i];

    if (!entry || typeof entry !== "object") {
      nodes.push(null);
      i += 1;
      continue;
    }

    if (entry.type === "heading" && Array.isArray(entry.content)) {
      if (!scriptureElements.showHeadings) {
        nodes.push(null);
        i += 1;
        continue;
      }
      const heading = (entry.content as unknown[])
        .filter((item) => typeof item === "string")
        .join(" ");
      nodes.push(
        <h3 key={`heading-${i}`} className="sb-chapter-heading">
          {heading}
        </h3>
      );
      previousWasVerse = false;
      i += 1;
      continue;
    }

    if (entry.type === "line_break") {
      nodes.push(<div key={`break-${i}`} className="sb-line-break" />);
      previousWasVerse = false;
      i += 1;
      continue;
    }

    if (entry.type === "hebrew_subtitle" && Array.isArray(entry.content)) {
      nodes.push(
        <p key={`subtitle-${i}`} className="sb-subtitle">
          {entry.content.map((part, index) =>
            renderInlineContent(
              part,
              index,
              (noteId) => onOpenFootnote(noteId, null),
              scriptureElements.showHeadings,
              scriptureElements.showFootnotes,
              scriptureElements.showRedLettering
            )
          )}
        </p>
      );
      previousWasVerse = false;
      i += 1;
      continue;
    }

    if (isVerseEntry(entry)) {
      const highlight = getVerseHighlight(entry.number);
      const colorKey = getHighlightColorKey(highlight);

      if (needsVerseSpacing && previousWasVerse) {
        nodes.push(verseSeparator(`space-${i}`));
      }
      previousWasVerse = true;

      if (colorKey === null) {
        nodes.push(renderVerseNode(entry, i));
        i += 1;
        continue;
      }

      const isPoetry = splitVerseIntoSegments(entry.content).some(
        (s) => s.type === "poetry"
      );

      // Every highlighted unit is wrapped in a `display: contents` element that
      // carries the fill (for the ribbon layer) and font color. Contiguous
      // same-color PROSE verses are grouped into one wrapper so the layer draws
      // a single continuous ribbon across them. Poetry stays one verse per
      // wrapper: its indented lines already read as a connected shape, and
      // merging block-level verses would be visually noisy.
      const runIndices = [i];
      let j = i + 1;
      if (!isPoetry) {
        while (j < entries.length) {
          const next = entries[j];
          if (!isVerseEntry(next)) {
            break;
          }
          const nextKey = getHighlightColorKey(getVerseHighlight(next.number));
          const nextIsPoetry = splitVerseIntoSegments(next.content).some(
            (s) => s.type === "poetry"
          );
          if (nextKey !== colorKey || nextIsPoetry) {
            break;
          }
          runIndices.push(j);
          j += 1;
        }
      }

      const presentation = getHighlightPresentation(highlight);
      // Ribbon key: the run's verse range. Stable across reflow/recolor (same
      // verses -> same key -> reused), so those don't churn the element; fades
      // are decided from coverage, not this key (see `measureRibbons`). `i` is
      // the run's first entry; its last is runIndices' tail.
      const firstVerse = (entries[i] as ChapterVerse).number;
      const lastIdx = runIndices[runIndices.length - 1]!;
      const lastVerse = (entries[lastIdx] as ChapterVerse).number;
      const runKey = `${firstVerse}-${lastVerse}`;
      nodes.push(
        <span
          key={`highlight-run-${i}`}
          className={presentation.className}
          style={presentation.style}
          data-highlight-fill={presentation.fill ?? undefined}
          data-highlight-key={runKey}
          data-highlight-broadcast={presentation.broadcast ? "true" : undefined}
        >
          {runIndices.flatMap((idx, runIndex) => {
            const verseNode = renderVerseNode(
              entries[idx] as ChapterVerse,
              idx
            );
            // Same separator as between top-level verses; inside a run it falls
            // within the ribbon, which is correct — the whole run is one fill.
            return needsVerseSpacing && runIndex > 0
              ? [verseSeparator(`space-${idx}`), verseNode]
              : [verseNode];
          })}
        </span>
      );
      i = j;
      continue;
    }

    nodes.push(null);
    i += 1;
  }

  return nodes;
}

interface BibleReaderProps {
  currentSlot: TabSlot;
  readingState: BibleReadingState;
  selectorState: BibleSelectorState;
  scriptureElements?: ScriptureElementsBehavior;
  state?: SeedBibleState;
  mobileChrome?: BibleReaderMobileChromeProps;
  /** The shared session backing this tab, if any — drives the mobile header
   * participants stack. Null/undefined for a normal, non-shared tab. */
  sharedSession?: BibleReadingSession | null;
}

export interface BibleReaderMobileChromeProps {
  isScrolled: boolean;
  prevChapterPreview: TranslationBookChapter | null;
  nextChapterPreview: TranslationBookChapter | null;
  showMobileSettings: boolean;
  onOpenMobileSettings: () => void;
  onCloseMobileSettings: () => void;
  onOpenAllSettings: () => void;
  // Plain refs: these only need `.current` filled in, which Preact does for a
  // ref object on its own.
  swipeViewportRef: RefObject<HTMLDivElement>;
  swipeTrackRef: RefObject<HTMLDivElement>;
  // A callback because it feeds component state, not just a ref.
  currentScrollerRefCallback: (el: HTMLDivElement | null) => void;
  /**
   * Rendered inside the scrolling chapter panel, after the passage. On mobile
   * the panel is the scroll container, so anything placed here is reached by
   * scrolling to the end of the chapter rather than sitting over the text.
   */
  belowContent?: ComponentChildren;
}

function renderStaticChapterContent(
  chapter: TranslationBookChapter | null,
  scriptureElements: ScriptureElementsBehavior
) {
  if (!chapter) return null;
  return renderChapterContent(
    chapter,
    () => {},
    [],
    () => {},
    [],
    [],
    [],
    scriptureElements,
    () => {}
  );
}

// One drawn highlight ribbon. `key` is the run's verse range ("5-8"); `first`/
// `last` are it as numbers (coverage checks). `enter` = fade in (a new highlight,
// not a reshape); `exiting` = fading out before removal.
interface Ribbon {
  key: string;
  d: string;
  fill: string;
  broadcast: boolean;
  first: number;
  last: number;
  enter: boolean;
  exiting: boolean;
}
const RIBBON_FADE_MS = 250;

/**
 * How long the chapter the reader has left stays on screen, dimmed, before the
 * placeholder takes over.
 *
 * Swapping to the placeholder the instant you navigate reads as a flicker on a
 * fast connection, where the new text lands in well under this. Dimming costs
 * nothing and moves nothing, so it carries the common case; the placeholder is
 * only for waits long enough that dimmed text starts to look stuck.
 *
 * Does not apply on a cold start — with no chapter on screen there is nothing
 * to dim, so the placeholder shows straight away.
 */
export const CHAPTER_SKELETON_DELAY_MS = 500;

/**
 * Bar widths for the chapter loading placeholder, one array per paragraph.
 *
 * Hand-picked rather than random so the placeholder is identical on every
 * render — a fresh set each time would shimmer *and* reflow — and so it reads
 * as ragged prose rather than a block.
 *
 * Deliberately more paragraphs than the tallest reading pane needs. The two
 * failure modes are not symmetric: falling short leaves visible dead space
 * below the bars, while overshooting spills below the fold where nobody sees
 * it (the pane scrolls internally, and scroll position resets on every chapter
 * change). Tuning the fill is editing this one array — no measurement, and no
 * reflow on a placeholder that remounts on every navigation.
 */
const CHAPTER_SKELETON_PARAGRAPHS = [
  ["97%", "92%", "99%", "88%", "71%"],
  ["94%", "99%", "90%", "96%", "58%"],
  ["99%", "89%", "95%", "93%", "77%"],
  ["91%", "98%", "87%", "96%", "64%"],
  ["96%", "93%", "99%", "85%", "80%"],
  ["98%", "90%", "94%", "97%", "52%"],
  ["93%", "99%", "91%", "88%", "74%"],
  ["95%", "96%", "98%", "89%", "68%"],
] as const;

interface ChapterContentProps {
  chapterData: Signal<TranslationBookChapter | null>;
  chapterDataPromise: Promise<void>;
  initialChapterLoadSettled: ReadonlySignal<boolean>;
  selectedVerses: Signal<BibleSelectedVerse[]>;
  highlights: ReadonlySignal<ChapterHighlights>;
  decorations: ReadonlySignal<VerseDecoration[]>;
  annotations?: AnnotationsManager;
  selectVerse: (
    verse: BibleSelectedVerse,
    selectionX: number,
    selectionY: number
  ) => void;
  selectVersesFromTextSelection: () => void;
  justConvertedSelectionRef: { current: boolean };
  selectFootnote: (noteId: number | null) => void;
  scriptureElements: ScriptureElementsBehavior;
  onAnnotationVerseClick: (
    verse: BibleSelectedVerse,
    verseNumber: number,
    event: MouseEvent
  ) => void;
  /**
   * True while this is the chapter the reader has *left* — shown dimmed until
   * the chapter they navigated to arrives.
   */
  isStale?: boolean;
}

function ChapterContent(props: ChapterContentProps) {
  const {
    chapterData,
    chapterDataPromise,
    initialChapterLoadSettled,
    selectedVerses,
    highlights,
    decorations,
    annotations,
    selectVerse,
    selectFootnote,
    selectVersesFromTextSelection,
    justConvertedSelectionRef,
    scriptureElements,
    onAnnotationVerseClick,
  } = props;

  const currentChapter = chapterData.value;
  const chapterAnnotations =
    currentChapter && annotations
      ? annotations.getAnnotationsForChapter(
          currentChapter.book.id,
          currentChapter.chapter.number
        ).value
      : [];

  const contentRef = useRef<HTMLDivElement>(null);
  const [ribbons, setRibbons] = useState<Ribbon[]>([]);
  // What's on screen (including ribbons fading out) so the reconcile can diff.
  const renderedRef = useRef<Ribbon[]>([]);
  // Fade-out removal timers, keyed by ribbon key.
  const exitTimers = useRef<Map<string, number>>(new Map());
  // Verses highlighted (any color) last measure; distinguishes new from reshaped.
  const prevCoverageRef = useRef<Set<number>>(new Set());
  // Identity of the chapter last measured. This component is reused across
  // navigation, so on a change we reset the bookkeeping above — otherwise the
  // previous chapter's ribbons would fade out at stale positions or be matched
  // against this chapter's.
  const chapterIdRef = useRef("");
  const signatureRef = useRef("");

  // Drop a ribbon after its fade-out.
  const removeRibbon = (key: string) => {
    exitTimers.current.delete(key);
    renderedRef.current = renderedRef.current.filter((r) => r.key !== key);
    setRibbons(renderedRef.current);
  };

  // Measure the highlighted runs' live text geometry and turn each into a
  // rounded ribbon path drawn behind the text by the SVG layer. Runs after
  // every render (highlights/chapter/settings changes re-render this component)
  // and on reflow via the ResizeObserver below. The signature guard keeps the
  // measure -> setState -> re-render cycle from looping.
  const measureRibbons = () => {
    const content = contentRef.current;
    if (!content) return;

    // This component is reused as the reader navigates. When the chapter changes,
    // drop the previous chapter's ribbon bookkeeping so its ribbons don't fade
    // out at stale positions or get matched against this chapter's runs.
    const chapter = chapterData.value;
    const chapterId = chapter
      ? `${chapter.translation.id}:${chapter.book.id}:${chapter.chapter.number}`
      : "";
    if (chapterId !== chapterIdRef.current) {
      chapterIdRef.current = chapterId;
      renderedRef.current = [];
      prevCoverageRef.current = new Set();
      signatureRef.current = "";
      exitTimers.current.forEach((id) => clearTimeout(id));
      exitTimers.current.clear();
    }

    const box = content.getBoundingClientRect();
    const style = getComputedStyle(content);
    const fontSize = parseFloat(style.fontSize) || 16;
    const radius = RIBBON_RADIUS_EM * fontSize;
    const padX = RIBBON_PAD_X_EM * fontSize;
    // Line pitch (slot height) so a run's outer edges fill their line slots and
    // adjacent ribbons meet with no leading gap. Only used for single-line runs;
    // multi-line runs derive the pitch from their measured lines. Guard against a
    // non-px / "normal" computed line-height by falling back to ~1.5em.
    const computedPitch = parseFloat(style.lineHeight);
    const linePitch = computedPitch > fontSize ? computedPitch : fontSize * 1.5;
    const rtl = style.direction === "rtl";

    // Phase 1: measure every highlighted run's per-line geometry. `leadPad` /
    // `trailPad` default to padX and may be dropped to 0 below where the run's
    // edge sits alongside another verse's text on the same line.
    const runs = Array.from(
      content.querySelectorAll<HTMLElement>("[data-highlight-fill]")
    )
      .map((el, index) => ({
        el,
        key: el.getAttribute("data-highlight-key") || `i${index}`,
        fill: el.getAttribute("data-highlight-fill") ?? "",
        broadcast: el.getAttribute("data-highlight-broadcast") === "true",
        lines: collectLineRects(el, box.left, box.top),
        leadPad: padX,
        trailPad: padX,
      }))
      .filter((run) => run.fill !== "" && run.lines.length > 0);

    // Phase 2: where a run begins or ends mid-line — with another verse's text
    // right beside it on the same visual line — its horizontal pad would reach
    // over into that text. This happens whenever a highlighted verse starts (or
    // ends) partway along a line, whether the neighbour is a plain unhighlighted
    // verse ("...had your fill. ²⁷Do not work...") or a differently-colored
    // highlight abutting on the same line. Drop the pad on just that facing edge
    // so the ribbon stops at its own glyphs and leaves the verse-number margin as
    // a clean gutter. Every edge that faces a line break or the page margin keeps
    // its pad. `adjacentInlineRect` reports the neighbouring text on each side;
    // lead/trail map to the correct physical edge for RTL inside buildRibbonPath.
    const sharesLine = (r: RibbonRect, line: RibbonRect) =>
      r.top < line.bottom - 2 && r.bottom > line.top + 2;
    for (const run of runs) {
      const first = run.lines[0]!;
      const last = run.lines[run.lines.length - 1]!;
      const before = adjacentInlineRect(run.el, "before", box.left, box.top);
      const after = adjacentInlineRect(run.el, "after", box.left, box.top);
      if (before && sharesLine(before, first)) run.leadPad = 0;
      if (after && sharesLine(after, last)) run.trailPad = 0;
    }

    const next: Array<{
      key: string;
      d: string;
      fill: string;
      broadcast: boolean;
      first: number;
      last: number;
    }> = [];
    for (const run of runs) {
      const d = buildRibbonPath(run.lines, radius, padX, linePitch, {
        leadPad: run.leadPad,
        trailPad: run.trailPad,
        rtl,
      });
      if (!d) continue;
      // Split the "5-8" range back to numbers for the coverage checks below, and
      // prefix the chapter so keys never collide across chapters.
      const dash = run.key.indexOf("-");
      const first = dash >= 0 ? Number(run.key.slice(0, dash)) : NaN;
      const last = dash >= 0 ? Number(run.key.slice(dash + 1)) : NaN;
      next.push({
        key: `${chapterId}:${run.key}`,
        d,
        fill: run.fill,
        broadcast: run.broadcast,
        first,
        last,
      });
    }

    const signature = JSON.stringify(next);
    if (signature === signatureRef.current) return;
    signatureRef.current = signature;

    // Reconcile with what's on screen. A run fades in only if none of its verses
    // were highlighted before, and fades out only if none are highlighted now;
    // otherwise it just reshaped (edit/reflow) -> snap.
    const liveCoverage = new Set<number>();
    for (const r of next) {
      for (let v = r.first; v <= r.last; v++) liveCoverage.add(v);
    }
    const prevCoverage = prevCoverageRef.current;
    const prevLiveKeys = new Set(
      renderedRef.current.filter((p) => !p.exiting).map((p) => p.key)
    );
    const liveKeys = new Set(next.map((r) => r.key));

    const result: Ribbon[] = next.map((r) => {
      const timer = exitTimers.current.get(r.key);
      if (timer !== undefined) {
        // Re-highlighted mid-fade — cancel its removal.
        clearTimeout(timer);
        exitTimers.current.delete(r.key);
      }
      // New key + no verse highlighted before = genuinely new -> fade in; a
      // reused key or already-highlighted verses (reshape) snaps.
      let enter = !prevLiveKeys.has(r.key);
      if (enter) {
        for (let v = r.first; v <= r.last; v++) {
          if (prevCoverage.has(v)) {
            enter = false;
            break;
          }
        }
      }
      return {
        key: r.key,
        d: r.d,
        fill: r.fill,
        broadcast: r.broadcast,
        first: r.first,
        last: r.last,
        enter,
        exiting: false,
      };
    });

    for (const prev of renderedRef.current) {
      if (liveKeys.has(prev.key)) continue;
      if (prev.exiting) {
        // Already fading out — keep it until its timer fires.
        if (exitTimers.current.has(prev.key)) result.push(prev);
        continue;
      }
      // Verses still highlighted elsewhere = reshaped/merged -> drop now, no
      // fade; otherwise it's a real removal -> fade out.
      let stillCovered = false;
      for (let v = prev.first; v <= prev.last; v++) {
        if (liveCoverage.has(v)) {
          stillCovered = true;
          break;
        }
      }
      if (stillCovered) continue;
      result.push({ ...prev, enter: false, exiting: true });
      const key = prev.key;
      exitTimers.current.set(
        key,
        window.setTimeout(() => removeRibbon(key), RIBBON_FADE_MS + 50)
      );
    }

    renderedRef.current = result;
    prevCoverageRef.current = liveCoverage;
    setRibbons(result);
  };

  useLayoutEffect(() => {
    measureRibbons();
  });

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measureRibbons());
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  // Clear pending fade-out timers on unmount.
  useLayoutEffect(() => {
    const timers = exitTimers.current;
    return () => {
      timers.forEach((id) => clearTimeout(id));
      timers.clear();
    };
  }, []);

  if (chapterData.value === null) {
    if (!initialChapterLoadSettled.value) {
      throw chapterDataPromise;
    }
    // The load finished and produced nothing. Rendering the error branch above
    // is the caller's job; throwing the (now-resolved) promise again would just
    // suspend and resume forever.
    return null;
  }

  const containerClasses = decorations.value
    .filter(
      (d) =>
        d.containerClassName &&
        d.bookId === chapterData.value?.book.id &&
        d.chapterNumber === chapterData.value?.chapter.number
    )
    .map((d) => d.containerClassName)
    .join(" ");

  return (
    <div
      ref={contentRef}
      className={`sb-chapter-content${
        props.isStale ? " sb-chapter-content-stale" : ""
      } ${containerClasses}`}
      onPointerDown={() => {
        justConvertedSelectionRef.current = false;
      }}
      onPointerUp={selectVersesFromTextSelection}
    >
      <svg className="sb-highlight-layer" aria-hidden="true">
        {ribbons.map((ribbon) => (
          <path
            key={ribbon.key}
            className={[
              "sb-highlight-ribbon",
              ribbon.enter ? "sb-highlight-ribbon-enter" : "",
              ribbon.broadcast ? "sb-highlight-ribbon-broadcast" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            d={ribbon.d}
            style={{
              fill: ribbon.fill,
              // Same colour on the stroke; the class decides how much of the
              // fill shows through.
              stroke: ribbon.broadcast ? ribbon.fill : undefined,
              opacity: ribbon.exiting ? 0 : undefined,
            }}
          />
        ))}
      </svg>
      {renderChapterContent(
        chapterData.value,
        (verse, event) => {
          // Swallow the click that trails a drag-to-select gesture so it
          // doesn't toggle the just-selected verse back off.
          if (justConvertedSelectionRef.current) {
            justConvertedSelectionRef.current = false;
            return;
          }
          selectVerse(verse, event.clientX, event.clientY);
        },
        selectedVerses.value,
        (noteId) => selectFootnote(noteId),
        highlights.value.highlights,
        decorations.value,
        chapterAnnotations,
        scriptureElements,
        onAnnotationVerseClick
      )}
    </div>
  );
}

export function BibleReader(props: BibleReaderProps) {
  const {
    currentSlot,
    readingState,
    selectorState,
    state,
    mobileChrome,
    sharedSession,
  } = props;
  const {
    translationId,
    translation,
    bookId,
    chapterNumber,
    availableTranslations,
    translationBooks,
    chapterData,
    selectedVerses,
    highlights,
    decorations,
    loading,
    isChapterContentStale,
    error,
    selectVerse,
    clearSelectedVerses,
    selectedFootnote,
    selectFootnote,
  } = readingState;

  if (import.meta.env.SSR && !readingState.initialChapterLoadSettled.value) {
    throw readingState.chapterDataPromise;
  }

  const currentBook = computed(
    () =>
      translationBooks.value?.books.find((book) => book.id === bookId.value) ??
      null
  );
  // The requested book wasn't found in this translation's book list — a
  // genuinely unrecognized book/name, or one absent from this specific
  // translation. `loadInitialData` deliberately stops rather than silently
  // substituting a different book's content once loading settles.
  const bookNotFound = computed(
    () =>
      !loading.value &&
      !error.value &&
      translationBooks.value !== null &&
      bookId.value !== null &&
      currentBook.value === null
  );
  // Display name for the header/title: the catalog entry's name, falling
  // back to the loaded chapter's own book record while the catalog is still
  // in flight. The book catalog and the chapter content load independently
  // (see `loadInitialData`'s comment on the raw position signals firing the
  // content effect before the catalog-backed check completes), so — same as
  // `SeedBibleStateManager`'s `resolveCurrentBook` for the document title —
  // `currentBook` can still be null here even after SSR has suspended on
  // (and resolved) `chapterDataPromise`. Without this, the header would show
  // the raw book id ("GEN") instead of its name whenever that race lands the
  // chapter first.
  const currentBookName = computed(
    () => currentBook.value?.name ?? chapterData.value?.book.name ?? null
  );
  const translationLicenseNotice = computed(
    () => translation.value?.licenseNotice?.trim() ?? ""
  );
  const translationWebsite = computed(
    () => translation.value?.website.trim() ?? ""
  );

  const isMobile = state?.app.isMobile.value ?? false;

  // Clicking an annotated verse number selects the verse (like clicking its
  // text does) and jumps straight to its note: expands and scrolls to it in
  // the mobile verse toolbar, or opens/scrolls the Discover pane on desktop,
  // where that toolbar isn't used.
  const handleAnnotationVerseClick = (
    verse: BibleSelectedVerse,
    verseNumber: number,
    event: MouseEvent
  ) => {
    // The <sup> sits inside the verse's own clickable <span>; stop the tap
    // here so selectVerse (a toggle) doesn't run twice and immediately undo
    // itself.
    event.stopPropagation();
    selectVerse(verse, event.clientX, event.clientY);
    if (!state) {
      return;
    }

    if (isMobile) {
      readingState.pendingAnnotationScrollVerse.value = verseNumber;
      return;
    }

    // Set the target before (maybe) opening: if Discover is already open,
    // openDiscover() would just toggle it *closed* — only open when it isn't
    // already showing, and let the effect in AnnotationsSection react to the
    // target either way.
    state.discover.scrollToVerse.value = {
      bookId: verse.bookId,
      chapterNumber: verse.chapterNumber,
      verseNumber,
    };
    if (!state.discover.isDiscoverOpen.value) {
      state.app.openDiscover();
    }
  };

  // Reader glyph size is its own knob, independent of the UI-scale (`rem`)
  // system. Anchoring `.sb-font-size-*` here (rather than on the chrome root)
  // keeps `.sb-chapter-content { font-size: 1em }` and reader-`em` spacing
  // tied to the reader setting, while chrome inherits the UI scale from `html`.
  const readerFontSizeClass = `sb-font-size-${(
    state?.settings?.settings.value.fontSize ?? "M"
  ).toLowerCase()}`;

  // Hard-gated off under SSR, which is what keeps both the dimming and the
  // placeholder out of the served HTML. Rendering the placeholder server-side
  // would strip the scripture out of the document — for a Bible reader that is
  // an SEO regression, not a cosmetic one. The reader suspends on
  // `chapterDataPromise` there instead, so by render time there is either
  // content or a settled failure.
  const isContentStale = !import.meta.env.SSR && isChapterContentStale.value;
  // Held back by `CHAPTER_SKELETON_DELAY_MS` so a fast navigation shows only
  // dimmed text, never a flash of placeholder. Skipped when there is no chapter
  // on screen to dim — a cold start would otherwise sit blank for the delay.
  const [isWaitLong, setIsWaitLong] = useState(false);
  useEffect(() => {
    if (!isContentStale) {
      setIsWaitLong(false);
      return;
    }
    const timer = window.setTimeout(
      () => setIsWaitLong(true),
      CHAPTER_SKELETON_DELAY_MS
    );
    return () => window.clearTimeout(timer);
  }, [isContentStale]);

  const showChapterSkeleton =
    isContentStale && (chapterData.value === null || isWaitLong);
  const dimStaleChapter = isContentStale && !showChapterSkeleton;

  const { t } = useI18n();
  const scriptureElements: ScriptureElementsBehavior =
    props.scriptureElements ??
      state?.settings?.settings.value.scriptureElements ?? {
        showHeadings: true,
        showVerseNumbers: true,
        showFootnotes: true,
        showHighlights: true,
        showRedLettering: true,
      };

  const openBookSelector = () => {
    selectorState.selectingTranslation.value = false;
    void selectorState.setOpen(true, currentSlot);
  };
  const openTranslationSelector = async () => {
    await selectorState.setOpen(true, currentSlot);
    selectorState.selectingTranslation.value = true;
  };

  // True for the click that trails a drag-to-select gesture, so the verse's
  // own onClick doesn't toggle the verse back off after we've just selected
  // it from the text selection. Reset at the start of every new gesture.
  const justConvertedSelectionRef = useRef(false);

  // Turn a native text selection (mouse drag on desktop, touch text-selection
  // on mobile) into an app verse selection: select every verse the selection
  // touches — exactly as if the user had clicked each of them — which opens
  // the verse toolbar. No-op for a collapsed/empty selection, so plain taps
  // keep their single-verse toggle behaviour.
  const selectVersesFromTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }
    const data = chapterData.value;
    if (!data) return;

    const range = selection.getRangeAt(0);
    const ancestor =
      range.commonAncestorContainer instanceof Element
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement;
    const root = ancestor?.closest(".sb-chapter-content");
    if (!root) return;

    const verseEls = Array.from(
      root.querySelectorAll<HTMLElement>(".sb-verse[data-verse-number]")
    ).filter((el) => range.intersectsNode(el));
    if (verseEls.length === 0) return;

    // verse number -> full ChapterVerse, so we can rebuild selection entries.
    const verseByNumber = new Map<number, ChapterVerse>();
    for (const entry of data.chapter.content) {
      if (
        entry &&
        typeof entry === "object" &&
        entry.type === "verse" &&
        typeof entry.number === "number"
      ) {
        verseByNumber.set(entry.number, entry as ChapterVerse);
      }
    }

    // Anchor the floating verse toolbar near the selected text.
    const rect = range.getBoundingClientRect();
    const anchorX = rect.left + rect.width / 2;
    const anchorY = rect.top;

    // Drop the native selection so only the app's verse highlight shows and
    // the trailing click can't toggle a verse back off.
    selection.removeAllRanges();
    justConvertedSelectionRef.current = true;

    // Mirror clicking each covered verse: deselect everything, then reselect.
    clearSelectedVerses();
    for (const el of verseEls) {
      const verseValue = verseByNumber.get(Number(el.dataset.verseNumber));
      if (!verseValue) continue;
      selectVerse(
        {
          bookId: data.book.id,
          chapterNumber: data.chapter.number,
          verse: verseValue,
          translationId: data.translation.id,
        },
        anchorX,
        anchorY
      );
    }
  };

  const renderMobileChapterTitle = (
    bookName: string,
    chapter: number | string
  ) => (
    <h2 className="sb-bible-reader-mobile-content-title">
      <span className="sb-bible-reader-book">{bookName}</span>
      <span className="sb-bible-reader-chapter">{chapter}</span>
    </h2>
  );

  /**
   * Placeholder shown in place of the verses while the chapter the reader has
   * navigated to is still downloading. Without it, a fast skim shows the *old*
   * chapter's text under the new chapter's title, which reads as though the
   * navigation silently failed.
   */
  const renderChapterSkeleton = () => (
    <SkeletonContainer
      label={t("loading-chapter", { defaultValue: "Loading chapter…" })}
      className="sb-chapter-content sb-chapter-skeleton"
    >
      <Skeleton shape="block" width="42%" />
      {CHAPTER_SKELETON_PARAGRAPHS.map((widths, paragraph) => (
        <div className="sb-chapter-skeleton-paragraph" key={paragraph}>
          {widths.map((width, line) => (
            <Skeleton shape="line" key={line} width={width} />
          ))}
        </div>
      ))}
    </SkeletonContainer>
  );

  // Keep the failure state on screen while a retry is in flight — `retryLoad()`
  // clears `error` as it starts, so without this the panel would flash back to
  // the (still empty) chapter body before the new request settles.
  const [retrying, setRetrying] = useState(false);
  const retryChapterLoad = async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      await readingState.retryLoad();
    } finally {
      setRetrying(false);
    }
  };
  const showLoadError = (!!error.value && !loading.value) || retrying;

  const renderMainContent = () => (
    <>
      {isMobile &&
        renderMobileChapterTitle(
          currentBookName.value ?? bookId.value ?? "",
          chapterNumber.value ?? ""
        )}

      {bookNotFound.value && (
        <div className="sb-reader-not-found">
          <span
            className="material-symbols-outlined sb-reader-not-found-icon"
            aria-hidden="true"
          >
            search_off
          </span>
          <p className="sb-reader-not-found-title">
            {t("book-not-found-title", { defaultValue: "Book not found" })}
          </p>
          <p className="sb-reader-not-found-body">
            {t("book-not-found-message", {
              defaultValue:
                "We couldn't find that book in {{translationName}}.",
              translationName:
                translation.value?.name ?? translationId.value ?? "",
            })}
          </p>
          {translationBooks.value?.books[0] && (
            <button
              type="button"
              className="sb-reader-not-found-action"
              onClick={() => {
                const firstBook = translationBooks.value!.books[0]!;
                void readingState.selectChapter(
                  firstBook.id,
                  firstBook.firstChapterNumber ?? 1
                );
              }}
            >
              {t("book-not-found-action", {
                defaultValue: "Go to {{bookName}} {{chapterNumber}}",
                bookName: translationBooks.value.books[0].name,
                chapterNumber:
                  translationBooks.value.books[0].firstChapterNumber ?? 1,
              })}
            </button>
          )}
        </div>
      )}

      {showLoadError && (
        <div className="sb-reader-error" role="alert">
          <span
            className="material-symbols-outlined sb-reader-error-icon"
            aria-hidden="true"
          >
            cloud_off
          </span>
          <h2 className="sb-reader-error-title">
            {t("chapter-unavailable", { defaultValue: "Chapter unavailable" })}
          </h2>
          <p className="sb-reader-error-message">
            {t("chapter-unavailable-description", {
              defaultValue:
                "We were unable to load the data for this chapter. Please check your internet connection and try again.",
            })}
          </p>
          <button
            type="button"
            className="sb-reader-error-retry"
            onClick={() => void retryChapterLoad()}
            disabled={retrying}
            aria-busy={retrying}
          >
            {retrying && (
              <span
                className="material-symbols-outlined sb-reader-error-retry-spinner"
                aria-hidden="true"
              >
                progress_activity
              </span>
            )}
            {t("reload", { defaultValue: "Reload" })}
          </button>
        </div>
      )}

      {!showLoadError &&
        !bookNotFound.value &&
        (showChapterSkeleton ? (
          renderChapterSkeleton()
        ) : (
          <Suspense
            fallback={
              <p>
                {t("no-chapter-content-found", {
                  defaultValue: "No chapter content found.",
                })}
              </p>
            }
          >
            <ChapterContent
              isStale={dimStaleChapter}
              chapterData={chapterData}
              chapterDataPromise={readingState.chapterDataPromise}
              initialChapterLoadSettled={readingState.initialChapterLoadSettled}
              selectedVerses={selectedVerses}
              selectVersesFromTextSelection={selectVersesFromTextSelection}
              justConvertedSelectionRef={justConvertedSelectionRef}
              highlights={highlights}
              decorations={decorations}
              annotations={state?.annotations}
              selectVerse={selectVerse}
              selectFootnote={selectFootnote}
              scriptureElements={scriptureElements}
              onAnnotationVerseClick={handleAnnotationVerseClick}
            />
          </Suspense>
        ))}

      {!availableTranslations.value && !showLoadError && (
        <p>
          {t("no-translations-available", {
            defaultValue: "No translations available.",
          })}
        </p>
      )}

      {!showLoadError && translationLicenseNotice.value.length > 0 && (
        <>
          <p className="sb-translation-license-notice">
            {translationLicenseNotice.value}
          </p>
          {translationWebsite.value.length > 0 && (
            <p className="sb-translation-website">
              <a
                href={translationWebsite.value}
                target="_blank"
                rel="noopener noreferrer"
              >
                {translationWebsite.value}
              </a>
            </p>
          )}
        </>
      )}

      {/* Undefined on desktop, where the caller renders this itself below the
          reader — the desktop pane is its own scroll container. */}
      {mobileChrome?.belowContent}
    </>
  );

  return (
    <div
      className={`sb-bible-reader ${readerFontSizeClass}${
        isMobile ? " sb-bible-reader-mobile" : ""
      }`}
      dir={translation.value?.textDirection ?? "auto"}
    >
      {isMobile && state ? (
        <>
          <div
            className={`sb-bible-reader-mobile-header${
              mobileChrome?.isScrolled
                ? " sb-bible-reader-mobile-header-hidden"
                : ""
            }`}
          >
            <div className="sb-bible-reader-mobile-header-text">
              <h1 className="sb-bible-reader-mobile-header-title">
                <span
                  className="sb-bible-reader-mobile-header-book"
                  onClick={openBookSelector}
                >
                  {currentBookName.value ?? bookId.value ?? ""}{" "}
                  {chapterNumber.value}
                </span>
                <span
                  className="sb-bible-reader-mobile-header-translation"
                  onClick={(e: MouseEvent) => {
                    e.stopPropagation();
                    openTranslationSelector();
                  }}
                >
                  {translation.value?.shortName ?? translationId.value ?? ""}
                </span>
              </h1>
            </div>
            <ChapterNotesButton
              state={state}
              bookId={bookId.value}
              chapterNumber={chapterNumber.value}
            />
            <div className="sb-bible-reader-mobile-header-actions">
              {!state.playlists.playing.value && (
                <ReaderBookmarkButton
                  state={state}
                  translationId={translationId.value}
                  bookId={bookId.value}
                  chapterNumber={chapterNumber.value}
                />
              )}
              <QuickToolbar
                toolsManager={state.tools}
                readingState={readingState}
                playlists={state.playlists}
                features={state.features}
                sharedSession={sharedSession ?? null}
                toast={state.app.toast}
                modals={state.modals}
                app={state.app}
                className="sb-quick-toolbar-mobile-header"
              />
              {sharedSession ? (
                <MobileSessionParticipants
                  state={state}
                  session={sharedSession}
                />
              ) : (
                <button
                  type="button"
                  className="sb-bible-reader-mobile-header-account"
                  aria-label={`Open account settings (${getSelfDisplayName(
                    state,
                    t
                  )})`}
                  // The reader pane wrapper selects the pane on pointerdown/click
                  // (which runs closeSidebarAndSettings). Stop the tap here so it
                  // doesn't immediately dismiss the account view we're opening.
                  onPointerDown={(e: PointerEvent) => e.stopPropagation()}
                  onClick={(e: MouseEvent) => {
                    e.stopPropagation();
                    state.sidebar.openSidebar();
                    state.sidebar.openSettingsToView("account");
                  }}
                >
                  <SelfAvatarVisual state={state} />
                </button>
              )}
              <button
                type="button"
                className="sb-bible-reader-mobile-header-settings"
                onClick={() => mobileChrome?.onOpenMobileSettings()}
                aria-label={t("settings", { defaultValue: "Settings" })}
                title={t("settings", { defaultValue: "Settings" })}
              >
                <InfoSettingsIcon />
              </button>
            </div>
          </div>

          <div
            ref={mobileChrome?.swipeViewportRef}
            className="sb-reader-swipe-viewport"
          >
            <div
              ref={mobileChrome?.swipeTrackRef}
              className="sb-reader-swipe-track"
            >
              <div
                className="sb-reader-swipe-panel sb-reader-swipe-panel-side"
                aria-hidden="true"
              >
                {mobileChrome?.prevChapterPreview &&
                  renderMobileChapterTitle(
                    mobileChrome.prevChapterPreview.book.name,
                    mobileChrome.prevChapterPreview.chapter.number
                  )}
                <div className="sb-chapter-content">
                  {renderStaticChapterContent(
                    mobileChrome?.prevChapterPreview ?? null,
                    scriptureElements
                  )}
                </div>
              </div>
              <div
                ref={mobileChrome?.currentScrollerRefCallback}
                className="sb-reader-swipe-panel sb-reader-swipe-panel-current"
              >
                {renderMainContent()}
              </div>
              <div
                className="sb-reader-swipe-panel sb-reader-swipe-panel-side"
                aria-hidden="true"
              >
                {mobileChrome?.nextChapterPreview &&
                  renderMobileChapterTitle(
                    mobileChrome.nextChapterPreview.book.name,
                    mobileChrome.nextChapterPreview.chapter.number
                  )}
                <div className="sb-chapter-content">
                  {renderStaticChapterContent(
                    mobileChrome?.nextChapterPreview ?? null,
                    scriptureElements
                  )}
                </div>
              </div>
            </div>
          </div>

          {mobileChrome?.showMobileSettings && (
            <MobileSettingsSheet
              state={state}
              onClose={() => mobileChrome.onCloseMobileSettings()}
              onOpenAllSettings={() => mobileChrome.onOpenAllSettings()}
            />
          )}
        </>
      ) : (
        <>
          <div className="sb-bible-reader-header">
            <h2
              {...flingSafeTapHandlers(() => {
                void selectorState.setOpen(true, currentSlot);
              })}
              className="sb-bible-reader-title"
            >
              <span className="sb-bible-reader-book">
                {currentBookName.value ?? bookId.value ?? "Select a book"}
              </span>
              <span className="sb-bible-reader-title-sep" aria-hidden="true">
                {" "}
              </span>
              <span className="sb-bible-reader-chapter">
                {chapterNumber.value}
              </span>
              <span className="sb-bible-reader-translation">
                <span aria-hidden="true">{" / "}</span>
                <span aria-label={translation.value?.name ?? ""}>
                  {translationId.value ?? ""}
                </span>
              </span>
            </h2>
            {state && (
              <div className="sb-bible-reader-actions">
                <QuickToolbar
                  toolsManager={state.tools}
                  readingState={readingState}
                  playlists={state.playlists}
                  features={state.features}
                  sharedSession={sharedSession ?? null}
                  toast={state.app.toast}
                  modals={state.modals}
                  app={state.app}
                  className="sb-quick-toolbar-reader"
                />
                {!state.playlists.playing.value && (
                  <ReaderBookmarkButton
                    state={state}
                    translationId={translationId.value}
                    bookId={bookId.value}
                    chapterNumber={chapterNumber.value}
                  />
                )}
              </div>
            )}
          </div>
          {renderMainContent()}
        </>
      )}

      {scriptureElements.showFootnotes && selectedFootnote.value !== null && (
        <div
          className="sb-footnote-modal-overlay"
          onClick={() => {
            selectFootnote(null);
          }}
        >
          <div
            className="sb-footnote-modal"
            onClick={(event: MouseEvent) => {
              event.stopPropagation();
            }}
          >
            <div className="sb-footnote-modal-header">
              <h3 className="sb-footnote-modal-title">
                {selectedFootnote.value.chapter.book.name}{" "}
                {selectedFootnote.value.chapter.chapter.number}
                {selectedFootnote.value.verse
                  ? ":" + selectedFootnote.value.verse.number
                  : ""}
              </h3>
              <button
                className="sb-footnote-modal-close"
                aria-label={t("close-footnote", {
                  defaultValue: "Close footnote",
                })}
                onClick={() => {
                  selectFootnote(null);
                }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="sb-footnote-modal-content">
              <VerseReferenceText
                text={selectedFootnote.value.note.text}
                books={translationBooks.value?.books}
                onReferenceClick={(ref) => {
                  selectFootnote(null);
                  void state?.app.openVerseReference(ref);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
