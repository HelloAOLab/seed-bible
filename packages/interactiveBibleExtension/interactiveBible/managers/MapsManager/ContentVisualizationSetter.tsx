import { ToggleButton } from "interactiveBible.managers.MapsManager.ToggleButton"
import { useMapToolContext } from "interactiveBible.managers.MapsManager.MapToolContext"

export const ContentVisualizationSetter = () => {
    
    const { ContentVisualizationType, contentVisualization, handleContentVisualizationButtonClick } = useMapToolContext();
    
    return (
        <div className="contentVisualizationSelector">
            {Object.keys(ContentVisualizationType).map((type) => {
                return < ToggleButton name={type} enabled={type === contentVisualization} onClick={() => {handleContentVisualizationButtonClick(type)}} />
            })}
        </div>
    )
}