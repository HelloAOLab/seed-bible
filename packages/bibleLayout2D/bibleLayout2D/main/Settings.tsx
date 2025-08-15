import { UserPresenceSettings } from "bibleLayout2D.main.UserPresenceSettings"
import { useBibleLayout2DContext } from "bibleLayout2D.main.BibleLayout2DContext"
import {ProjectFiltersSelector} from "bibleLayout2D.main.ProjectFiltersSelector"
import { ProjectStateSetter } from "bibleLayout2D.main.ProjectStateSetter"

export const Settings = () => {
    const { isUserPresenceEnabled, mode, BibleLayout2DModes, project, isInSelectionMode } = useBibleLayout2DContext();

    if(mode !== BibleLayout2DModes.Project || !project) return null;

    return (
        <div className="mapSettings">
            {isUserPresenceEnabled && <UserPresenceSettings />}
            {mode === BibleLayout2DModes.Project && project && <>
                <ProjectStateSetter />
                {!isInSelectionMode && <ProjectFiltersSelector />}
            </>}
        </div>
    )
}
