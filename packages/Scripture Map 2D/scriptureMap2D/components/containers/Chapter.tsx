import { Tooltip } from "scriptureMap2D.main.Tooltip";
import type { ChapterType } from "scriptureMap2D.main.types";
import { useChapter } from "scriptureMap2D.hooks.useChapter";
const { memo } = os.appCompat;

export const Chapter = memo<ChapterType>(
  ({
    index,
    bookName,
    sectionName,
    historyBackground,
    historyColor,
    tooltipContentsData,
    chapter,
    borderGradientColors,
  }) => {
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
