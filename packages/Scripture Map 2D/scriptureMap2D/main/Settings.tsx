import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";
import { ProjectFiltersSelector } from "scriptureMap2D.main.ProjectFiltersSelector";
import { ProjectStateSetter } from "scriptureMap2D.main.ProjectStateSetter";
import { ReadingHistoryUserFiltersSelector } from "scriptureMap2D.main.ReadingHistoryUserFiltersSelector";
import { ReadingHistoryTimeline } from "scriptureMap2D.main.ReadingHistoryTimeline";
import { useReadingHistoryContext } from "scriptureMap2D.main.ReadingHistoryContext";

import { useSideBarContext } from "app.hooks.sideBar";

const { useState, useRef, useEffect, useMemo } = os.appHooks;

const SETTINGS_ICON =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/5a87cdff4617c9047e44ec47ddd8a101aa317e2223d83dd40f615e3f9740f03a.svg";

const Legend = () => {
  const { themeColors } = useSideBarContext();

  const { secondaryColor, baseColor } = useMemo(() => {
    const secondaryColor = themeColors?.["1"]?.secondaryColor ?? "#D2691E";
    const baseColor = themeColors?.["1"]?.firstToolbarbutton ?? "#dfdede";

    return { secondaryColor, baseColor };
  }, [themeColors]);

  const squares = useMemo(() => {
    const squaresCount = 4;
    const step = 1 / squaresCount;
    const squares = [];

    for (let i = 0; i <= squaresCount; i++) {
      let backgroundColor;
      if (i === 0) backgroundColor = baseColor;
      else {
        backgroundColor = BibleVizUtils.Functions.GetHistoryColorByReadingTime({
          baseColor,
          userColor: secondaryColor,
          step,
          readingTimeSeconds: i * step,
          fullColorTimeSeconds: 1,
        });
      }
      squares.push(<span style={{ backgroundColor }}></span>);
    }

    return squares;
  }, [secondaryColor, baseColor]);

  return (
    <div className={"legend"}>
      <span>Less</span>
      {squares}
      <span>More</span>
    </div>
  );
};

const YearSelector = () => {
  const optionsRef = useRef(null);
  const labelRef = useRef(null);
  const { selectedTimelineKey, timelineRangesMap, setSelectedTimelineKey } =
    useReadingHistoryContext();

  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        optionsRef.current &&
        !optionsRef.current.contains(e.target) &&
        labelRef.current &&
        !labelRef.current.contains(e.target)
      ) {
        setShowOptions(false);
      }
    };

    const handleFocusOutside = (e) => {
      if (
        optionsRef.current &&
        !optionsRef.current.contains(e.target) &&
        labelRef.current &&
        !labelRef.current.contains(e.target)
      ) {
        setShowOptions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("focusin", handleFocusOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("focusin", handleFocusOutside);
    };
  }, [setShowOptions]);

  return (
    <div className={"year-selector"}>
      <div
        ref={labelRef}
        className={"year-selector-label"}
        onClick={() => setShowOptions((prev) => !prev)}
      >
        <span>{`Year: ${selectedTimelineKey}`}</span>
        <span className="material-symbols-outlined">keyboard_arrow_down</span>
      </div>
      {showOptions && (
        <div ref={optionsRef} className={"year-selector-options"}>
          {Array.from(timelineRangesMap.keys()).map((key: number) => {
            return (
              <span
                className={`year-selector-option${selectedTimelineKey === key ? " selected" : ""}`}
                onClick={() => {
                  setSelectedTimelineKey(key);
                  setShowOptions(false);
                }}
              >
                {key}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Option = ({
  callback,
  condition,
  enabledText,
  disabledText,
  staticText,
}) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        callback();
      }}
    >
      {`${condition ? enabledText : disabledText} ${staticText}`}
    </button>
  );
};

const SettingsOptions = ({
  setShowOptions,
  settingsButtonRef,
  collapsed,
  setCollapsed,
}) => {
  const { t } = useSideBarContext();
  const {
    showingAllChapters,
    showingBooksColors,
    setShowingBooksColors,
    isUserPresenceEnabled,
    setIsUserPresenceEnabled,
    isReadingHistoryEnabled,
    setIsReadingHistoryEnabled,
    mode,
    ScriptureMap2DModes,
    showTestamentLabels,
    handleTestamentLabelsToggle,
    showSectionLabels,
    handleSectionLabelsToggle,
    handleShowAllChaptersToggle,
  } = useScriptureMap2DContext();
  const {
    usersDataMap,
    shouldShowReadingHistory,
    timelineRangeMethod,
    setTimelineRangeMethod,
  } = useReadingHistoryContext();

  const containerRef = useRef(null);

  const shouldShowReadingHistoryOption = useMemo(() => {
    return mode === ScriptureMap2DModes.Viewer && usersDataMap.size > 0;
  }, [mode, usersDataMap]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        settingsButtonRef.current &&
        !settingsButtonRef.current.contains(e.target)
      ) {
        setShowOptions(false);
      }
    };

    const handleFocusOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        settingsButtonRef.current &&
        !settingsButtonRef.current.contains(e.target)
      ) {
        setShowOptions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("focusin", handleFocusOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("focusin", handleFocusOutside);
    };
  }, [setShowOptions]);

  return (
    <div
      ref={containerRef}
      onClick={(e) => {
        e.stopPropagation();
      }}
      className="settings-options-container"
    >
      <span>View options</span>
      <span>Control the view of the content on the map</span>
      {shouldShowReadingHistory && (
        <Option
          callback={() => setCollapsed((prev) => !prev)}
          condition={collapsed}
          enabledIcon={"visibility_off"}
          disabledIcon={"visibility"}
          enabledText={t("show")}
          disabledText={t("hide")}
          staticText={t("timeline")}
        />
      )}
      <Option
        callback={() =>
          setTimelineRangeMethod((prev: string) => {
            switch (prev) {
              case "rolling":
                return "calendar";
              case "calendar":
                return "rolling";
            }
          })
        }
        condition={timelineRangeMethod}
        enabledText={t("Toggle")}
        disabledText={t("Toggle")}
        staticText={t("type of timeline")}
      />
      <Option
        callback={handleShowAllChaptersToggle}
        condition={showingAllChapters}
        enabledText={t("close")}
        disabledText={t("open")}
        staticText={t("books")}
      />
      <Option
        callback={() => setShowingBooksColors((prev) => !prev)}
        condition={showingBooksColors}
        enabledText={t("hide")}
        disabledText={t("show")}
        staticText={t("books color")}
      />
      {shouldShowReadingHistoryOption && (
        <Option
          callback={() => setIsReadingHistoryEnabled((prev) => !prev)}
          condition={isReadingHistoryEnabled}
          enabledText={t("hide")}
          disabledText={t("show")}
          staticText={t("reading history")}
        />
      )}
      <Option
        callback={() => setIsUserPresenceEnabled((prev) => !prev)}
        condition={isUserPresenceEnabled}
        enabledText={t("hide")}
        disabledText={t("show")}
        staticText={t("user presence")}
      />
      <Option
        callback={handleSectionLabelsToggle}
        condition={showSectionLabels}
        enabledText={t("hide")}
        disabledText={t("show")}
        staticText={t("section labels")}
      />
      <Option
        callback={handleTestamentLabelsToggle}
        condition={showTestamentLabels}
        enabledText={t("hide")}
        disabledText={t("show")}
        staticText={t("testament labels")}
      />
    </div>
  );
};

export const Settings = () => {
  const { mode, ScriptureMap2DModes, project, isInSelectionMode, appId } =
    useScriptureMap2DContext();
  const { shouldShowReadingHistory } = useReadingHistoryContext();

  const settingsButtonRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div
      className={`scripture-map-2d-settings${!shouldShowReadingHistory || collapsed ? " collapsed" : ""}`}
    >
      <div className={"settings-title"}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g clip-path="url(#clip0_5496_10795)">
            <path
              d="M1.25 3.33594H4.16667M14.5833 10.0026C16.4243 10.0026 17.9167 8.51023 17.9167 6.66927C17.9167 4.82831 16.4243 3.33594 14.5833 3.33594H8.33333M5.41667 16.6693C3.57572 16.6693 2.08333 15.1769 2.08333 13.3359C2.08333 11.495 3.57572 10.0026 5.41667 10.0026H10.4167M9.58333 16.6693H14.5833"
              stroke="black"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M4.16669 3.33333C4.16669 3.88587 4.38618 4.41577 4.77688 4.80647C5.16758 5.19717 5.69749 5.41667 6.25002 5.41667C6.80255 5.41667 7.33246 5.19717 7.72316 4.80647C8.11386 4.41577 8.33335 3.88587 8.33335 3.33333C8.33335 2.7808 8.11386 2.25089 7.72316 1.86019C7.33246 1.46949 6.80255 1.25 6.25002 1.25C5.69749 1.25 5.16758 1.46949 4.77688 1.86019C4.38618 2.25089 4.16669 2.7808 4.16669 3.33333Z"
              stroke="black"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M5.41669 16.6693C5.41669 17.2218 5.63618 17.7517 6.02688 18.1424C6.41758 18.5331 6.94749 18.7526 7.50002 18.7526C8.05255 18.7526 8.58246 18.5331 8.97316 18.1424C9.36386 17.7517 9.58335 17.2218 9.58335 16.6693C9.58335 16.1167 9.36386 15.5868 8.97316 15.1961C8.58246 14.8054 8.05255 14.5859 7.50002 14.5859C6.94749 14.5859 6.41758 14.8054 6.02688 15.1961C5.63618 15.5868 5.41669 16.1167 5.41669 16.6693Z"
              stroke="black"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M10.4167 9.9974C10.4167 10.5499 10.6362 11.0798 11.0269 11.4705C11.4176 11.8612 11.9475 12.0807 12.5 12.0807C13.0526 12.0807 13.5825 11.8612 13.9732 11.4705C14.3639 11.0798 14.5834 10.5499 14.5834 9.9974C14.5834 9.44486 14.3639 8.91496 13.9732 8.52426C13.5825 8.13356 13.0526 7.91406 12.5 7.91406C11.9475 7.91406 11.4176 8.13356 11.0269 8.52426C10.6362 8.91496 10.4167 9.44486 10.4167 9.9974Z"
              stroke="black"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M14.6952 18.5034C14.7291 18.7091 14.9265 18.806 15.1191 18.7263C15.4595 18.5853 16.066 18.3107 16.9853 17.8145C17.6009 17.4823 18.0061 17.2162 18.2709 17.0165C18.6014 16.7671 18.6014 16.3619 18.2709 16.1125C18.0062 15.9128 17.6009 15.6468 16.9853 15.3145C16.0661 14.8185 15.4596 14.5439 15.1192 14.4029C14.9266 14.323 14.7291 14.42 14.6952 14.6257C14.6421 14.949 14.5833 15.5384 14.5833 16.5645C14.5833 17.5907 14.6421 18.1801 14.6952 18.5034Z"
              stroke="black"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </g>
          <defs>
            <clipPath id="clip0_5496_10795">
              <rect width="24" height="24" fill="white" />
            </clipPath>
          </defs>
        </svg>

        <span>Scripture map</span>
      </div>

      <div
        className="header-button settings-button"
        ref={settingsButtonRef}
        onClick={() => {
          setShowOptions((prev) => !prev);
        }}
      >
        <img src={SETTINGS_ICON} alt="SETTINGS_ICON" className="coloredIcon" />
        {showOptions && (
          <SettingsOptions
            setShowOptions={setShowOptions}
            settingsButtonRef={settingsButtonRef}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
          />
        )}
      </div>

      <div
        className="header-button close-button"
        onClick={() => {
          globalThis.RemoveApplicationByID?.(appId);
        }}
      >
        <span class="material-symbols-outlined">close</span>
      </div>

      <span className={"horizontal-divider"}></span>

      {mode === ScriptureMap2DModes.Project && project && (
        <>
          <ProjectStateSetter />
          {!isInSelectionMode && <ProjectFiltersSelector />}
        </>
      )}
      {shouldShowReadingHistory && (
        <>
          <ReadingHistoryUserFiltersSelector />
          <ReadingHistoryTimeline />
        </>
      )}

      {shouldShowReadingHistory && !collapsed && (
        <>
          <div className={"settings-footer"}>
            <Legend />
            <YearSelector />
          </div>
          <span className={"horizontal-divider"}></span>
        </>
      )}
    </div>
  );
};
