// import { UserPresenceSettings } from "scriptureMap2D.main.UserPresenceSettings"
import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";
import { ProjectFiltersSelector } from "scriptureMap2D.main.ProjectFiltersSelector";
import { ProjectStateSetter } from "scriptureMap2D.main.ProjectStateSetter";
import { ReadingHistoryUserFiltersSelector } from "scriptureMap2D.main.ReadingHistoryUserFiltersSelector";
import { ReadingHistoryTimeline } from "scriptureMap2D.main.ReadingHistoryTimeline";
import { useReadingHistoryContext } from "scriptureMap2D.main.ReadingHistoryContext";

const { useState } = os.appHooks;

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

  const [collapsed, setCollapsed] = useState(false);

  if (
    (mode === ScriptureMap2DModes.Project && !project) ||
    (mode === ScriptureMap2DModes.Viewer &&
      isReadingHistoryEnabled &&
      usersAuthId.length === 0)
  )
    return null;

  return (
    <div className={`mapSettings${collapsed ? " collapsed" : ""}`}>
      <span
        onClick={() => {
          setCollapsed((prev) => !prev);
        }}
        className="material-symbols-outlined collapse-toggle"
      >
        {collapsed ? "keyboard_arrow_down" : "keyboard_arrow_up"}
      </span>
      {mode === ScriptureMap2DModes.Project && project && (
        <>
          <ProjectStateSetter />
          {!isInSelectionMode && <ProjectFiltersSelector />}
        </>
      )}
      {mode === ScriptureMap2DModes.Viewer &&
        isReadingHistoryEnabled &&
        usersAuthId?.length > 0 && (
          <>
            <ReadingHistoryUserFiltersSelector />
            <ReadingHistoryTimeline />
          </>
        )}
    </div>
  );
};

// {isUserPresenceEnabled && <UserPresenceSettings />}
