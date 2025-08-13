import { TestamentToggle } from "interactiveBible.managers.MapsManager.TestamentToggle"
import { TestamentContent } from "interactiveBible.managers.MapsManager.TestamentContent"
import { TestamentContext } from "interactiveBible.managers.MapsManager.TestamentContext"
import { useMapToolContext } from "interactiveBible.managers.MapsManager.MapToolContext"


const { useState,useCallback } = os.appHooks; 

export const TestamentContainer = ({ testament, testamentIndex }) => {
    const { showLabels } = useMapToolContext();
    const [showContent, setShowContent] = useState(true); 

    const toggleshowContent = useCallback(() => {
        setShowContent(prev => !prev);
    }, [])
    
    return (
        <TestamentContext.Provider value={{ testament, testamentIndex }}>
            <div className="testamentContainer">
                { showLabels && <TestamentToggle toggleshowContent={toggleshowContent} showingContent={showContent} /> }
                <TestamentContent hidden={!showContent} />
            </div>
        </ TestamentContext.Provider>
    )
}