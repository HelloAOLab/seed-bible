import { useMapToolContext } from "interactiveBible.managers.MapsManager.MapToolContext"
import { ToggleButton } from "interactiveBible.managers.MapsManager.ToggleButton"

export const ModesSelector = () => {
    
    const { modes, handleModeButtonClick } = useMapToolContext();
    
    return (
        <div className="modesSelector">
            {Array.from(modes).map(([mode, enabled]) => {
                return < ToggleButton name={mode} enabled={enabled} onClick={() => {handleModeButtonClick({mode})}} />
            })}
        </div>
    )
}