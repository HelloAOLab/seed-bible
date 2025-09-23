import { SelectionOptions } from "bibleLayout2D.main.SelectionOptions"
import { ProjectStateSetterOption } from "bibleLayout2D.main.ProjectStateSetterOption"
import { useBibleLayout2DContext } from "bibleLayout2D.main.BibleLayout2DContext"

const {useCallback} = os.appHooks;

export const ProjectStateSetter = () => {
    
    const { 
        isInSelectionMode, 
        projectStateStyle, 
        ProjectChapterState,
        onSelectionModeCheckboxClick,
        onSelectionModeDoneButtonClick,
        onStateSetterOptionClick,
        onSelectionModeClearSelectionButtonClick
    } = useBibleLayout2DContext()

    const getOptionContent = useCallback((key) => {
        let title;
        
        switch(key)
        {
            case ProjectChapterState.None: title = "None"; break;
            case ProjectChapterState.Assigned: title = "Assigned"; break;
            case ProjectChapterState.InProgress: title = "In Progress"; break;
            case ProjectChapterState.NeedsReview: title = "Needs Review"; break;
            case ProjectChapterState.Completed: title = "Completed"; break;
            default: throw new Error("Not found key", {key});
        }

        const style = projectStateStyle[key];

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
                {isInSelectionMode && <SelectionOptions handleClearSelectionClick={onSelectionModeClearSelectionButtonClick} handleDoneClick={onSelectionModeDoneButtonClick} />}
            </div>

            {isInSelectionMode && <div>
                <span>Status:</span>
                {Object.keys(ProjectChapterState).map((state) => { return <ProjectStateSetterOption 
                    content={getOptionContent(state)}
                    onClick={() => {onStateSetterOptionClick(state)}}
                /> })}
            </div> }
        </div>
    )
}