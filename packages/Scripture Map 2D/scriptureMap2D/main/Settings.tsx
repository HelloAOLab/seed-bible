// import { UserPresenceSettings } from "scriptureMap2D.main.UserPresenceSettings"
import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";
import { ProjectFiltersSelector } from "scriptureMap2D.main.ProjectFiltersSelector";
import { ProjectStateSetter } from "scriptureMap2D.main.ProjectStateSetter";
import { ReadingHistoryUserFiltersSelector } from "scriptureMap2D.main.ReadingHistoryUserFiltersSelector";
import { ReadingHistoryTimeline } from "scriptureMap2D.main.ReadingHistoryTimeline";

export const Settings = () => {
  const {
    isUserPresenceEnabled,
    mode,
    ScriptureMap2DModes,
    project,
    isInSelectionMode,
    isReadingHistoryEnabled,
  } = useScriptureMap2DContext();

  if (mode === ScriptureMap2DModes.Project && !project) return null;

  return (
    <div className="mapSettings">
      {mode === ScriptureMap2DModes.Project && project && (
        <>
          <ProjectStateSetter />
          {!isInSelectionMode && <ProjectFiltersSelector />}
        </>
      )}
      {mode === ScriptureMap2DModes.Viewer && isReadingHistoryEnabled && (
        <>
          <ReadingHistoryUserFiltersSelector />
          <ReadingHistoryTimeline />
        </>
      )}
    </div>
  );
};

// {isUserPresenceEnabled && <UserPresenceSettings />}
