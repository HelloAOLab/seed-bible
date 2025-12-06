// import { UserPresenceSettings } from "scriptureMap2D.main.UserPresenceSettings"
import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";
import { ProjectFiltersSelector } from "scriptureMap2D.main.ProjectFiltersSelector";
import { ProjectStateSetter } from "scriptureMap2D.main.ProjectStateSetter";
import { ReadingHistoryUserFiltersSelector } from "scriptureMap2D.main.ReadingHistoryUserFiltersSelector";
import { ReadingHistoryTimeline } from "scriptureMap2D.main.ReadingHistoryTimeline";
import { useReadingHistoryContext } from "scriptureMap2D.main.ReadingHistoryContext";

const { useState, useRef, useEffect, useMemo } = os.appHooks;

const Settings_Icon =
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
  shouldShowReadingHistorySettings,
}) => {
  const {
    showingAllChapters,
    setShowingAllChapters,
    showingBooksColors,
    setShowingBooksColors,
    isUserPresenceEnabled,
    setIsUserPresenceEnabled,
    isReadingHistoryEnabled,
    setIsReadingHistoryEnabled,
    mode,
    ScriptureMap2DModes,
  } = useScriptureMap2DContext();
  const { usersAuthId } = useReadingHistoryContext();

  const containerRef = useRef(null);

  const shouldShowReadingHistoryOption = useMemo(() => {
    return mode === ScriptureMap2DModes.Viewer && usersAuthId?.length > 0;
  }, []);

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
      className="settingsOptionsContainer"
    >
      {shouldShowReadingHistorySettings && (
        <Option
          callback={() => setCollapsed((prev) => !prev)}
          condition={collapsed}
          enabledIcon={"visibility_off"}
          disabledIcon={"visibility"}
          enabledText={"Show"}
          disabledText={"Hide"}
          staticText={"timeline"}
        />
      )}
      <Option
        callback={() => setShowingAllChapters((prev) => !prev)}
        condition={showingAllChapters}
        enabledIcon={"visibility"}
        disabledIcon={"visibility_off"}
        enabledText={"Close"}
        disabledText={"Open"}
        staticText={"books"}
      />
      <Option
        callback={() => setShowingBooksColors((prev) => !prev)}
        condition={showingBooksColors}
        enabledIcon={"palette"}
        disabledIcon={"palette"}
        enabledText={"Hide"}
        disabledText={"Show"}
        staticText={"books color"}
      />
      {shouldShowReadingHistoryOption && (
        <Option
          callback={() => setIsReadingHistoryEnabled((prev) => !prev)}
          condition={isReadingHistoryEnabled}
          enabledIcon={"history"}
          disabledIcon={"history"}
          enabledText={"Hide"}
          disabledText={"Show"}
          staticText={"reading history"}
        />
      )}
      <Option
        callback={() => setIsUserPresenceEnabled((prev) => !prev)}
        condition={isUserPresenceEnabled}
        enabledIcon={"group_off"}
        disabledIcon={"group"}
        enabledText={"Hide"}
        disabledText={"Show"}
        staticText={"user presence"}
      />
    </div>
  );
};

export const Settings = () => {
  const {
    mode,
    ScriptureMap2DModes,
    project,
    isInSelectionMode,
    isReadingHistoryEnabled,
  } = useScriptureMap2DContext();
  const { usersAuthId } = useReadingHistoryContext();

  const settingsButtonRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const shouldShowReadingHistorySettings = useMemo(() => {
    return (
      mode === ScriptureMap2DModes.Viewer &&
      isReadingHistoryEnabled &&
      usersAuthId?.length > 0
    );
  }, [mode, isReadingHistoryEnabled, usersAuthId, ScriptureMap2DModes]);

  return (
    <div className={`mapSettings${collapsed ? " collapsed" : ""}`}>
      <div
        className="settings-button"
        ref={settingsButtonRef}
        onClick={() => {
          setShowOptions((prev) => !prev);
        }}
      >
        <img src={Settings_Icon} alt="Settings_Icon" />
        {showOptions && (
          <SettingsOptions
            setShowOptions={setShowOptions}
            settingsButtonRef={settingsButtonRef}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            shouldShowReadingHistorySettings={shouldShowReadingHistorySettings}
          />
        )}
      </div>

      {mode === ScriptureMap2DModes.Project && project && (
        <>
          <ProjectStateSetter />
          {!isInSelectionMode && <ProjectFiltersSelector />}
        </>
      )}
      {shouldShowReadingHistorySettings && (
        <>
          <ReadingHistoryUserFiltersSelector />
          <ReadingHistoryTimeline />
        </>
      )}
    </div>
  );
};

// {isUserPresenceEnabled && <UserPresenceSettings />}
