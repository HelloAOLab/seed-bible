import { useMapViewerContext } from "interactiveBible.managers.MapsManager.MapViewerContext"
import { ProjectChapterState } from "interactiveBible.managers.MapsManager.MapTool"

const {useState, useCallback} = os.appHooks;

export const ChapterStateSetter = () => {
    
    const { selectedChaptersKeys, setChapterNewState, clearSelection, ProjectStateStyle } = useMapViewerContext();

    const [selectedState, setSelectedState] = useState(ProjectChapterState.NotStarted)

    const handleConfirm = useCallback(() => {
        const info = selectedChaptersKeys.map((key) => {
            return {key, state: selectedState}
        })
        setChapterNewState(info);
        clearSelection()
    }, [selectedState, selectedChaptersKeys])

    const getOptionContent = useCallback((key) => {
        let title;
        
        switch(key)
        {
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
        <div className="chapterStateSetter">
            {`Set ${selectedChaptersKeys.length} chapter${selectedChaptersKeys.length === 1 ? "" : "s"} as `}
            <select value={selectedState} onChange={(e) => {setSelectedState(e.target.value)}} name="states" id="state-select">
                {Object.keys(ProjectChapterState).map((state) => {
                    if(state === ProjectChapterState.Unset) return null;

                    return <option value={state}>{getOptionContent(state)}</option>
                })}
            </select>
            <button onClick={handleConfirm}>
                <span className="material-symbols-outlined">check</span>
            </button>
        </div>
    )
}