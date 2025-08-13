import { useMapToolContext } from "interactiveBible.managers.MapsManager.MapToolContext"

const { useState, useCallback, useMemo } = os.appHooks;

const ZoomLevelOption = ({value, handleZoomLevelClick}) => {

    const { scaleFactor, minScaleFactor } = useMapToolContext();

    const zoom = useMemo(() => {
        return (value * 25) / minScaleFactor.current
    }, [scaleFactor])

    const selected = useMemo(() => {return value === scaleFactor}, [scaleFactor])
    
    return (
        <button onClick={(e) => {handleZoomLevelClick(e, value)}}>
            <span>{`${zoom} %`}</span>
            {selected && <span></span>}
        </button>
    )
}

const ZoomLevelSelector = ({setShowOptions}) => {

    const { setScaleFactor } = useMapToolContext();

    const handleZoomLevelClick = useCallback((e, value) => {
        setShowOptions(false)
        setScaleFactor(value);
    }, [])
    
    return (
        <div 
            onClick={(e) => {e.stopPropagation()}}
            className="zoomLevelSelector"
        >
            <span>Zoom level</span>
            <ZoomLevelOption value={72} handleZoomLevelClick={handleZoomLevelClick} />
            <ZoomLevelOption value={60} handleZoomLevelClick={handleZoomLevelClick} />
            <ZoomLevelOption value={48} handleZoomLevelClick={handleZoomLevelClick} />
            <ZoomLevelOption value={36} handleZoomLevelClick={handleZoomLevelClick} />
            <ZoomLevelOption value={24} handleZoomLevelClick={handleZoomLevelClick} />
            <ZoomLevelOption value={12} handleZoomLevelClick={handleZoomLevelClick} />
        </div>
    )
}

const ZoomButton = ({onClick, children}) => {

    const [hovered, setHovered] = useState(false);

    return (
        <button 
            onPointerEnter={() => {setHovered(true)}}
            onPointerLeave={() => {setHovered(false)}} 
            onClick={onClick}
            className={hovered ? "hovered" : ""}
        >
            {children}
        </button>
    )
}

export const MapControls = () => {

    const { scaleFactor, minScaleFactor } = useMapToolContext();

    const currZoom = useMemo(() => {
        return Math.round((scaleFactor * 25) / minScaleFactor.current)
    }, [scaleFactor])

    const [showOptions, setShowOptions] = useState(false);

    const { handleZoomIn, handleZoomOut, handleLabelsToggle, handleShowAllChaptersToggle, showingAllChapters, handleContentHeatmapToggle } = useMapToolContext();
    
    return (
        <div className="mapControls">
            <div className="zoomContainer">
                <ZoomButton onClick={handleZoomOut}><span className="material-symbols-outlined">remove</span></ZoomButton>
                <ZoomButton onClick={() => {setShowOptions(prev => !prev)}}>
                    <span>{`${currZoom}%`}</span>
                    {showOptions && <ZoomLevelSelector setShowOptions={setShowOptions} />}
                </ZoomButton>
                <ZoomButton onClick={handleZoomIn}><span className="material-symbols-outlined">add</span></ZoomButton>
            </div>




            {/*<>
                <button onClick={handleLabelsToggle}><span class="material-symbols-outlined">sell</span></button>
                {false && <button onClick={handleShowAllChaptersToggle}><span class="material-symbols-outlined">{showingAllChapters ? "visibility_off" : "visibility"}</span></button>}
                <button onClick={handleContentHeatmapToggle}><span class="material-symbols-outlined">description</span></button>
            </>*/}
        </div>
    )    
}