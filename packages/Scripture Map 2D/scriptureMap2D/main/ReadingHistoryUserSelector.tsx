import {ProjectFiltersSelectorOption} from "scriptureMap2D.main.ProjectFiltersSelectorOption"
import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext"

export const ReadingHistoryUserSelector = () => {
    const { handleReadingHistoryUserSelectorClick, readingHistoryUserId, hooksBot } = useScriptureMap2DContext();

    return (
        <div className="readingHistoryUserSelector">
            {Object.keys(hooksBot.vars.tempReadingHistory).map((userId) => {

                return <ProjectFiltersSelectorOption 
                    content={[
                        <div
                            style={{
                                backgroundColor: userId === configBot.id ? BibleVizUtils.Data.tags.myUserColor : BibleVizUtils.Data.vars.userPresenceData[userId].user.color,
                                borderStyle: "solid",
                                borderColor: userId === configBot.id ? BibleVizUtils.Data.tags.myUserColor : BibleVizUtils.Data.vars.userPresenceData[userId].user.color
                            }} 
                            className="filterOptionIcon"
                        >
                        </div>, 
                        userId === configBot.id ? "You": "Guest"
                    ]}
                    onClick={() => {handleReadingHistoryUserSelectorClick(userId)}} 
                    selected={ userId === readingHistoryUserId}
                />
            })}
        </div>
    )
}