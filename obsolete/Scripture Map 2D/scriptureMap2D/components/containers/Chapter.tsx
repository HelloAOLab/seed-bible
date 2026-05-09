import { Tooltip } from "scriptureMap2D.components.containers.Tooltip";
import { useChapter } from "scriptureMap2D.hooks.useChapter";
import type { TooltipContentData } from "scriptureMap2D.components.containers.Tooltip";

const { memo } = os.appCompat;

export interface ChapterProps {
  index: number;
  bookName: string;
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
    bookName,
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
      bookName,
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
            <Tooltip
              anchor={tooltipAnchor}
              contentsData={tooltipContentsData}
              offsetY={tooltipOffsetY}
            />
          )}
      </div>
    );
  }
);
