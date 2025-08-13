import { MapViewerSelectionOptions } from "interactiveBible.managers.MapsManager.MapViewerSelectionOptions"
import { ProjectStateSetterOption } from "interactiveBible.managers.MapsManager.ProjectStateSetterOption"
import { useMapToolContext } from "interactiveBible.managers.MapsManager.MapToolContext"

const {useCallback} = os.appHooks;

export const ProjectStateSetter = () => {
    
    const { 
        isInSelectionMode, 
        ProjectStateStyle, 
        ProjectChapterState,
        onSelectionModeCheckboxClick,
        onSelectionModeDoneButtonClick,
        onStateSetterOptionClick,
        onSelectionModeClearSelectionButtonClick
    } = useMapToolContext()

    const getOptionContent = useCallback((key) => {
        let title;
        
        switch(key)
        {
            case ProjectChapterState.Unset: title = "Default"; break;
            case ProjectChapterState.NotStarted: title = "Not Started"; break;
            case ProjectChapterState.InProgress: title = "In Progress"; break;
            case ProjectChapterState.NeedsReview: title = "Needs Review"; break;
            case ProjectChapterState.Completed: title = "Completed"; break;
            default: throw new Error("Not found key", {key});
        }

        const style = ProjectStateStyle[key];

        return [
            <div 
                style={{
                    backgroundColor: style.backgroundColor,
                    borderStyle: style.borderStyle,
                    borderColor: style.borderColor
                }} 
                className="filterOptionIcon"
            >
            </div>, 
            title
        ];
    }, [])

    return (
        <div className="projectStateSetter">
            <div>
                <span className="selectionModeToggle">
                    <span onClick={onSelectionModeCheckboxClick} className={`material-symbols-outlined${isInSelectionMode ? " checked" : ""}`}>{isInSelectionMode ? "check" : ""}</span>
                    <span>Selection mode</span>
                    <span className="material-symbols-outlined">info</span>
                </span>
                {isInSelectionMode && <MapViewerSelectionOptions handleClearSelectionClick={onSelectionModeClearSelectionButtonClick} handleDoneClick={onSelectionModeDoneButtonClick} />}
            </div>

            {isInSelectionMode && <div>
                <span>Mark as:</span>
                {Object.keys(ProjectChapterState).map((state) => { return <ProjectStateSetterOption 
                    content={getOptionContent(state)}
                    onClick={() => {onStateSetterOptionClick(state)}}
                /> })}
            </div> }
        </div>
    )
}