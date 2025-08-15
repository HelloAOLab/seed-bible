import { BibleLayout2DProvider } from "bibleLayout2D.main.BibleLayout2DContext"
import { Wrapper } from "bibleLayout2D.main.Wrapper"

export const BibleLayout2DModes = Object.freeze({
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

export const BibleLayout2D = ({parentContext}) => {

    const {mode, project, mapToolProviderRef} = parentContext;

    if(mode === BibleLayout2DModes.Project && !project) return null
    
    return (
        <>
            <style>{thisBot.tags["BibleLayout2D.css"]}</style>
            <BibleLayout2DProvider 
                ref={mapToolProviderRef}
                parentContext={parentContext}
                BibleLayout2DModes={BibleLayout2DModes}
                ProjectChapterState={ProjectChapterState}
            >
                <Wrapper />
            </ BibleLayout2DProvider>
        </>
    );
};