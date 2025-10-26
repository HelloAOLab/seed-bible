import { ScriptureMap2DProvider } from "scriptureMap2D.main.ScriptureMap2DContext"
import { Wrapper } from "scriptureMap2D.main.Wrapper"
import { TimeProvider } from "scriptureMap2D.main.TimeContext";

export const ScriptureMap2DModes = Object.freeze({
    Viewer: "Viewer",
    Checkbox: "Checkbox",
    Project: "Project"
});

export const ProjectChapterState = Object.freeze({
    None: "None",
    Assigned: "Assigned",
    InProgress: "InProgress",
    NeedsReview: "NeedsReview",
    Completed: "Completed",
});

export const ScriptureMap2D = ({parentContext}) => {

    const {mode, project, mapToolProviderRef} = parentContext;

    if(mode === ScriptureMap2DModes.Project && !project) return null
    
    return (
        <>
            <style>{thisBot.tags["ScriptureMap2D.css"]}</style>
            <TimeProvider>
                <ScriptureMap2DProvider 
                    ref={mapToolProviderRef}
                    parentContext={parentContext}
                    ScriptureMap2DModes={ScriptureMap2DModes}
                    ProjectChapterState={ProjectChapterState}
                    >
                    <Wrapper />
                </ ScriptureMap2DProvider>
            </TimeProvider>
        </>
    );
};