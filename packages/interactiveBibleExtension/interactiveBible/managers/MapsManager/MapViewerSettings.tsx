import { useMapViewerContext } from "interactiveBible.managers.MapsManager.MapViewerContext"
import { MapViewerModeSelector } from "interactiveBible.managers.MapsManager.MapViewerModeSelector"
import { MapToolModes } from "interactiveBible.managers.MapsManager.MapTool"
import { MapViewerNewProjectName } from "interactiveBible.managers.MapsManager.MapViewerNewProjectName"
import { MapViewerSelectionOptions } from "interactiveBible.managers.MapsManager.MapViewerSelectionOptions"
import { ProjectSelector } from "interactiveBible.managers.MapsManager.ProjectSelector"

export const MapViewerSettings = () => {
    
    const { mode, projects, saveSelection, clearSelection, setShowingAllChapters } = useMapViewerContext();
    
    return (
        <div className="mapViewerSettings">
            <MapViewerModeSelector />
            {mode === MapToolModes.Checkbox && <>
                <MapViewerNewProjectName />
                <MapViewerSelectionOptions handleClearSelectionClick={clearSelection} handleDoneClick={saveSelection} />
            </>}
            {mode === MapToolModes.Project && (projects.length > 0 ? <>
                <ProjectSelector />
            </> : <span>
                No available projects
            </span>)}
            <button
                style={{
                    appearance: "none",
                    padding: "12px",
                    border: "none",
                    borderRadius: "4px"
                }}
                onClick={() => {
                setShowingAllChapters(prev => !prev)
            }} >Toggle show chapters</button>
        </div>
    )
}