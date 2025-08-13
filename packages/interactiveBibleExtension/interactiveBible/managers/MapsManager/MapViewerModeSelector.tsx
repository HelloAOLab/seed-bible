import { useMapViewerContext } from "interactiveBible.managers.MapsManager.MapViewerContext"
import { MapToolModes } from "interactiveBible.managers.MapsManager.MapTool"
const { useMemo } = os.appHooks;

export const MapViewerModeSelector = () => {
    
    const {mode, handleModeSelectorClick} = useMapViewerContext();

    const options = useMemo(() => {
        return [
            {title: "Explore", mode: MapToolModes.Viewer},
            {title: "New project", mode: MapToolModes.Checkbox},
            {title: "Projects", mode: MapToolModes.Project}
        ]
    }, [])
    
    return (
        <div className="modeSelector">
            {options.map((option) => {
                return <div className={`modeSelectorOption${option.mode === mode ? " selected" : ""}`} onClick={() => {handleModeSelectorClick(option.mode)}} >{option.title}</div>
            })}
        </div>
    )
}