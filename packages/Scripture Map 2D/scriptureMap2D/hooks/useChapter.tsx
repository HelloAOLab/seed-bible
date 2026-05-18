import { useScriptureMap2DContext } from "scriptureMap2D.contexts.ScriptureMap2D.ScriptureMap2DContext";
import { useTestamentContext } from "scriptureMap2D.contexts.Testament.TestamentContext";
import type { ChapterProps } from "scriptureMap2D.components.containers.Chapter";
import { useClickAndHold } from "scriptureMap2D.hooks.useClickAndHold";
import type { TooltipAnchor } from "scriptureMap2D.components.containers.Tooltip";
import { ScriptureMap2DModes } from "scriptureMap2D.models.scriptureMap";

type UseChapterProps = Pick<
  ChapterProps,
  | "sectionName"
  | "bookId"
  | "index"
  | "historyBackground"
  | "historyColor"
  | "borderGradientColors"
>;

interface UseChapterType {
  chapterClass: string;
  handleChapterPointerEnter: (
    e: React.JSX.TargetedPointerEvent<HTMLDivElement>
  ) => void;
  handleChapterPointerLeave: () => void;
  handleChapterPointerDown: (
    e: React.JSX.TargetedPointerEvent<HTMLDivElement>
  ) => void;
  handleChapterPointerUp: (
    e: React.JSX.TargetedPointerEvent<HTMLDivElement>
  ) => void;
  chapterStyle: React.CSSProperties;
  isUserPresenceEnabled: boolean;
  isReadingHistoryEnabled: boolean;
  tooltipAnchor: TooltipAnchor | undefined;
  tooltipOffsetY: number;
}

type UseChapter = (props: UseChapterProps) => UseChapterType;

const { useState, useMemo, useCallback } = os.appHooks;

export const useChapter: UseChapter = ({
  sectionName,
  bookId,
  index,
  historyBackground,
  historyColor,
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
    scaleFactor,
  } = useScriptureMap2DContext();

  const { testament } = useTestamentContext();

  const checked = useMemo(() => {
    return (
      selection?.[testament.name]?.[sectionName]?.[bookId]?.[index] ?? false
    );
  }, [selection]);

  const { onHoldStart, onHoldEnd } = useClickAndHold<HTMLDivElement>({
    holdTime: 400,
    holdCompleteCallback: (e) => {
      const key = {
        testamentName: testament.name,
        sectionName,
        bookId,
        chapterIndex: index,
      };
      onChapterClickAndHold?.(e, key, checked);
    },
    holdCancelCallback: (e) => {
      const key = {
        testamentName: testament.name,
        sectionName,
        bookId,
        chapterIndex: index,
      };
      onChapterClick(e, key, checked);
    },
    dependencies: onChapterClickDependencies,
  });

  const { background, borderStyle, borderColor, color } = useMemo(() => {
    const projectChapterState =
      project?.structure[testament.name]?.[sectionName]?.[bookId]?.[index];
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

  const chapterClass = useMemo<string>(() => {
    return `chapter${borderGradientColors && isUserPresenceEnabled ? " show-user-presence" : ""}`;
  }, [borderGradientColors, isUserPresenceEnabled]);

  const handleChapterPointerEnter = useCallback<
    UseChapterType["handleChapterPointerEnter"]
  >(
    (e) => {
      setContainerRect(e.currentTarget.getBoundingClientRect());
    },
    [setContainerRect]
  );

  const handleChapterPointerLeave = useCallback<
    UseChapterType["handleChapterPointerLeave"]
  >(() => {
    setContainerRect(null);
  }, [setContainerRect]);

  const chapterStyle = useMemo<UseChapterType["chapterStyle"]>(() => {
    return {
      "--userPresenceColors": borderGradientColors,
      background,
      borderStyle,
      borderColor,
      color,
    };
  }, [borderGradientColors, background, borderStyle, borderColor, color]);

  const tooltipOffsetY = useMemo<number>(() => {
    return borderGradientColors && isUserPresenceEnabled ? scaleFactor * 2 : 0;
  }, [borderGradientColors, isUserPresenceEnabled, scaleFactor]);

  return {
    chapterClass,
    handleChapterPointerEnter,
    handleChapterPointerLeave,
    handleChapterPointerDown: onHoldStart,
    handleChapterPointerUp: onHoldEnd,
    chapterStyle,
    isUserPresenceEnabled,
    isReadingHistoryEnabled,
    tooltipAnchor,
    tooltipOffsetY,
  };
};
