import { UserPresenceSettings } from "interactiveBible.managers.MapsManager.UserPresenceSettings"
import { useMapToolContext } from "interactiveBible.managers.MapsManager.MapToolContext"
import {ProjectFiltersSelector} from "interactiveBible.managers.MapsManager.ProjectFiltersSelector"
import { ProjectStateSetter } from "interactiveBible.managers.MapsManager.ProjectStateSetter"

export const MapSettings = () => {
    const { isUserPresenceEnabled, mode, MapToolModes, project, isInSelectionMode } = useMapToolContext();

    if(mode!== MapToolModes.Project || !project) return null;

    return (
        <div className="mapSettings">
            {isUserPresenceEnabled && <UserPresenceSettings />}
            {mode === MapToolModes.Project && project && <>
                <ProjectStateSetter />
                {!isInSelectionMode && <ProjectFiltersSelector />}
            </>}
        </div>
    )
}
