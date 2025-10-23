import { Tooltip } from "scriptureMap2D.main.Tooltip"
import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext"

const { useState, useCallback, useMemo } = os.appHooks;

const Item = ({ index, selected, content, description, handleItemClick, background, dayRange }) => {

    const [containerRect, setContainerRect] = useState(null);

    const { tooltipAnchor } = useMemo(() => {

        let tooltipAnchor;

        if (containerRect) {
            tooltipAnchor = {
                x: containerRect.left + containerRect.width / 2,
                y: containerRect.top,
            };
        }

        return { tooltipAnchor};
    }, [containerRect]);
    
    return (
        <div 
            onPointerEnter={(e) => setContainerRect(e.currentTarget.getBoundingClientRect())}
            onPointerLeave={() => setContainerRect(null)}
            key={index} 
            className={`readingHistoryTimeline-item${selected ? " selected" : ""}`} 
            onClick={() => {handleItemClick(dayRange)}}
            style={{background}}
        >
            { content }
            { containerRect && <Tooltip direction="up" anchor={tooltipAnchor} content={description} /> }
        </div>
    )
}

export const ReadingHistoryTimeline = () => {
    
    const { 
        readingHistory, 
        readingHistoryRange, 
        handleReadingHistoryRangeSelectorClick, 
        readingHistoryUsersFilters,
        chapterBaseBackgroundColor
    } = useScriptureMap2DContext();

    const firstItemContent = "Overview";

    const handleItemClick = useCallback((range) => {
        handleReadingHistoryRangeSelectorClick(range)
    }, [])
    
    return(
        <div className="readingHistoryTimeline">
            <Item index={-1} key={firstItemContent} selected={!readingHistoryRange} description={firstItemContent} content={firstItemContent} handleItemClick={handleItemClick} />
            {Array.from({ length: 10 }).map((_, index) => {

                const { weekday, day, month, time } = GetPastDateInfo(index)
                const dayRange = GetDayRange(time);
                const description = index === 0 ? "Today" : `${weekday} ${month}/${day}`;
                const selected = readingHistoryRange && readingHistoryRange.start <= time && readingHistoryRange.end >= time;
                let background = chapterBaseBackgroundColor;

                const firstFourSelectedFilters = Array.from(readingHistoryUsersFilters).filter(([userId, selected]) => { 
                    return selected && 
                        Object.keys(readingHistory[userId] ?? {})?.some((bookId) => {
                            return Object.keys(readingHistory[userId][bookId])?.some((chapter) =>{
                                return readingHistory[userId][bookId][chapter]?.some((entry) => {
                                    return BibleVizUtils.Functions.IsValueBetween({value: entry.start, min: dayRange.start, max: dayRange.end}) || 
                                        BibleVizUtils.Functions.IsValueBetween({value: entry.end, min: dayRange.start, max: dayRange.end})
                                })
                            })
                        });
                }).slice(0, 4);

                
                if(firstFourSelectedFilters.length > 0)
                {
                    const colors = firstFourSelectedFilters.map(([userId]) => {
                        const customReading = [];
                        
                        Object.keys(readingHistory[userId] ?? {})?.forEach((bookId) => {
                            Object.keys(readingHistory[userId][bookId])?.forEach((chapter) =>{
                                readingHistory[userId][bookId][chapter]?.forEach((entry) => {
                                    if(BibleVizUtils.Functions.IsValueBetween({value: entry.start, min: dayRange.start, max: dayRange.end}) ||
                                    BibleVizUtils.Functions.IsValueBetween({value: entry.end, min: dayRange.start, max: dayRange.end}))
                                    {
                                        customReading.push({
                                            start: Math.max(entry.start, dayRange.start), 
                                            end: Math.min(entry.end ?? Date.now(), dayRange.end)
                                        })
                                    }
                                })
                            })
                        });
                        
                        return BibleVizUtils.Functions.GetHistoryColor({
                            baseColor: chapterBaseBackgroundColor, 
                            userColor: userId === configBot.id ? BibleVizUtils.Data.tags.myUserColor : (BibleVizUtils.Data.vars.userPresenceData?.[userId]?.user?.color ?? thisBot.vars.FakeReadingHistoryUsersColorMap?.get(userId) ?? "pink"), 
                            reading: customReading,
                            range: dayRange
                        })
                    })
                        
                    background = BibleVizUtils.Functions.GetHistoryColorConicGradient(colors)
                }

                
                return <Item index={index} key={description} selected={selected} description={description} handleItemClick={handleItemClick} background={background} dayRange={dayRange} />
            })}
        </div>
    )
}

function GetPastDateInfo(amount) {
  const MS_PER_DAY = 86400000;

  const date = new Date(os.localTime - (MS_PER_DAY * amount));

  const time = date.getTime()
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const weekday = weekdays[date.getDay()];
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  return { weekday, day, month, year, time };
}

function GetDayRange(timestamp) {
  const date = new Date(timestamp);

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return {
    start: start.getTime(),
    end: end.getTime(),
  };
}
