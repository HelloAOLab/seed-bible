import { useScriptureMap2DContext } from "scriptureMap2D.contexts.ScriptureMap2D.ScriptureMap2DContext";
import { useReadingHistoryContext } from "scriptureMap2D.contexts.ReadingHistory.ReadingHistoryContext";
import type {
  MutableRef,
  StateUpdater,
} from "../../../../typings/AuxLibraryDefinitions";
import type { SettingsYearselectorOptionData } from "scriptureMap2D.components.containers.Settings";
import type { SettingsLegendSquareData } from "scriptureMap2D.components.containers.Settings";
import type { ReadingHistoryContextType } from "scriptureMap2D.contexts.ReadingHistory.ReadingHistoryContext";
import type { ScriptureMap2DContextType } from "scriptureMap2D.contexts.ScriptureMap2D.ScriptureMap2DContext";
import { useSideBarContext } from "app.hooks.sideBar";
import { readingHistoryService } from "bibleVizUtils.services.index";
import type { SettingsOptionData } from "scriptureMap2D.components.containers.Settings";
import { TimelineRangeMethod } from "scriptureMap2D.models.readingHistory";
import {
  ScriptureMap2DModes,
  type ScriptureMap2DModesType,
} from "scriptureMap2D.models.scriptureMap";

const { useState, useRef, useMemo, useCallback } = os.appHooks;

interface UseSettingsType {
  settingsClass: string;
  settingsButtonRef: MutableRef<HTMLDivElement | null>;
  handleSettingsButtonClick: () => void;
  showOptions: boolean;
  setShowOptions: StateUpdater<boolean>;
  collapsed: boolean;
  handleCloseButtonClick: () => void;
  mode: ScriptureMap2DModesType;
  project: ScriptureMap2DContextType["project"];
  isInSelectionMode: ScriptureMap2DContextType["isInSelectionMode"];
  shouldShowReadingHistory: ReadingHistoryContextType["shouldShowReadingHistory"];
  optionsData: SettingsOptionData[];
  legendSquaresData: SettingsLegendSquareData[];
  yearSelectorLabelTextContent: string;
  yearSelectorOptionsData: SettingsYearselectorOptionData[];
}

type UseSettings = () => UseSettingsType;

export const useSettings: UseSettings = () => {
  const {
    mode,
    project,
    isInSelectionMode,
    appId,
    handleShowAllChaptersToggle,
    showingAllChapters,
    setShowingBooksColors,
    showingBooksColors,
    setIsReadingHistoryEnabled,
    isReadingHistoryEnabled,
    setIsUserPresenceEnabled,
    isUserPresenceEnabled,
    handleSectionLabelsToggle,
    showSectionLabels,
    handleTestamentLabelsToggle,
    showTestamentLabels,
  } = useScriptureMap2DContext();
  const {
    shouldShowReadingHistory,
    setTimelineRangeMethod,
    timelineRangeMethod,
    usersDataMap,
    selectedTimelineKey,
    timelineRangesMap,
    setSelectedTimelineKey,
  } = useReadingHistoryContext();
  const { themeColors } = useSideBarContext();

  const settingsButtonRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [showOptions, setShowOptions] = useState<boolean>(false);

  const settingsClass = useMemo<UseSettingsType["settingsClass"]>(() => {
    return `scripture-map-2d-settings${!shouldShowReadingHistory || collapsed ? " collapsed" : ""}`;
  }, [shouldShowReadingHistory, collapsed]);

  const handleSettingsButtonClick = useCallback<
    UseSettingsType["handleSettingsButtonClick"]
  >(() => {
    setShowOptions((prev) => !prev);
  }, [setShowOptions]);

  const handleCloseButtonClick = useCallback<
    UseSettingsType["handleCloseButtonClick"]
  >(() => {
    console.log(`TODO: Remove application`);
    // globalThis.RemoveApplicationByID?.(appId);
  }, []);

  const shouldShowReadingHistoryOption = useMemo(() => {
    return mode === ScriptureMap2DModes.Viewer && usersDataMap.size > 0;
  }, [mode, usersDataMap]);

  const handleToggleTimelineClick = useCallback<() => void>(() => {
    setCollapsed((prev) => !prev);
  }, [setCollapsed]);

  const handleToggleTimelineMethodClick = useCallback<() => void>(() => {
    setTimelineRangeMethod((prev) => {
      switch (prev) {
        case TimelineRangeMethod.Rolling:
          return TimelineRangeMethod.Calendar;
        case TimelineRangeMethod.Calendar:
          return TimelineRangeMethod.Rolling;
      }
    });
  }, [setTimelineRangeMethod]);

  const handleToggleBooksColorClick = useCallback(() => {
    setShowingBooksColors((prev) => !prev);
  }, [setShowingBooksColors]);

  const handleToggleReadingHistoryClick = useCallback<() => void>(() => {
    setIsReadingHistoryEnabled((prev) => !prev);
  }, [setIsReadingHistoryEnabled]);

  const handleToggleUserPresenceClick = useCallback<() => void>(() => {
    setIsUserPresenceEnabled((prev) => !prev);
  }, [setIsUserPresenceEnabled]);

  const optionsData = useMemo<UseSettingsType["optionsData"]>(() => {
    const data: UseSettingsType["optionsData"] = [];

    if (shouldShowReadingHistory) {
      data.push({
        callback: handleToggleTimelineClick,
        condition: collapsed,
        enabledIcon: "visibility_off",
        disabledIcon: "visibility",
        enabledText: t("show"),
        disabledText: t("hide"),
        staticText: t("timeline"),
        key: "timeline",
      });
    }

    data.push(
      {
        callback: handleToggleTimelineMethodClick,
        condition: !!timelineRangeMethod,
        enabledText: t("Toggle"),
        disabledText: t("Toggle"),
        staticText: t("type of timeline"),
        key: "type of timeline",
      },
      {
        callback: handleShowAllChaptersToggle,
        condition: showingAllChapters,
        enabledText: t("close"),
        disabledText: t("open"),
        staticText: t("books"),
        key: "books",
      },
      {
        callback: handleToggleBooksColorClick,
        condition: showingBooksColors,
        enabledText: t("hide"),
        disabledText: t("show"),
        staticText: t("books color"),
        key: "books color",
      }
    );

    if (shouldShowReadingHistoryOption) {
      data.push({
        callback: handleToggleReadingHistoryClick,
        condition: isReadingHistoryEnabled,
        enabledText: t("hide"),
        disabledText: t("show"),
        staticText: t("reading history"),
        key: "reading history",
      });
    }

    data.push(
      {
        callback: handleToggleUserPresenceClick,
        condition: isUserPresenceEnabled,
        enabledText: t("hide"),
        disabledText: t("show"),
        staticText: t("user presence"),
        key: "user presence",
      },
      {
        callback: handleSectionLabelsToggle,
        condition: showSectionLabels,
        enabledText: t("hide"),
        disabledText: t("show"),
        staticText: t("section labels"),
        key: "section labels",
      },
      {
        callback: handleTestamentLabelsToggle,
        condition: showTestamentLabels,
        enabledText: t("hide"),
        disabledText: t("show"),
        staticText: t("testament labels"),
        key: "testament labels",
      }
    );

    return data;
  }, [
    setTimelineRangeMethod,
    timelineRangeMethod,
    t,
    handleShowAllChaptersToggle,
    showingAllChapters,
    setShowingBooksColors,
    showingBooksColors,
    shouldShowReadingHistoryOption,
    setIsReadingHistoryEnabled,
    isReadingHistoryEnabled,
    setIsUserPresenceEnabled,
    isUserPresenceEnabled,
    handleSectionLabelsToggle,
    showSectionLabels,
    handleTestamentLabelsToggle,
    showTestamentLabels,
    shouldShowReadingHistory,
    setCollapsed,
    collapsed,
    handleToggleTimelineMethodClick,
    handleToggleTimelineClick,
    handleToggleBooksColorClick,
    handleToggleReadingHistoryClick,
    handleToggleUserPresenceClick,
  ]);

  const { secondaryColor, baseColor } = useMemo<{
    secondaryColor: string;
    baseColor: string;
  }>(() => {
    const secondaryColor = themeColors?.["1"]?.secondaryColor ?? "#D2691E";
    const baseColor = themeColors?.["1"]?.firstToolbarbutton ?? "#dfdede";

    return { secondaryColor, baseColor };
  }, [themeColors]);

  const legendSquaresData = useMemo<
    UseSettingsType["legendSquaresData"]
  >(() => {
    const squaresCount = 4;
    const step = 1 / squaresCount;
    const legendSquaresData: UseSettingsType["legendSquaresData"] = [];

    for (let i = 0; i <= squaresCount; i++) {
      let backgroundColor: React.CSSProperties["backgroundColor"];
      if (i === 0) backgroundColor = baseColor;
      else {
        backgroundColor = readingHistoryService.getColorByReadingTime({
          baseColor,
          userColor: secondaryColor,
          step,
          readingTimeSeconds: i * step,
          fullColorTimeSeconds: 1,
        });
      }
      legendSquaresData.push({ style: { backgroundColor }, key: i });
    }

    return legendSquaresData;
  }, [secondaryColor, baseColor]);

  const yearSelectorLabelTextContent = useMemo<
    UseSettingsType["yearSelectorLabelTextContent"]
  >(() => {
    return `Year: ${selectedTimelineKey}`;
  }, [selectedTimelineKey]);

  const yearSelectorOptionsData = useMemo<
    UseSettingsType["yearSelectorOptionsData"]
  >(() => {
    return Array.from(timelineRangesMap.keys()).map((key: number) => {
      return {
        className: `year-selector-option${selectedTimelineKey === key ? " selected" : ""}`,
        onClick: () => {
          setSelectedTimelineKey(key);
          setShowOptions(false);
        },
        content: key,
        key,
      };
    });
  }, [
    timelineRangesMap,
    selectedTimelineKey,
    setSelectedTimelineKey,
    setShowOptions,
  ]);

  return {
    settingsClass,
    settingsButtonRef,
    handleSettingsButtonClick,
    showOptions,
    setShowOptions,
    collapsed,
    handleCloseButtonClick,
    mode,
    project,
    isInSelectionMode,
    shouldShowReadingHistory,
    optionsData,
    legendSquaresData,
    yearSelectorLabelTextContent,
    yearSelectorOptionsData,
  };
};
