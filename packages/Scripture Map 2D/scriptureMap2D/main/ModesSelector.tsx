import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext"
import { ToggleButton } from "scriptureMap2D.main.ToggleButton"

export const ModesSelector = () => {
    
    const { modes, handleModeButtonClick } = useScriptureMap2DContext();
    
    return (
        <div className="modesSelector">
            {Array.from(modes).map(([mode, enabled]) => {
                return < ToggleButton name={mode} enabled={enabled} onClick={() => {handleModeButtonClick({mode})}} />
            })}
        </div>
    )
}