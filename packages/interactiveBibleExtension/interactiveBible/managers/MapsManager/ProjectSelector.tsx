import { useMapViewerContext } from "interactiveBible.managers.MapsManager.MapViewerContext"

export const ProjectSelector = () => {
    
    const { projects, projectIndex, handleProjectSelectorClick } = useMapViewerContext();
    
    return (
        <div className="projectSelector">
            {projects.map((project, index) => {
                return <div className={`projectSelectorOption${projectIndex === index ? " selected" : ""}`} onClick={() => {handleProjectSelectorClick({index})}} >{project.name}</div>
            })}
        </div>
    )
}