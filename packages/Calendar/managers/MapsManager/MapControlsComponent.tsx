import { useMapPanelContext } from "managers.MapsManager.MapPanelContext"

export const MapControls = () => {

    const { handleZoomIn, handleZoomOut, handleLabelsToggle, handleShowAllChaptersToggle, showingAllChapters } = useMapPanelContext();
    
    return (
        <div className="mapControls">
            <button onClick={handleZoomOut}><span class="material-symbols-outlined">zoom_out</span></button>
            <button onClick={handleZoomIn}><span class="material-symbols-outlined">zoom_in</span></button>
            <button onClick={handleLabelsToggle}><span class="material-symbols-outlined">sell</span></button>
            <button onClick={handleShowAllChaptersToggle}><span class="material-symbols-outlined">{showingAllChapters ? "visibility_off" : "visibility"}</span></button>
        </div>
    )    
}