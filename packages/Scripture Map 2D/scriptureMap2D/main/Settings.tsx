// import { UserPresenceSettings } from "scriptureMap2D.main.UserPresenceSettings"
import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";
import { ProjectFiltersSelector } from "scriptureMap2D.main.ProjectFiltersSelector";
import { ProjectStateSetter } from "scriptureMap2D.main.ProjectStateSetter";
import { ReadingHistoryUserFiltersSelector } from "scriptureMap2D.main.ReadingHistoryUserFiltersSelector";
import { ReadingHistoryTimeline } from "scriptureMap2D.main.ReadingHistoryTimeline";
import { useReadingHistoryContext } from "scriptureMap2D.main.ReadingHistoryContext";

const { useState, useRef, useEffect, useMemo } = os.appHooks;

const SettingsOptions = ({
  setShowOptions,
  settingsButtonRef,
  collapsed,
  setCollapsed,
  shouldShowReadingHistorySettings,
}) => {
  const { showingAllChapters, setShowingAllChapters } =
    useScriptureMap2DContext();

  const containerRef = useRef(null);

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
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed((prev) => !prev);
          }}
        >
          <span className="material-symbols-outlined">
            {collapsed ? "visibility_off" : "visibility"}
          </span>
          {`${collapsed ? "Show" : "Hide"} timeline`}
        </button>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowingAllChapters((prev) => !prev);
        }}
      >
        <span className="material-symbols-outlined">
          {showingAllChapters ? "visibility" : "visibility_off"}
        </span>
        {`${showingAllChapters ? "Close" : "Open"} books`}
      </button>
    </div>
  );
};

export const Settings = () => {
  const {
    isUserPresenceEnabled,
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
      <span
        ref={settingsButtonRef}
        onClick={() => {
          setShowOptions((prev) => !prev);
        }}
        className="material-symbols-outlined settings-button"
      >
        settings
        {showOptions && (
          <SettingsOptions
            setShowOptions={setShowOptions}
            settingsButtonRef={settingsButtonRef}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            shouldShowReadingHistorySettings={shouldShowReadingHistorySettings}
          />
        )}
      </span>
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
