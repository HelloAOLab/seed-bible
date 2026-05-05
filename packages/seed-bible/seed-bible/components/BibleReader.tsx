import {
  type TranslationBookChapter,
  type ChapterVerse,
} from "seed-bible.managers.FreeUseBibleAPI";
import type { JSX } from "preact";
import { computed } from "@preact/signals";
import type {
  BibleReadingState,
  BibleSelectedVerse,
  VerseDecoration,
} from "seed-bible.managers.BibleReadingManager";
import type { ChapterHighlight } from "seed-bible.managers.HighlightsManager";
import type { BibleSelectorState } from "seed-bible.managers.BibleSelectorManager";
import type { Pane } from "seed-bible.managers.PanesManager";
import type { ScriptureElementsBehavior } from "seed-bible.managers.SettingsManager";
import { useI18n } from "seed-bible.i18n.I18nManager";

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
    if (part.wordsOfJesus) {
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
            {segment.text}
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
              scriptureElements.showFootnotes
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
}

export function BibleReader(props: BibleReaderProps) {
  const { currentPane, readingState, selectorState } = props;
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

  const { t } = useI18n();
  const scriptureElements: ScriptureElementsBehavior =
    props.scriptureElements ?? {
      showHeadings: true,
      showVerseNumbers: true,
      showFootnotes: true,
      showHighlights: true,
    };

  return (
    <div
      className="sb-bible-reader"
      dir={translation.value?.textDirection ?? "auto"}
    >
      <h2
        onClick={() => selectorState.setOpen(true, currentPane)}
        className="sb-bible-reader-title"
      >
        <span className="sb-bible-reader-book">
          {currentBook.value?.name ?? bookId.value ?? "Select a book"}
        </span>
        {String.fromCharCode(160)}
        <span className="sb-bible-reader-chapter">{chapterNumber.value}</span>
        {String.fromCharCode(160)}
        <span className="sb-bible-reader-translation">
          /{String.fromCharCode(160)}
          {translationId.value ?? ""}
        </span>
      </h2>

      {error.value && !loading.value && (
        <p className="sb-reader-error">{error.value}</p>
      )}

      {!error.value && chapterData.value && (
        <div className="sb-chapter-content">
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
