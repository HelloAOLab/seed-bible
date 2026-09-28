import { ScriptureMapTooltip } from "./ScriptureMapTooltip";
import { useChapter } from "../../hooks/useChapter";
import type { TooltipContentData } from "./ScriptureMapTooltip";

import { memo } from "preact/compat";

export interface ChapterProps {
  index: number;
  bookId: string;
  sectionName: string;
  historyBackground: React.CSSProperties["color"];
  historyColor: React.CSSProperties["color"];
  tooltipContentsData: TooltipContentData[];
  chapter: number;
  borderGradientColors: React.CSSProperties["background"];
}

export const Chapter = memo(
  ({
    index,
    bookId,
    sectionName,
    historyBackground,
    historyColor,
    tooltipContentsData,
    chapter,
    borderGradientColors,
  }: ChapterProps) => {
    const {
      chapterClass,
      handleChapterPointerEnter,
      handleChapterPointerLeave,
      handleChapterPointerDown,
      handleChapterPointerUp,
      chapterStyle,
      isUserPresenceEnabled,
      isReadingHistoryEnabled,
      tooltipAnchor,
      tooltipOffsetY,
    } = useChapter({
      sectionName,
      bookId,
      index,
      historyBackground,
      historyColor,
      borderGradientColors,
    });

    return (
      <div
        className={chapterClass}
        onPointerEnter={handleChapterPointerEnter}
        onPointerLeave={handleChapterPointerLeave}
        onPointerDown={handleChapterPointerDown}
        onPointerUp={handleChapterPointerUp}
        style={chapterStyle}
      >
        {chapter}
        {(isReadingHistoryEnabled || isUserPresenceEnabled) &&
          tooltipAnchor &&
          tooltipContentsData?.length > 0 && (
            <ScriptureMapTooltip
              anchor={tooltipAnchor}
              contentsData={tooltipContentsData}
              offsetY={tooltipOffsetY}
            />
          )}
      </div>
    );
  }
);
