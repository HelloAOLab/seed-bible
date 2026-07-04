import {
  type TranslationBookChapter,
  type ChapterVerse,
} from "../managers/FreeUseBibleAPI";
import type { JSX } from "preact";
import { Suspense, useRef } from "preact/compat";
import { computed, type ReadonlySignal, type Signal } from "@preact/signals";
import type {
  BibleReadingState,
  BibleSelectedVerse,
  VerseDecoration,
} from "../managers/BibleReadingManager";
import type {
  ChapterHighlight,
  ChapterHighlights,
} from "../managers/HighlightsManager";
import type { BibleSelectorState } from "../managers/BibleSelectorManager";
import type { Pane } from "../managers/PanesManager";
import type { ScriptureElementsBehavior } from "../managers/SettingsManager";
import type { SeedBibleState } from "../managers/SeedBibleStateManager";
import { useI18n } from "../i18n/I18nManager";
import { MobileSettingsSheet } from "../components/MobileSettingsSheet";
import { InfoSettingsIcon } from "../components/icons";
import { QuickToolbar } from "../components/QuickToolbar";

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
  mobileChrome?: BibleReaderMobileChromeProps;
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

  if (chapterData.value === null) {
    throw chapterDataPromise;
  }

  return (
    <div
      className="sb-chapter-content"
      onPointerDown={() => {
        justConvertedSelectionRef.current = false;
      }}
      onPointerUp={selectVersesFromTextSelection}
    >
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
  const { currentPane, readingState, selectorState, state, mobileChrome } =
    props;
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
    void selectorState.setOpen(true, currentPane);
  };
  const openTranslationSelector = async () => {
    await selectorState.setOpen(true, currentPane);
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

  const renderMainContent = () => (
    <>
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
      className={`sb-bible-reader${isMobile ? " sb-bible-reader-mobile" : ""}`}
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
              className="sb-quick-toolbar-mobile-header"
            />
            <ReaderBookmarkButton
              state={state}
              translationId={translationId.value}
              bookId={bookId.value}
              chapterNumber={chapterNumber.value}
            />
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
              onClick={() => selectorState.setOpen(true, currentPane)}
              className="sb-bible-reader-title"
            >
              <span className="sb-bible-reader-book">
                {currentBook.value?.name ?? bookId.value ?? "Select a book"}
              </span>
              <span className="sb-bible-reader-title-sep" aria-hidden="true">
                {" – "}
              </span>
              <span className="sb-bible-reader-chapter">
                {chapterNumber.value}
              </span>
              <span className="sb-bible-reader-translation">
                {" / "}
                {translationId.value ?? ""}
              </span>
            </h2>
            {state && (
              <div className="sb-bible-reader-actions">
                <QuickToolbar
                  toolsManager={state.tools}
                  readingState={readingState}
                  className="sb-quick-toolbar-reader"
                />
                <ReaderBookmarkButton
                  state={state}
                  translationId={translationId.value}
                  bookId={bookId.value}
                  chapterNumber={chapterNumber.value}
                />
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
