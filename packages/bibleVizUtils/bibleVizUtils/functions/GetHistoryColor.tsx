const {element, data} = that;

let entries;
if(element) entries = thisBot.GetHistoryEntriesForElement({element});
else if(data)
{
    const {typeOfElement, key} = data;
    entries = thisBot.GetHistoryEntries({typeOfElement, key});
}
let color;
if(entries.length > 0)
{
    const entriesDeltaTime = entries.map((entry) => {return os.localTime - entry.date.getTime()});
    color = thisBot.GetHistoryColorByDeltaTime({deltaTime: entriesDeltaTime[entriesDeltaTime.length - 1]});
}
else color = BibleVizUtils.Data.tags.historyNullColor
return color;
