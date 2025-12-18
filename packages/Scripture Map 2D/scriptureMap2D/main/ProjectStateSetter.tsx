import { SelectionOptions } from "scriptureMap2D.main.SelectionOptions";
import { ProjectStateSetterOption } from "scriptureMap2D.main.ProjectStateSetterOption";
import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";

const { useSideBarContext } = await import("app.hooks.sideBar");

const { useCallback } = os.appHooks;

export const ProjectStateSetter = () => {
  const { t } = useSideBarContext();
  const {
    isInSelectionMode,
    projectStateStyle,
    ProjectChapterState,
    onSelectionModeCheckboxClick,
    onSelectionModeDoneButtonClick,
    onStateSetterOptionClick,
    onSelectionModeClearSelectionButtonClick,
  } = useScriptureMap2DContext();

  const getOptionContent = useCallback(
    (key) => {
      let title;

      switch (key) {
        case ProjectChapterState.None:
          title = t("stateNone");
          break;
        case ProjectChapterState.Assigned:
          title = t("stateAssigned");
          break;
        case ProjectChapterState.InProgress:
          title = t("stateInProgress");
          break;
        case ProjectChapterState.NeedsReview:
          title = t("stateNeedsReview");
          break;
        case ProjectChapterState.Completed:
          title = t("stateCompleted");
          break;
        default:
          throw new Error("Not found key", { key });
      }

      const style = projectStateStyle[key];

      return [
        <div
          style={{
            backgroundColor: style.backgroundColor,
            borderStyle: style.borderStyle,
            borderColor: style.borderColor,
          }}
          className="filter-option-icon"
        ></div>,
        title,
      ];
    },
    [t]
  );

  return (
    <div className="project-state-setter">
      <div>
        <span className="selection-mode-toggle">
          <span
            onClick={onSelectionModeCheckboxClick}
            className={`material-symbols-outlined${isInSelectionMode ? " checked" : ""}`}
          >
            {isInSelectionMode ? "check" : ""}
          </span>
          <span>{t("selectionMode")}</span>
          <span className="material-symbols-outlined">info</span>
        </span>
        {isInSelectionMode && (
          <SelectionOptions
            handleClearSelectionClick={onSelectionModeClearSelectionButtonClick}
            handleDoneClick={onSelectionModeDoneButtonClick}
          />
        )}
      </div>

      {isInSelectionMode && (
        <div>
          <span>{t("status")}:</span>
          {Object.keys(ProjectChapterState).map((state) => {
            return (
              <ProjectStateSetterOption
                content={getOptionContent(state)}
                onClick={() => {
                  onStateSetterOptionClick(state);
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
