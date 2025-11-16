const { useState, useCallback, useEffect } = os.appHooks;
import { useMapPanelContext } from "managers.MapsManager.MapPanelContext"

export const Chapter = ({index, bookName}) => {

    const { unsubscribeFromHistoryUpdate, subscribeToHistoryUpdate } = useMapPanelContext();

    const getChapterHistoryColor = useCallback(() => {
        return GetHistoryColor({data: {typeOfElement: BibleElementType.Chapter, key: `${bookName} ${index + 1}`}})
    }, [])

    const [historyColor, setHistoryColor] = useState(getChapterHistoryColor())

    const updateHistoryColor = useCallback(() => {
        setHistoryColor(getChapterHistoryColor())
    }, [])

    useEffect(() => {
        subscribeToHistoryUpdate(updateHistoryColor)
        return () => {unsubscribeFromHistoryUpdate(updateHistoryColor)}
    }, [])
    
    return (
        <div 
            className="chapter"
            style={{
                backgroundColor: historyColor
            }}
        >
            {index + 1}
        </div>
    )
}