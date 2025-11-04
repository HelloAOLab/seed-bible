import { Tooltip } from "scriptureMap2D.main.Tooltip"
import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext"
import { useTimeContext } from "scriptureMap2D.main.TimeContext"

const { useState, useCallback, useMemo, useEffect, useRef } = os.appHooks;
const { memo } = os.appCompat;

const step = 0.25;
const stepColors = [
    "#E3E3E3",
    "#FFEEA9",
    "#FFBF78",
    "#D36433",
    "#7B4019"
]

const Label = memo(({ gridRow, gridColumn, children, isDay }) => {
    
    const style = useMemo(() => {
        return {gridRow, gridColumn}
    }, [gridRow, gridColumn])
    
    return (
        <div style={style} className={`readingHistoryTimeline-label readingHistoryTimeline-label-${isDay ? "day": "month"}`}
        >
            {children}
        </div>
    )
})

const Item = memo(({ backgroundColor, gridRow, gridColumn, description, handleItemClick, range, readingHistoryRange, id }) => {

    const selected = useMemo(() => {
        return range === readingHistoryRange
    }, [range, readingHistoryRange])
    
    const style = useMemo(() => {
        return {backgroundColor, gridRow, gridColumn}
    }, [backgroundColor, gridRow, gridColumn])

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
            id={id}
            onPointerEnter={(e) => setContainerRect(e.currentTarget.getBoundingClientRect())}
            onPointerLeave={() => setContainerRect(null)}
            style={style}
            className={`readingHistoryTimeline-item${selected ? " selected" : ""}`} 
            onClick={() => {handleItemClick(selected ? null : range)}}
        >
            { containerRect && <Tooltip anchor={tooltipAnchor} content={description} /> }
        </div>
    )
})

export const ReadingHistoryTimeline = () => {
    
    const { 
        filteredReadingHistory, 
        readingHistoryRange, 
        handleReadingHistoryRangeSelectorClick, 
        readingHistoryUsersFilters,
        CHAPTER_BASE_BACKGROUND_COLOR,
        filteredReadingHistoryCount
    } = useScriptureMap2DContext();
    const { tick } = useTimeContext();

    const prevItemsColorMapRef = useRef(new Map());

    const handleItemClick = useCallback((range) => {
        handleReadingHistoryRangeSelectorClick(range)
    }, [])

    const { now, startOfWeek, startOfWeekAYearAgo, weeksCount } = useMemo(() => {
        const now = new Date();

        const getStartOfWeek = (date) => {
            const tempDate = new Date(date);
            tempDate.setDate(tempDate.getDate() - tempDate.getDay());
            tempDate.setHours(0, 0, 0, 0);
            return tempDate;
        };

        const startOfWeek = getStartOfWeek(now);

        const aYearAgo = new Date(now);
        aYearAgo.setFullYear(now.getFullYear() - 1);

        const startOfWeekAYearAgo = getStartOfWeek(aYearAgo);
        
        const MS_PER_WEEK = 1000 * 60 * 60 * 24 * 7;
        const weeksCount = Math.floor(
            (startOfWeek - startOfWeekAYearAgo) / MS_PER_WEEK
        ) + 1;

        return { now, startOfWeek, startOfWeekAYearAgo, weeksCount };
    }, []);
    
    const dayRangesMap = useMemo(() => {
        const map = new Map();
        for (let week = 0; week < weeksCount; week++) 
        {
            for (let day = 0; day < 7; day++) 
            {
                if(week === (weeksCount - 1) && day > now.getDay()) break;
                const dayDate = new Date(startOfWeekAYearAgo);
                dayDate.setDate(dayDate.getDate() + (week * 7) + day);
                const { start, end } = GetDayRange(dayDate.getTime());
                map.set(`${week}-${day}`, { start, end })
            }
        }
        return map;
    }, [weeksCount, startOfWeekAYearAgo]);

    const computeEntriesMap = useCallback((currFilteredReadingHistory, currDayRangesMap) => {
        const dayKeys = Array.from(currDayRangesMap.keys());
        const dayRanges = Array.from(currDayRangesMap.values());
        const entriesMap = new Map( dayKeys.map( (key) => { return [ key, [] ] } ) );
        const now = Date.now();

        const DAY_MS = 1000 * 60 * 60 * 24;
        const firstDayStart = dayRanges[0].start;

        for (const userId in currFilteredReadingHistory) 
        {
            const userEntries = currFilteredReadingHistory[userId];
            for (const bookId in userEntries) 
            {
                const bookEntries = userEntries[bookId];
                for (const chapter in bookEntries) 
                {
                    const chapterEntries = bookEntries[chapter];
                    for (const entry of chapterEntries)
                    {
                        const dayIndex = Math.floor((entry.start - firstDayStart) / DAY_MS);
                        const endDayIndex = Math.floor(((entry.end ?? now) - firstDayStart) / DAY_MS);

                        for (let i = dayIndex; i <= endDayIndex; i++) 
                        {
                            if (i >= 0 && i < dayKeys.length) {
                                entriesMap.get(dayKeys[i]).push(entry);
                            }
                        }
                    }
                }
            }
        }

        return entriesMap
    }, [])

    const [entriesMap, setEntriesMap] = useState(null)

    useEffect(() => {
        const map = computeEntriesMap(filteredReadingHistory, dayRangesMap);
        setEntriesMap(map);
    }, [filteredReadingHistory, dayRangesMap])

    const itemsColorMap = useMemo(() => {
        const colorMap = new Map();

        if(!entriesMap) return colorMap;

        let shouldReassign = false;
        const fullColorTime = filteredReadingHistoryCount * 3600000
        for(let week = 0; week < weeksCount ; week++)
        {
            for(let day = 0; day < 7; day++)
            {
                if(week === (weeksCount - 1) && day > now.getDay()) break;
                
                const key = `${week}-${day}`

                const range = dayRangesMap.get(key);

                const entries = entriesMap.get(key);
                if(entries)
                {
                    const prevColor = prevItemsColorMapRef.current.get(key)
                    const color = BibleVizUtils.Functions.GetHistoryColorByRange({
                        step, 
                        stepColors, 
                        reading: entries, 
                        range, 
                        fullColorTime
                    });
                    if(!shouldReassign && (!prevColor || prevColor !== color)) shouldReassign = true
                    colorMap.set(key, color);
                }
                else
                {
                    throw new Error(`Entries not found for ${key}`)
                }
            }
        }

        if(shouldReassign)
        {
            prevItemsColorMapRef.current = colorMap;
            return colorMap
        }

        return prevItemsColorMapRef.current;
    }, [entriesMap, startOfWeekAYearAgo, tick])

    const items = useMemo(() => {
        const items = [];
        const monthsSet = new Set();
        const monthLabelGridRow = `1 / 2`;
        const dayLabelGridColumn = `1 / 2`;

        items.push(
            <Label
                gridRow={`3 / 4`}
                gridColumn={dayLabelGridColumn}
                isDay={true}
            >
                {`Mon `}
            </Label>,
            <Label
                gridRow={`5 / 6`}
                gridColumn={dayLabelGridColumn}
                isDay={true}
            >
                {`Wed `}
            </Label>,
            <Label
                gridRow={`7 / 8`}
                gridColumn={dayLabelGridColumn}
                isDay={true}
            >
                {`Fri `}
            </Label>
        )

        for(let week = 0; week < weeksCount ; week++)
        {
            for(let day = 0; day < 7; day++)
            {
                if(week === (weeksCount - 1) && day > now.getDay()) break;

                const key = `${week}-${day}`
                const dayDate = new Date(startOfWeekAYearAgo);
                dayDate.setDate(dayDate.getDate() + (week * 7) + (day));
                const time = dayDate.getTime();
                const range = dayRangesMap.get(key);

                const { weekday, day: dayOfTheMonth, month, monthName, year } = GetPastDateInfo(time)
                const description = week === (weeksCount - 1) && day === now.getDay() ? "Today" : `${weekday} ${month}/${dayOfTheMonth}/${year}`;
                const backgroundColor = itemsColorMap?.get?.(key) ?? stepColors[0];
                
                const itemGridRow = `${day + 2} / ${day + 3}`
                const itemGridColumn = `${week + 2} / ${week + 3}`

                if(!monthsSet.has(month))
                {
                    monthsSet.add(month);
                    const monthLabelGridColumn = `${week + 2} / ${week + 4}`
                    const fixedName = BibleVizUtils.Functions.CapitalizeFirstLetter(monthName)
                    items.push(
                        <Label
                            gridRow={monthLabelGridRow}
                            gridColumn={monthLabelGridColumn}
                            isDay={false}
                        >
                            {fixedName}
                        </Label>
                    )
                }
                
                items.push(
                    <Item
                        id={key}
                        key={key}
                        backgroundColor={backgroundColor}
                        gridRow={itemGridRow}
                        gridColumn={itemGridColumn}
                        description={description}
                        range={range}
                        handleItemClick={handleItemClick}
                        readingHistoryRange={readingHistoryRange}
                    />
                )
            }
        }

        return items;
    }, [startOfWeekAYearAgo, now, itemsColorMap, readingHistoryRange])

    useEffect(() => {

        const lastKey = Array.from(dayRangesMap.keys()).pop();
        const element = document.getElementById(lastKey);

        console.log(`[Debug] ReadingHistoryTimeline`, {element})
        
        if (element) {
          element.scrollIntoView({
            behavior: "smooth", // smooth scrolling animation
            block: "center", // scroll so it's centered in the viewport
          });
        }
    }, [])
    
    return(
        <div id={`readingHistoryTimeline`} className="readingHistoryTimeline">
            {items}
        </div>
    )
}

function GetPastDateInfo(time) {
    const date = new Date(time);

    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekday = weekdays[date.getDay()];
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const monthName = date.toLocaleString('en-US', { month: 'short' });

    return { weekday, day, month, monthName, year };
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
