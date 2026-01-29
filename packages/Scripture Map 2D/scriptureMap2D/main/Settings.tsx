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

const Option = ({
  callback,
  condition,
  enabledIcon,
  disabledIcon,
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
      <span className="material-symbols-outlined">
        {condition ? enabledIcon : disabledIcon}
      </span>
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
    showLabels,
    handleLabelsToggle,
    handleShowAllChaptersToggle,
  } = useScriptureMap2DContext();
  const { usersAuthId, shouldShowReadingHistory } = useReadingHistoryContext();

  const containerRef = useRef(null);

  const shouldShowReadingHistoryOption = useMemo(() => {
    return mode === ScriptureMap2DModes.Viewer && usersAuthId?.length > 0;
  }, [mode, usersAuthId]);

  useEffect(() => {
    console.log(`[Debug] Settings SettingsOptions usersAuthId`, {
      usersAuthId,
    });
  }, [usersAuthId]);

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
        callback={handleShowAllChaptersToggle}
        condition={showingAllChapters}
        enabledIcon={"visibility"}
        disabledIcon={"visibility_off"}
        enabledText={t("close")}
        disabledText={t("open")}
        staticText={t("books")}
      />
      <Option
        callback={() => setShowingBooksColors((prev) => !prev)}
        condition={showingBooksColors}
        enabledIcon={"palette"}
        disabledIcon={"palette"}
        enabledText={t("hide")}
        disabledText={t("show")}
        staticText={t("booksColor")}
      />
      {shouldShowReadingHistoryOption && (
        <Option
          callback={() => setIsReadingHistoryEnabled((prev) => !prev)}
          condition={isReadingHistoryEnabled}
          enabledIcon={"history"}
          disabledIcon={"history"}
          enabledText={t("hide")}
          disabledText={t("show")}
          staticText={t("readingHistory")}
        />
      )}
      <Option
        callback={() => setIsUserPresenceEnabled((prev) => !prev)}
        condition={isUserPresenceEnabled}
        enabledIcon={"group_off"}
        disabledIcon={"group"}
        enabledText={t("hide")}
        disabledText={t("show")}
        staticText={t("userPresence")}
      />
      <Option
        callback={handleLabelsToggle}
        condition={showLabels}
        enabledIcon={"label_off"}
        disabledIcon={"label"}
        enabledText={t("hide")}
        disabledText={t("show")}
        staticText={t("labelsText")}
      />
    </div>
  );
};

export const Settings = () => {
  const { mode, ScriptureMap2DModes, project, isInSelectionMode } =
    useScriptureMap2DContext();
  const { shouldShowReadingHistory } = useReadingHistoryContext();

  const settingsButtonRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  return (
    <div
      className={`scripture-map-2d-settings${collapsed ? " collapsed" : ""}`}
    >
      <div
        className="settings-button"
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
    </div>
  );
};
