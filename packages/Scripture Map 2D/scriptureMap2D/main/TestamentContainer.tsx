import { TestamentToggle } from "scriptureMap2D.main.TestamentToggle"
import { TestamentContent } from "scriptureMap2D.main.TestamentContent"
import { TestamentContext } from "scriptureMap2D.main.TestamentContext"
import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext"

const { useState,useCallback } = os.appHooks; 

export const TestamentContainer = ({ testament, testamentIndex }) => {
    const { showLabels } = useScriptureMap2DContext();
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