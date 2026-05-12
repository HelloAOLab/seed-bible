import {
  type TranslationBookChapter,
  type ChapterVerse,
} from "seed-bible.managers.FreeUseBibleAPI";
import type { JSX } from "preact";
import { batch, computed, effect } from "@preact/signals";
import type {
  BibleReadingState,
  BibleSelectedVerse,
  DiscoverCrossReferenceResultWithBookData,
  DiscoverReferenceWithBookData,
  DiscoverStudyNoteResultWithBookData,
  VerseDecoration,
} from "seed-bible.managers.BibleReadingManager";
import type { ChapterHighlight } from "seed-bible.managers.HighlightsManager";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
import type { Pane } from "seed-bible.managers.PanesManager";
import type { ScriptureElementsBehavior } from "seed-bible.managers.SettingsManager";
import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";
import { useI18n } from "seed-bible.i18n.I18nManager";
import { MobileSettingsSheet } from "seed-bible.components.MobileSettingsSheet";
import { InfoSettingsIcon } from "seed-bible.components.icons";

const { useEffect, useRef, useState } = os.appHooks;

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

type DiscoveredCrossReferences =
  BibleReadingState["discoveredCrossReferences"]["value"];
type DiscoveredStudyNotes = BibleReadingState["discoveredStudyNotes"]["value"];

interface VerseCrossReferenceItem {
  id: string;
  ref: DiscoverCrossReferenceResultWithBookData;
  label: string;
  link: string;
}

interface VerseStudyNoteItem {
  id: string;
  note: DiscoverStudyNoteResultWithBookData;
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

function formatCrossReferenceLabel(
  reference: DiscoverReferenceWithBookData
): string {
  const bookName = reference.book;
  const verseStart = reference.verse;
  const verseEnd = reference.endVerse;
  const chapterStart = reference.chapter;
  const chapterEnd = reference.endChapter;
  const nbsp = "\u00A0";

  if (typeof verseStart !== "number") {
    if (typeof chapterEnd === "number" && chapterEnd > chapterStart) {
      return `${bookName}${nbsp}${chapterStart}-${chapterEnd}`;
    }

    return `${bookName}${nbsp}${chapterStart}`;
  }

  if (
    typeof chapterEnd === "number" &&
    chapterEnd !== chapterStart &&
    typeof verseEnd === "number"
  ) {
    return `${bookName}${nbsp}${chapterStart}:${verseStart}-${chapterEnd}:${verseEnd}`;
  }

  if (typeof verseEnd === "number" && verseEnd !== verseStart) {
    return `${bookName}${nbsp}${chapterStart}:${verseStart}-${verseEnd}`;
  }

  return `${bookName}${nbsp}${chapterStart}:${verseStart}`;
}

function getVerseCrossReferences(
  discoveredCrossReferences: DiscoveredCrossReferences,
  verseNumber: number
): VerseCrossReferenceItem[] {
  const seen = new Set<string>();
  const items: VerseCrossReferenceItem[] = [];

  for (const providerResults of discoveredCrossReferences) {
    for (const result of providerResults.results) {
      if (result.reference.verse !== verseNumber) {
        continue;
      }

      const label = formatCrossReferenceLabel(result.crossReference);
      if (seen.has(label)) {
        continue;
      }

      const link = new URL(configBot.tags.url);
      link.searchParams.set("book", result.crossReference.book);
      link.searchParams.set("chapter", String(result.crossReference.chapter));
      link.searchParams.set("verse", String(result.crossReference.verse));

      seen.add(label);
      items.push({
        id: `${providerResults.providerId}-${label}`,
        ref: result,
        label,
        link: link.href,
      });
    }
  }

  return items;
}

function getVerseStudyNotes(
  discoveredStudyNotes: DiscoveredStudyNotes,
  verseNumber: number
): VerseStudyNoteItem[] {
  const items: VerseStudyNoteItem[] = [];

  for (const providerResults of discoveredStudyNotes) {
    for (const result of providerResults.results) {
      if (result.reference.verse !== verseNumber) {
        continue;
      }

      items.push({
        id: `${providerResults.providerId}-${verseNumber}-${items.length}`,
        note: result,
      });
    }
  }

  return items;
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

  const getHighlightPresentation = (highlight: ChapterHighlight | null) => {
    if (!highlight) {
      return {
        className: "",
        style: undefined,
      } as const;
    }

    if (highlight.customColor && highlight.customFontColor) {
      return {
        className: "",
        style: {
          backgroundColor: highlight.customColor,
          color: highlight.customFontColor,
        },
      } as const;
    }

    return {
      className: ` sb-highlight-${highlight.colorId}`,
    } as const;
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

  const entries = chapterData.chapter.content;
  return entries.map((entry, entryIndex) => {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    const value = entry;

    if (value.type === "heading" && Array.isArray(value.content)) {
      if (!scriptureElements.showHeadings) {
        return null;
      }
      const heading = (value.content as unknown[])
        .filter((item) => typeof item === "string")
        .join(" ");
      return (
        <h3 key={`heading-${entryIndex}`} className="sb-chapter-heading">
          {heading}
        </h3>
      );
    }

    if (value.type === "line_break") {
      return <div key={`break-${entryIndex}`} className="sb-line-break" />;
    }

    if (value.type === "hebrew_subtitle" && Array.isArray(value.content)) {
      return (
        <p key={`subtitle-${entryIndex}`} className="sb-subtitle">
          {value.content.map((part, index) =>
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
    }

    if (
      value.type === "verse" &&
      typeof value.number === "number" &&
      Array.isArray(value.content)
    ) {
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
      const highlight = scriptureElements.showHighlights
        ? getVerseHighlight(value.number)
        : null;
      const highlightPresentation = getHighlightPresentation(highlight);
      const verseDecorations = getVerseDecorations(value.number);
      const decorationPresentation =
        getDecorationPresentation(verseDecorations);
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
        highlightPresentation.className.trim(),
        decorationPresentation.className.trim(),
      ]
        .filter(Boolean)
        .join(" ");
      const verseDecoratorStyle = {
        ...(highlightPresentation.style ?? {}),
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
    }

    return null;
  });
}

interface BibleReaderProps {
  currentPane: Pane;
  readingState: BibleReadingState;
  selectorState: BibleSelectorState;
  scriptureElements?: ScriptureElementsBehavior;
  state?: SeedBibleState;
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

function renderCrossReferenceLayer(
  chapterData: TranslationBookChapter | null,
  discoveredCrossReferences: DiscoveredCrossReferences,
  verseOffsets: Record<number, number>,
  onOpenCrossReference: (ref: DiscoverCrossReferenceResultWithBookData) => void
) {
  if (!chapterData) {
    return null;
  }

  const verseEntries = chapterData.chapter.content.filter(
    (
      entry
    ): entry is Extract<
      TranslationBookChapter["chapter"]["content"][number],
      { type: "verse"; number: number; content: ChapterVerse["content"] }
    > =>
      !!entry &&
      typeof entry === "object" &&
      entry.type === "verse" &&
      typeof entry.number === "number" &&
      Array.isArray(entry.content)
  );

  console.log(
    "Rendering cross reference layer with verse offsets:",
    verseOffsets
  );

  const maxCrossReferencesPerVerse = 3;
  const verseGapThreshold = 20;
  const estimatedVerseRowHeight = 16;

  type VerseCrossReferenceGroupItem = {
    verseNumber: number;
    top: number;
    references: VerseCrossReferenceItem[];
  };

  const verseItems = verseEntries
    .map((entry) => {
      const verseCrossReferences = getVerseCrossReferences(
        discoveredCrossReferences,
        entry.number
      ).slice(0, maxCrossReferencesPerVerse);

      if (verseCrossReferences.length === 0) {
        return null;
      }

      return {
        verseNumber: entry.number,
        top: verseOffsets[entry.number] ?? 0,
        references: verseCrossReferences,
      };
    })
    .filter((item): item is VerseCrossReferenceGroupItem => !!item)
    .sort((left, right) => left.top - right.top);

  if (verseItems.length === 0) {
    return null;
  }

  const groups: Array<{
    top: number;
    verses: VerseCrossReferenceGroupItem[];
  }> = [];

  for (const item of verseItems) {
    const currentGroup = groups[groups.length - 1];
    const previousVerse = currentGroup?.verses[currentGroup.verses.length - 1];

    if (
      !currentGroup ||
      !previousVerse ||
      item.top - previousVerse.top > verseGapThreshold
    ) {
      groups.push({
        top: item.top,
        verses: [item],
      });
      continue;
    }

    currentGroup.verses.push(item);
  }

  return (
    <div className="sb-cross-reference-layer" aria-hidden="true">
      {groups.map((group) => (
        <div
          key={`cross-reference-group-${group.verses[0]?.verseNumber}`}
          className="sb-cross-reference-group"
          style={{ top: `${group.top}px` }}
        >
          {group.verses.map((verse) => {
            return (
              <div
                key={`cross-reference-verse-${verse.verseNumber}`}
                className="sb-cross-reference-verse"
              >
                <div className="sb-cross-reference-verse-row">
                  <span className="sb-cross-reference-spacer"></span>
                  <span className="sb-verse-cross-reference-number">
                    v{verse.verseNumber}
                  </span>
                  {verse.references.map((crossReference) => (
                    <>
                      <a
                        key={crossReference.id}
                        href={crossReference.link}
                        className="sb-verse-cross-reference"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onOpenCrossReference(crossReference.ref);
                        }}
                      >
                        {crossReference.label}
                      </a>{" "}
                    </>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function renderStudyNoteLayer(
  chapterData: TranslationBookChapter | null,
  discoveredStudyNotes: DiscoveredStudyNotes,
  verseOffsets: Record<number, number>
) {
  if (!chapterData) {
    return null;
  }

  const verseEntries = chapterData.chapter.content.filter(
    (
      entry
    ): entry is Extract<
      TranslationBookChapter["chapter"]["content"][number],
      { type: "verse"; number: number; content: ChapterVerse["content"] }
    > =>
      !!entry &&
      typeof entry === "object" &&
      entry.type === "verse" &&
      typeof entry.number === "number" &&
      Array.isArray(entry.content)
  );

  return verseEntries.map((entry) => {
    const top = verseOffsets[entry.number] ?? 0;

    const verseStudyNotes = getVerseStudyNotes(
      discoveredStudyNotes,
      entry.number
    );
    if (verseStudyNotes.length === 0) {
      return null;
    }

    return (
      <span
        key={`study-note-${entry.number}`}
        className="sb-verse-study-notes"
        style={{ top: `${top}px` }}
      >
        <span className="sb-verse-study-note-number">v{entry.number}</span>
        {verseStudyNotes.map((studyNote) => (
          <span key={studyNote.id} className="sb-verse-study-note">
            {studyNote.note.content}
          </span>
        ))}
      </span>
    );
  });
}

export function BibleReader(props: BibleReaderProps) {
  const { currentPane, readingState, selectorState, state } = props;
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
    selectedFootnote,
    selectFootnote,
  } = readingState;

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

  // Carousel state — only loaded/used on mobile.
  const swipeViewportRef = useRef<HTMLDivElement | null>(null);
  const swipeTrackRef = useRef<HTMLDivElement | null>(null);
  const swipeTouchStartX = useRef<number | null>(null);
  const swipeTouchStartY = useRef<number | null>(null);
  const swipeDirectionLocked = useRef<"h" | "v" | null>(null);
  const swipeCurrentDx = useRef(0);
  const [prevChapterPreview, setPrevChapterPreview] =
    useState<TranslationBookChapter | null>(null);
  const [nextChapterPreview, setNextChapterPreview] =
    useState<TranslationBookChapter | null>(null);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const chapterContentRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTopRef = useRef(0);
  const [verseOffsets, setVerseOffsets] = useState<Record<number, number>>({});

  const currentChapterValue = chapterData.value;
  const currentChapterRef = useRef(chapterData.value);

  // Preload prev/next chapter previews when the current chapter changes.
  useEffect(() => {
    if (!isMobile || !state) {
      setPrevChapterPreview(null);
      setNextChapterPreview(null);
      return;
    }
    const cData = currentChapterValue;
    if (!cData) {
      setPrevChapterPreview(null);
      setNextChapterPreview(null);
      return;
    }

    let cancelled = false;

    if (cData.previousChapterApiLink) {
      state.bibleData
        .getPreviousChapter(cData)
        .then((res) => {
          if (!cancelled) setPrevChapterPreview(res ?? null);
        })
        .catch(() => {
          if (!cancelled) setPrevChapterPreview(null);
        });
    } else {
      setPrevChapterPreview(null);
    }

    if (cData.nextChapterApiLink) {
      state.bibleData
        .getNextChapter(cData)
        .then((res) => {
          if (!cancelled) setNextChapterPreview(res ?? null);
        })
        .catch(() => {
          if (!cancelled) setNextChapterPreview(null);
        });
    } else {
      setNextChapterPreview(null);
    }

    return () => {
      cancelled = true;
    };
  }, [
    isMobile,
    currentChapterValue?.translation.id,
    currentChapterValue?.book.id,
    currentChapterValue?.chapter.number,
  ]);

  // Touch handlers on the swipe viewport drive horizontal pan + chapter
  // navigation on mobile. Mirrors the carousel from `develop`'s `thePage.tsx`.
  useEffect(() => {
    if (!isMobile) return;
    const viewport = swipeViewportRef.current;
    if (!viewport) return;

    const PANEL_PCT = 100 / 3;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      swipeTouchStartX.current = touch.clientX;
      swipeTouchStartY.current = touch.clientY;
      swipeDirectionLocked.current = null;
      swipeCurrentDx.current = 0;
      const track = swipeTrackRef.current;
      if (track) track.style.transition = "none";
    };

    const onTouchMove = (e: TouchEvent) => {
      if (
        swipeTouchStartX.current === null ||
        swipeTouchStartY.current === null
      )
        return;
      const touch = e.touches[0];
      if (!touch) return;
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

      if (swipeDirectionLocked.current === "v") return;

      const hasNext = !!readingState.chapterData.value?.nextChapterApiLink;
      const hasPrev = !!readingState.chapterData.value?.previousChapterApiLink;
      let offset = dx;

      if ((dx < 0 && !hasNext) || (dx > 0 && !hasPrev)) {
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
        track.style.transform = `translateX(calc(-${PANEL_PCT}% + ${offset}px))`;
      }
    };

    const onTouchEnd = () => {
      if (swipeDirectionLocked.current !== "h") {
        swipeTouchStartX.current = null;
        swipeDirectionLocked.current = null;
        return;
      }

      const dx = swipeCurrentDx.current;
      const THRESHOLD = 80;
      const hasNext = !!readingState.chapterData.value?.nextChapterApiLink;
      const hasPrev = !!readingState.chapterData.value?.previousChapterApiLink;

      swipeTouchStartX.current = null;
      swipeDirectionLocked.current = null;
      swipeCurrentDx.current = 0;

      const track = swipeTrackRef.current;
      if (!track) return;

      if (dx < -THRESHOLD && hasNext) {
        track.style.transition = "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)";
        track.style.transform = `translateX(-${PANEL_PCT * 2}%)`;
        readingState.clearSelectedVerses();
        window.setTimeout(async () => {
          track.style.transition = "none";
          track.style.transform = `translateX(-${PANEL_PCT}%)`;
          await readingState.loadNextChapter();
        }, 250);
      } else if (dx > THRESHOLD && hasPrev) {
        track.style.transition = "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)";
        track.style.transform = `translateX(0%)`;
        readingState.clearSelectedVerses();
        window.setTimeout(async () => {
          track.style.transition = "none";
          track.style.transform = `translateX(-${PANEL_PCT}%)`;
          await readingState.loadPreviousChapter();
        }, 250);
      } else {
        track.style.transition = "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
        track.style.transform = `translateX(-${PANEL_PCT}%)`;
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

  const { t } = useI18n();
  const scriptureElements: ScriptureElementsBehavior =
    props.scriptureElements ?? {
      showHeadings: true,
      showVerseNumbers: true,
      showFootnotes: true,
      showCrossReferences: true,
      showStudyNotes: true,
      showDiscoveredContent: true,
      showHighlights: true,
      showRedLettering: true,
    };

  const openBookSelector = () => {
    selectorState.selectingTranslation.value = false;
    void selectorState.setOpen(true, currentPane);
  };
  const openTranslationSelector = () => {
    selectorState.selectingTranslation.value = true;
    void selectorState.setOpen(true, currentPane);
  };
  const openMobileSettings = () => {
    setShowMobileSettings(true);
  };
  const openAllSettings = () => {
    if (!state) return;
    setShowMobileSettings(false);
    // Small delay so the bottom sheet can finish unmounting before the
    // sidebar drawer animates in — otherwise the sheet's z-index 9999
    // sits on top of the sidebar's z-index 100 during the same render
    // tick, and the sidebar appears not to open at all.
    window.setTimeout(() => {
      state.sidebar.openSettings();
      state.sidebar.openSidebar();
    }, 50);
  };

  // We use a callback instead of a ref object
  // because we want to set up and cleaup event listeners immediately when element ownership changes.
  // If we use a ref object and useEffect(), then there will be a period of time where we might recieve scroll events from the element when it is transitioning between
  // PaneReaderScroller instances, causing the tab scroll position to be updated as Preact is updating the DOM.
  const scrollerRefCallback = (el: HTMLDivElement | null) => {
    if (!el) {
      return;
    }

    const cleanup = effect(() => {
      if (readingState.chapterData.value) {
        el.scrollTop = readingState.scrollPosition.peek();
      }

      const verseToScroll = readingState.scrollToVerse.value;
      if (readingState.chapterData.value && verseToScroll !== null) {
        requestAnimationFrame(() => {
          const targetVerse = el.querySelector(
            `[data-verse-number="${verseToScroll}"]`
          );
          if (!(targetVerse instanceof HTMLElement)) {
            return;
          }

          targetVerse.scrollIntoView({ block: "center", inline: "nearest" });
          batch(() => {
            readingState.scrollToVerse.value = null;
            readingState.scrollPosition.value = el.scrollTop;
          });
        });
      }

      currentChapterRef.current = readingState.chapterData.value;

      const updateReadingStateScrollPosition = () => {
        if (
          currentChapterRef.current?.translation.id !==
            readingState.translationId.value ||
          currentChapterRef.current?.book.id !== readingState.bookId.value ||
          currentChapterRef.current?.chapter.number !==
            readingState.chapterNumber.value
        ) {
          return;
        }
        readingState.scrollPosition.value = el.scrollTop;
      };

      const updateMobileScrollHeader = () => {
        if (!state?.app.isMobile.value) {
          return;
        }
        const currentScrollTop = el.scrollTop;
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

      const handleScroll = () => {
        updateMobileScrollHeader();
        updateReadingStateScrollPosition();
      };

      el.addEventListener("scroll", handleScroll, { passive: true });

      return () => {
        el.removeEventListener("scroll", handleScroll);
      };
    });

    return cleanup;
  };

  useEffect(() => {
    const chapterContent = chapterContentRef.current;
    if (!chapterContent || !chapterData.value) {
      setVerseOffsets({});
      return;
    }

    let frameId = 0;

    const measure = () => {
      const nextOffsets: Record<number, number> = {};
      const verseElements = chapterContent.querySelectorAll<HTMLElement>(
        ".sb-verse[data-verse-number]"
      );

      for (const verseElement of verseElements) {
        const verseNumber = Number(verseElement.dataset.verseNumber);
        if (!Number.isFinite(verseNumber)) {
          continue;
        }

        nextOffsets[verseNumber] = verseElement.offsetTop;
      }

      setVerseOffsets((previousOffsets) => {
        const previousKeys = Object.keys(previousOffsets);
        const nextKeys = Object.keys(nextOffsets);
        if (previousKeys.length !== nextKeys.length) {
          return nextOffsets;
        }

        for (const key of nextKeys) {
          if (previousOffsets[Number(key)] !== nextOffsets[Number(key)]) {
            return nextOffsets;
          }
        }

        return previousOffsets;
      });
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(measure);
    };

    scheduleMeasure();

    const resizeObserver = new ResizeObserver(() => {
      scheduleMeasure();
    });
    resizeObserver.observe(chapterContent);
    window.addEventListener("resize", scheduleMeasure);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [
    chapterData.value,
    readingState.discoveredCrossReferences.value,
    readingState.discoveredStudyNotes.value,
    scriptureElements.showFootnotes,
    scriptureElements.showHeadings,
    scriptureElements.showHighlights,
    scriptureElements.showRedLettering,
    scriptureElements.showVerseNumbers,
  ]);

  const renderMainContent = () => (
    <>
      {error.value && !loading.value && (
        <p className="sb-reader-error">{error.value}</p>
      )}

      {!error.value && chapterData.value && (
        <div ref={chapterContentRef} className="sb-chapter-content">
          <div className="sb-chapter-cross-reference-layer">
            {scriptureElements.showCrossReferences &&
              renderCrossReferenceLayer(
                chapterData.value,
                readingState.discoveredCrossReferences.value,
                verseOffsets,
                (ref) => {
                  readingState.selectChapter(
                    ref.crossReference.book,
                    ref.crossReference.chapter,
                    {
                      scrollToVerse: ref.crossReference.verse,
                    }
                  );
                }
              )}
          </div>
          <div className="sb-chapter-study-note-layer">
            {scriptureElements.showStudyNotes &&
              renderStudyNoteLayer(
                chapterData.value,
                readingState.discoveredStudyNotes.value,
                verseOffsets
              )}
          </div>
          {renderChapterContent(
            chapterData.value,
            (verse, event) => {
              selectVerse(verse, event.clientX, event.clientY);
            },
            selectedVerses.value,
            (noteId) => {
              selectFootnote(noteId);
            },
            highlights.value.highlights,
            decorations.value,
            scriptureElements
          )}
        </div>
      )}

      {!error.value && !chapterData.value && (
        <p>
          {t("no-chapter-content-found", {
            defaultValue: "No chapter content found.",
          })}
        </p>
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
      className={`sb-bible-reader${isMobile ? " sb-bible-reader-mobile" : ""}`}
      dir={translation.value?.textDirection ?? "auto"}
    >
      {isMobile && state ? (
        <>
          <div
            className={`sb-bible-reader-mobile-header${
              isScrolled ? " sb-bible-reader-mobile-header-hidden" : ""
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
                  {" "}
                  • {translation.value?.shortName ?? translationId.value ?? ""}
                </span>
              </h1>
            </div>
            <button
              type="button"
              className="sb-bible-reader-mobile-header-settings"
              onClick={openMobileSettings}
              aria-label={t("settings", { defaultValue: "Settings" })}
              title={t("settings", { defaultValue: "Settings" })}
            >
              <InfoSettingsIcon />
            </button>
          </div>

          <div
            className={`sb-bible-reader-mobile-compact${
              isScrolled ? " sb-bible-reader-mobile-compact-visible" : ""
            }`}
            aria-hidden={!isScrolled}
          >
            <span className="sb-bible-reader-mobile-compact-book">
              {currentBook.value?.name ?? bookId.value ?? ""}{" "}
              {chapterNumber.value}
            </span>
            <span className="sb-bible-reader-mobile-compact-divider">|</span>
            <span className="sb-bible-reader-mobile-compact-translation">
              {translation.value?.shortName ?? translationId.value ?? ""}
            </span>
          </div>

          <div ref={swipeViewportRef} className="sb-reader-swipe-viewport">
            <div ref={swipeTrackRef} className="sb-reader-swipe-track">
              <div
                className="sb-reader-swipe-panel sb-reader-swipe-panel-side"
                aria-hidden="true"
              >
                <div className="sb-chapter-content">
                  {renderStaticChapterContent(
                    prevChapterPreview,
                    scriptureElements
                  )}
                </div>
              </div>
              <div
                ref={scrollerRefCallback}
                className="sb-reader-swipe-panel sb-reader-swipe-panel-current"
              >
                {renderMainContent()}
              </div>
              <div
                className="sb-reader-swipe-panel sb-reader-swipe-panel-side"
                aria-hidden="true"
              >
                <div className="sb-chapter-content">
                  {renderStaticChapterContent(
                    nextChapterPreview,
                    scriptureElements
                  )}
                </div>
              </div>
            </div>
          </div>

          {showMobileSettings && (
            <MobileSettingsSheet
              state={state}
              onClose={() => setShowMobileSettings(false)}
              onOpenAllSettings={openAllSettings}
            />
          )}
        </>
      ) : (
        <>
          <h2
            onClick={() => selectorState.setOpen(true, currentPane)}
            className="sb-bible-reader-title"
          >
            <span className="sb-bible-reader-book">
              {currentBook.value?.name ?? bookId.value ?? "Select a book"}
            </span>
            {String.fromCharCode(160)}
            <span className="sb-bible-reader-chapter">
              {chapterNumber.value}
            </span>
            {String.fromCharCode(160)}
            <span className="sb-bible-reader-translation">
              /{String.fromCharCode(160)}
              {translationId.value ?? ""}
            </span>
          </h2>
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
