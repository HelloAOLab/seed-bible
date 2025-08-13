import { useMapViewerContext } from "interactiveBible.managers.MapsManager.MapViewerContext"

export const MapViewerNewProjectName = () => {
    
    const { projectName, handleInputChange } = useMapViewerContext();

    return (
        <input type="text" value={projectName} onChange={handleInputChange} placeholder="Project name"/>
    )
}