import "./BibleReader.css";
import {
  type TranslationBookChapter,
  type ChapterVerse,
} from "../../managers/FreeUseBibleAPI";
import type { JSX } from "preact";
import { Suspense, useRef, useLayoutEffect, useState } from "preact/compat";
import { computed, type ReadonlySignal, type Signal } from "@preact/signals";
import {
  buildRibbonPath,
  collectLineRects,
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
import type { BibleReadingSession } from "../../managers/SessionsManager";
import { useI18n } from "../../i18n/I18nManager";
import { MobileSettingsSheet } from "../../components/MobileSettingsSheet/MobileSettingsSheet";
import { MobileSessionParticipants } from "../../components/SessionParticipants/SessionParticipants";
import { InfoSettingsIcon } from "../../components/icons";
import { QuickToolbar } from "../../components/QuickToolbar/QuickToolbar";
import { SelfAvatarVisual, getSelfDisplayName } from "../Tabs/Tabs";

interface ReaderBookmarkButtonProps {
  state: SeedBibleState;
  translationId: string | null;
  bookId: string | null;
  chapterNumber: number | null;
}

/**
 * Toggle for the chapter currently shown in the reader. Sits in the top-right
 * of the chapter content area: filled + orange when the chapter is saved,
 * outlined when not. The per-tab-row bookmark button was removed in favor of
 * this single control because only one chapter is ever in view at a time.
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
        if (!canBookmark) return;
        void state.bookmarks.toggleBookmarkAtLocation(
          translationId,
          bookId,
          chapterNumber
        );
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

function renderChapterContent(
  chapterData: TranslationBookChapter | null,
  onVerseClick: (verse: BibleSelectedVerse, event: MouseEvent) => void,
  selectedVerses: BibleSelectedVerse[],
  onOpenFootnote: (noteId: number, verse: ChapterVerse | null) => void,
  highlights: ChapterHighlight[],
  decorations: VerseDecoration[],
  scriptureElements: ScriptureElementsBehavior
) {
  if (!chapterData) {
    return null;
  }

  const getVerseHighlight = (verseNumber: number): ChapterHighlight | null => {
    for (const highlight of highlights) {
      if (typeof highlight.verse === "number") {
        if (highlight.verse === verseNumber) {
          return highlight;
        }
        continue;
      }

      const [start, end] = highlight.verse;
      if (verseNumber >= start && verseNumber <= end) {
        return highlight;
      }
    }

    return null;
  };

  // The highlight background is drawn behind the text by the ribbon layer (see
  // ChapterContent), so a highlighted run's wrapper paints no background itself.
  // It only carries the readable font color and a `fill` (a CSS-var reference for
  // preset colors, or the custom hex) that the layer reads back off the DOM.
  const getHighlightPresentation = (highlight: ChapterHighlight | null) => {
    if (!highlight) {
      return {
        className: "",
        style: undefined as JSX.CSSProperties | undefined,
        fill: null as string | null,
      };
    }

    if (highlight.customColor && highlight.customFontColor) {
      return {
        className: "sb-highlight",
        style: { color: highlight.customFontColor } as JSX.CSSProperties,
        fill: highlight.customColor,
      };
    }

    return {
      className: `sb-highlight sb-highlight-${highlight.colorId}`,
      style: undefined as JSX.CSSProperties | undefined,
      fill: `var(--sb-highlight-${highlight.colorId}-color)`,
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

  const getHighlightColorKey = (highlight: ChapterHighlight | null) => {
    if (!highlight) {
      return null;
    }
    if (highlight.customColor && highlight.customFontColor) {
      return `custom:${highlight.customColor}:${highlight.customFontColor}`;
    }
    return highlight.colorId;
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
          onClick={(event: MouseEvent) => {
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
                  {segIndex === 0 && scriptureElements.showVerseNumbers && (
                    <sup className="sb-verse-number">{value.number}</sup>
                  )}
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
                    scriptureElements.showVerseNumbers && (
                      <sup className="sb-verse-number">{value.number}</sup>
                    )}
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
          {scriptureElements.showVerseNumbers && (
            <sup className="sb-verse-number">{value.number}</sup>
          )}
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
      i += 1;
      continue;
    }

    if (entry.type === "line_break") {
      nodes.push(<div key={`break-${i}`} className="sb-line-break" />);
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
      i += 1;
      continue;
    }

    if (isVerseEntry(entry)) {
      const highlight = scriptureElements.showHighlights
        ? getVerseHighlight(entry.number)
        : null;
      const colorKey = getHighlightColorKey(highlight);

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
          const nextKey = getHighlightColorKey(
            scriptureElements.showHighlights
              ? getVerseHighlight(next.number)
              : null
          );
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
        >
          {runIndices.map((idx) =>
            renderVerseNode(entries[idx] as ChapterVerse, idx)
          )}
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
  swipeViewportRefCallback: (el: HTMLDivElement | null) => void;
  swipeTrackRefCallback: (el: HTMLDivElement | null) => void;
  currentScrollerRefCallback: (el: HTMLDivElement | null) => void;
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
    scriptureElements
  );
}

// One drawn highlight ribbon. `key` is the run's verse range ("5-8"); `first`/
// `last` are it as numbers (coverage checks). `enter` = fade in (a new highlight,
// not a reshape); `exiting` = fading out before removal.
interface Ribbon {
  key: string;
  d: string;
  fill: string;
  first: number;
  last: number;
  enter: boolean;
  exiting: boolean;
}
const RIBBON_FADE_MS = 250;

interface ChapterContentProps {
  chapterData: Signal<TranslationBookChapter | null>;
  chapterDataPromise: Promise<void>;
  selectedVerses: Signal<BibleSelectedVerse[]>;
  highlights: ReadonlySignal<ChapterHighlights>;
  decorations: ReadonlySignal<VerseDecoration[]>;
  selectVerse: (
    verse: BibleSelectedVerse,
    selectionX: number,
    selectionY: number
  ) => void;
  selectVersesFromTextSelection: () => void;
  justConvertedSelectionRef: { current: boolean };
  selectFootnote: (noteId: number | null) => void;
  scriptureElements: ScriptureElementsBehavior;
}

function ChapterContent(props: ChapterContentProps) {
  const {
    chapterData,
    chapterDataPromise,
    selectedVerses,
    highlights,
    decorations,
    selectVerse,
    selectFootnote,
    selectVersesFromTextSelection,
    justConvertedSelectionRef,
    scriptureElements,
  } = props;

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
    // `trailPad` default to padX and may be dropped to 0 below where two colors
    // abut horizontally.
    const runs = Array.from(
      content.querySelectorAll<HTMLElement>("[data-highlight-fill]")
    )
      .map((el, index) => ({
        key: el.getAttribute("data-highlight-key") || `i${index}`,
        fill: el.getAttribute("data-highlight-fill") ?? "",
        lines: collectLineRects(el, box.left, box.top),
        leadPad: padX,
        trailPad: padX,
      }))
      .filter((run) => run.fill !== "" && run.lines.length > 0);

    // Phase 2: where two different-colored runs sit side by side on the same
    // visual line (e.g. "...garden, ³but about..."), their facing pads would eat
    // the small gap the verse-number margin leaves and the colors would nearly
    // touch (and, when they overlap, the rounded ends read as points). Drop the
    // pad on just those two facing edges — the earlier run's trailing edge (where
    // it ends) and the later run's leading edge (where the next starts) — so that
    // margin reads as a clean gutter. In RTL the earlier run sits to the right of
    // the later one, so the gap is measured on the mirrored sides. Only
    // consecutive runs that actually abut (a sub-em gap, not an unhighlighted
    // verse between them) are trimmed.
    const abutMax = fontSize; // ~1em: covers the verse-number margin, far under a verse's width
    for (let k = 1; k < runs.length; k++) {
      const prev = runs[k - 1]!;
      const cur = runs[k]!;
      if (prev.fill === cur.fill) continue;
      const prevLast = prev.lines[prev.lines.length - 1]!;
      const curFirst = cur.lines[0]!;
      const sharesLine =
        curFirst.top < prevLast.bottom - 2 &&
        prevLast.top < curFirst.bottom - 2;
      // Reading-order gap between where `prev` ends and `cur` begins: in LTR that
      // is prev's right edge to cur's left edge; in RTL it mirrors.
      const gap = rtl
        ? prevLast.left - curFirst.right
        : curFirst.left - prevLast.right;
      if (sharesLine && gap >= 0 && gap < abutMax) {
        prev.trailPad = 0;
        cur.leadPad = 0;
      }
    }

    const next: Array<{
      key: string;
      d: string;
      fill: string;
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
    throw chapterDataPromise;
  }

  return (
    <div
      ref={contentRef}
      className="sb-chapter-content"
      onPointerDown={() => {
        justConvertedSelectionRef.current = false;
      }}
      onPointerUp={selectVersesFromTextSelection}
    >
      <svg className="sb-highlight-layer" aria-hidden="true">
        {ribbons.map((ribbon) => (
          <path
            key={ribbon.key}
            className={
              ribbon.enter
                ? "sb-highlight-ribbon sb-highlight-ribbon-enter"
                : "sb-highlight-ribbon"
            }
            d={ribbon.d}
            style={{
              fill: ribbon.fill,
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
        scriptureElements
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
    error,
    selectVerse,
    clearSelectedVerses,
    selectedFootnote,
    selectFootnote,
  } = readingState;

  if (!chapterData.value && import.meta.env.SSR) {
    throw readingState.chapterDataPromise;
  }

  const currentBook = computed(
    () =>
      translationBooks.value?.books.find((book) => book.id === bookId.value) ??
      null
  );
  const translationLicenseNotice = computed(
    () => translation.value?.licenseNotice?.trim() ?? ""
  );
  const translationWebsite = computed(
    () => translation.value?.website.trim() ?? ""
  );

  const isMobile = state?.app.isMobile.value ?? false;

  // Reader glyph size is its own knob, independent of the UI-scale (`rem`)
  // system. Anchoring `.sb-font-size-*` here (rather than on the chrome root)
  // keeps `.sb-chapter-content { font-size: 1em }` and reader-`em` spacing
  // tied to the reader setting, while chrome inherits the UI scale from `html`.
  const readerFontSizeClass = `sb-font-size-${(
    state?.config?.config.value.fontSize ?? "M"
  ).toLowerCase()}`;

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

  const renderMainContent = () => (
    <>
      {isMobile &&
        renderMobileChapterTitle(
          currentBook.value?.name ?? bookId.value ?? "",
          chapterNumber.value ?? ""
        )}

      {error.value && !loading.value && (
        <p className="sb-reader-error">{error.value}</p>
      )}

      {!error.value && (
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
            chapterData={chapterData}
            chapterDataPromise={readingState.chapterDataPromise}
            selectedVerses={selectedVerses}
            selectVersesFromTextSelection={selectVersesFromTextSelection}
            justConvertedSelectionRef={justConvertedSelectionRef}
            highlights={highlights}
            decorations={decorations}
            selectVerse={selectVerse}
            selectFootnote={selectFootnote}
            scriptureElements={scriptureElements}
          />
        </Suspense>
      )}

      {!availableTranslations.value && !error.value && (
        <p>
          {t("no-translations-available", {
            defaultValue: "No translations available.",
          })}
        </p>
      )}

      {!error.value && translationLicenseNotice.value.length > 0 && (
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
                  {currentBook.value?.name ?? bookId.value ?? ""}{" "}
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
            <QuickToolbar
              toolsManager={state.tools}
              readingState={readingState}
              playlists={state.playlists}
              features={state.features}
              className="sb-quick-toolbar-mobile-header"
            />
            {!state.playlists.playing.value && (
              <ReaderBookmarkButton
                state={state}
                translationId={translationId.value}
                bookId={bookId.value}
                chapterNumber={chapterNumber.value}
              />
            )}
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
                  state
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

          <div
            ref={mobileChrome?.swipeViewportRefCallback}
            className="sb-reader-swipe-viewport"
          >
            <div
              ref={mobileChrome?.swipeTrackRefCallback}
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
              onClick={() => selectorState.setOpen(true, currentSlot)}
              className="sb-bible-reader-title"
            >
              <span className="sb-bible-reader-book">
                {currentBook.value?.name ?? bookId.value ?? "Select a book"}
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
              {selectedFootnote.value.note.text}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
