import { SelectionOptions } from "scriptureMap2D.main.SelectionOptions";
import { ProjectStateSetterOption } from "scriptureMap2D.components.ui.ProjectStateSetterOption";
import { useProjectStateSetter } from "scriptureMap2D.hooks.useProjectStateSetter";

export const ProjectStateSetter = () => {
  const {
    checkboxIconClass,
    handleCheckboxIconClick,
    checkboxIconContent,
    checkboxTextContent,
    isInSelectionMode,
    handleClearSelectionClick,
    handleDoneClick,
    selectionLabel,
    stateSetterOptionsData,
  } = useProjectStateSetter();

  return (
    <div className="project-state-setter">
      <div>
        <span className="selection-mode-toggle">
          <span onClick={handleCheckboxIconClick} className={checkboxIconClass}>
            {checkboxIconContent}
          </span>
          <span>{checkboxTextContent}</span>
          <span className="material-symbols-outlined">info</span>
        </span>
        {isInSelectionMode && handleClearSelectionClick && handleDoneClick && (
          <SelectionOptions
            handleClearSelectionClick={handleClearSelectionClick}
            handleDoneClick={handleDoneClick}
          />
        )}
      </div>

      {isInSelectionMode && (
        <div>
          <span>{selectionLabel}</span>
          {stateSetterOptionsData.map((data) => (
            <ProjectStateSetterOption {...data} />
          ))}
        </div>
      )}
    </div>
  );
};
