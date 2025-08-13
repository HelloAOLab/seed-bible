import { useMapViewerContext } from "interactiveBible.managers.MapsManager.MapViewerContext"
import { MapViewerSettings } from "interactiveBible.managers.MapsManager.MapViewerSettings"
import { MapTool } from "interactiveBible.managers.MapsManager.MapTool"

export const MapViewerContainer = () => {
    const {
        mode,
        arrangementIndex, 
        selection, 
        isInSelectionMode,
        onChapterClick,
        onChapterClickDependencies,
        onChapterClickAndHold,
        onBookNameClickAndHold,
        onBookNameClickAndHoldDependencies,
        project,
        selectedChaptersKeys,
        onSelectionModeCheckboxClick,
        onSelectionModeDoneButtonClick,
        onStateSetterOptionClick,
        onSelectionModeClearSelectionButtonClick,
        showingAllChapters,
        showLabels, 
        setShowLabels

    } = useMapViewerContext();

    const requiredParentContext = {
        mode, 
        arrangementIndex, 
        selection,
        isInSelectionMode,
        onChapterClick,
        onChapterClickDependencies,
        onChapterClickAndHold,
        onBookNameClickAndHold,
        onBookNameClickAndHoldDependencies,
        project,
        selectedChaptersKeys,
        onSelectionModeCheckboxClick,
        onSelectionModeDoneButtonClick,
        onStateSetterOptionClick,
        onSelectionModeClearSelectionButtonClick,
        showingAllChapters,
        showLabels, 
        setShowLabels
    }

    return (
        <div className="mapViewerContainer">
            <MapViewerSettings />
            <MapTool parentContext={requiredParentContext} />
        </div>
    )
}