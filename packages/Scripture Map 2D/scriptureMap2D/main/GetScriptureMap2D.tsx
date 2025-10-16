import {ScriptureMap2D, ScriptureMap2DModes} from "scriptureMap2D.main.ScriptureMap2D"

const App = () => {
    return (
        <div style={{
            height: "100%",
            display: "flex",
            flexGrow: "1",
            flexDirection: "column",
            padding: "20px 0",
            backgroundColor: "white"
        }}>
            <ScriptureMap2D parentContext={{
                mode: ScriptureMap2DModes.Viewer,
                arrangementIndex: 0,
                // selection,
                // isInSelectionMode,
                onChapterClick: () => {},
                onChapterClickDependencies: [],
                onChapterClickAndHold: () => {},
                onBookNameClickAndHold: () => {},
                onBookNameClickAndHoldDependencies: [],
                // project,
                // selectedChaptersKeys,
                // onSelectionModeCheckboxClick: handleSelectionModeCheckboxClick,
                // onSelectionModeDoneButtonClick: handleSelectionModeDoneButtonClick,
                // onStateSetterOptionClick: handleStateSetterOptionClick,
                // onSelectionModeClearSelectionButtonClick: clearSelection,
                showingAllChapters: false, // !menuState.areBooksClosed,
                showLabels: true, // !menuState.hideHeadings,
                initialScaleFactor: 0.5,
                initialIsReadingHistoryEnabled: true
            }} />
        </div>
    )
}

return App;