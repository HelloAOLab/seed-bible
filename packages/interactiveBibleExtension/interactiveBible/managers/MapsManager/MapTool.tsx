import { MapToolProvider } from "interactiveBible.managers.MapsManager.MapToolContext"
import { MapWrapper } from "interactiveBible.managers.MapsManager.MapWrapper"

export const MapToolModes = Object.freeze({
    Viewer: "Viewer",
    Checkbox: "Checkbox",
    Project: "Project"
});

export const ProjectChapterState = Object.freeze({
    Unset: "Unset",
    NotStarted: "NotStarted",
    InProgress: "InProgress",
    NeedsReview: "NeedsReview",
    Completed: "Completed",
});

export const MapTool = ({parentContext}) => {

    const {mode, project, mapToolProviderRef} = parentContext;

    if(mode === MapToolModes.Project && !project) return null
    
    return (
        <>
            <style>{thisBot.tags["MapTool.css"]}</style>
            <MapToolProvider 
                ref={mapToolProviderRef}
                parentContext={parentContext}
                MapToolModes={MapToolModes}
                ProjectChapterState={ProjectChapterState}
            >
                <MapWrapper />
            </ MapToolProvider>
        </>
    );
};