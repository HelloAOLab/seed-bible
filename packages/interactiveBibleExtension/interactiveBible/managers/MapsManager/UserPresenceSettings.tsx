import { UsersSelector } from "interactiveBible.managers.MapsManager.UsersSelector"
import { ModesSelector } from "interactiveBible.managers.MapsManager.ModesSelector"
import { TimeFrameSetter } from "interactiveBible.managers.MapsManager.TimeFrameSetter"
import { ContentVisualizationSetter } from "interactiveBible.managers.MapsManager.ContentVisualizationSetter"
import { useMapToolContext } from "interactiveBible.managers.MapsManager.MapToolContext"

export const UserPresenceSettings = () => {
    
    const { modes } = useMapToolContext();

    return (
        <div className="userPresenceSettings">
            <UsersSelector />
            <ModesSelector />
            {false && modes.get("Reading") && <TimeFrameSetter /> }
            {modes.get("Content") && <ContentVisualizationSetter />}
        </div>
    )
}