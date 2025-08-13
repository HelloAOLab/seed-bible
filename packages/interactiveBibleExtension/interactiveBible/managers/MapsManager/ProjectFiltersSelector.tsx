import {ProjectFiltersSelectorOption} from "interactiveBible.managers.MapsManager.ProjectFiltersSelectorOption"
import { useMapToolContext } from "interactiveBible.managers.MapsManager.MapToolContext"

const {useMemo, useCallback} = os.appHooks

export const ProjectFiltersSelector = () => {
    const { projectFilters, handleProjectFilterOptionClick, ProjectChapterState, ProjectStateStyle } = useMapToolContext();

    const allSelected = useMemo(() => {
        return Array.from(projectFilters).every(([, value]) => { return value });
    }, [projectFilters])

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
        <div className="projectFiltersSelector">
            <ProjectFiltersSelectorOption 
                content="All" 
                onClick={() => {handleProjectFilterOptionClick("all")}} 
                selected={allSelected} 
            />
            {Array.from(projectFilters).map(([key, value]) => {

                return <ProjectFiltersSelectorOption 
                    content={getOptionContent(key)}
                    onClick={() => {handleProjectFilterOptionClick(key)}} 
                    selected={ allSelected ? false : value} 
                />
            })}
        </div>
    )
}