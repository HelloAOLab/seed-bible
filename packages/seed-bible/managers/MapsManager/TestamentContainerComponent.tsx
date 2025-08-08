import { TestamentLine } from "managers.MapsManager.TestamentLineComponent"
import { TestamentContent } from "managers.MapsManager.TestamentContentComponent"
import { TestamentContext } from "managers.MapsManager.TestamentContext"
import { useMapPanelContext } from "managers.MapsManager.MapPanelContext"


const { useState,useCallback } = os.appHooks; 

export const TestamentContainer = ({ testament, testamentIndex }) => {
    const { showLabels } = useMapPanelContext();
    const [showContent, setShowContent] = useState(true); 

    const toggleshowContent = useCallback(() => {
        setShowContent(prev => !prev);
    }, [])
    
    return ( 
        <TestamentContext.Provider value={{ testament, testamentIndex }}>
            <div className="testamentContainer">
                { showLabels && <TestamentLine toggleshowContent={toggleshowContent} /> }
                <TestamentContent hidden={!showContent} />
            </div>
        </ TestamentContext.Provider>
    )
}