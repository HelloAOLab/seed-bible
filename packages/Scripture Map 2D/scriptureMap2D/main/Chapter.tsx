import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";
import { Tooltip } from "scriptureMap2D.main.Tooltip";
import { useTestamentContext } from "scriptureMap2D.main.TestamentContext";
import { useClickAndHold } from "scriptureMap2D.main.CustomHooks";
import { ScriptureMap2DModes } from "scriptureMap2D.main.enums";
import type { ChapterType } from "scriptureMap2D.main.types";
const { useState, useMemo } = os.appHooks;
const { memo } = os.appCompat;

export const Chapter = memo<ChapterType>(
  ({
    index,
    bookName,
    sectionName,
    historyBackground,
    historyColor,
    tooltipContent,
    chapter,
    borderGradientColors,
  }) => {
    const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

    const {
      isUserPresenceEnabled,
      isReadingHistoryEnabled,
      content,
      mode,
      selection,
      project,
      projectFilters,
      projectStateStyle,
      onChapterClick,
      onChapterClickDependencies,
      onChapterClickAndHold,
      isInSelectionMode,
      BASE_BACKGROUND_COLOR: baseColor,
      scaleFactor,
    } = useScriptureMap2DContext();

    const { testament } = useTestamentContext();

    const checked = useMemo(() => {
      return (
        selection?.[testament.name]?.[sectionName]?.[bookName]?.[index] ?? false
      );
    }, [selection]);

    const { onHoldStart, onHoldEnd } = useClickAndHold({
      holdTime: 400,
      holdCompleteCallback: (e) => {
        const key = {
          testamentName: testament.name,
          sectionName,
          bookName,
          chapterIndex: index,
        };
        onChapterClickAndHold(e, key, checked);
      },
      holdCancelCallback: (e) => {
        const key = {
          testamentName: testament.name,
          sectionName,
          bookName,
          chapterIndex: index,
        };
        onChapterClick(e, key, checked);
      },
      dependencies: onChapterClickDependencies,
    });

    const { background, borderStyle, borderColor, color } = useMemo(() => {
      const projectChapterState =
        project?.structure[testament.name]?.[sectionName]?.[bookName]?.[index];
      const hasProjectContent =
        project &&
        mode === ScriptureMap2DModes.Project &&
        (isInSelectionMode ||
          (projectChapterState && projectFilters.get(projectChapterState)));

      let background;
      let borderStyle;
      let borderColor;
      let color;

      switch (mode) {
        case ScriptureMap2DModes.Project:
          {
            if (hasProjectContent || checked) {
              const style: React.CSSProperties = projectChapterState
                ? projectStateStyle[projectChapterState]
                : {};
              background = style?.backgroundColor;
              borderStyle = checked ? "solid" : style?.borderStyle;
              borderColor = checked ? "#2AB80D" : style?.borderColor;
            }
          }
          break;

        case ScriptureMap2DModes.Viewer:
          {
            borderStyle = "hidden";
            if (isReadingHistoryEnabled && historyBackground) {
              background = historyBackground;
              color = historyColor;
            }
          }
          break;

        case ScriptureMap2DModes.Checkbox:
          {
            if (checked) borderColor = "#2AB80D";
          }
          break;
      }

      return {
        background,
        borderStyle,
        borderColor,
        color,
      };
    }, [
      isUserPresenceEnabled,
      isReadingHistoryEnabled,
      content,
      project,
      mode,
      projectFilters,
      checked,
      isInSelectionMode,
      historyBackground,
      historyColor,
    ]);

    const { tooltipAnchor } = useMemo(() => {
      let tooltipAnchor;

      if (containerRect) {
        tooltipAnchor = {
          x: containerRect.left + containerRect.width / 2,
          y: containerRect.top,
          width: containerRect.width,
          height: containerRect.height,
        };
      }

      return { tooltipAnchor };
    }, [containerRect]);

    return (
      <div
        className={`chapter${borderGradientColors && isUserPresenceEnabled ? " show-user-presence" : ""}`}
        onPointerEnter={(e) =>
          setContainerRect(e.currentTarget.getBoundingClientRect())
        }
        onPointerLeave={() => {
          setContainerRect(null);
        }}
        onPointerDown={onHoldStart}
        onPointerUp={onHoldEnd}
        style={{
          "--userPresenceColors": borderGradientColors,
          background,
          borderStyle,
          borderColor,
          color,
        }}
      >
        {chapter}
        {(isReadingHistoryEnabled || isUserPresenceEnabled) &&
          tooltipAnchor &&
          tooltipContent?.length > 0 && (
            <Tooltip
              anchor={tooltipAnchor}
              content={tooltipContent}
              offsetY={
                borderGradientColors && isUserPresenceEnabled
                  ? scaleFactor * 2
                  : 0
              }
            />
          )}
      </div>
    );
  }
);
