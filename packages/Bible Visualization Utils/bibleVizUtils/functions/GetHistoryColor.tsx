const {piece, data, baseColor, userColor, timestamp} = that;

// if(piece) timestamp = thisBot.GetHistoryEntriesForElement({piece});
// else if(data)
// {
    // const {book, chapter} = data;
    // timestamp = thisBot.GetHistoryEntries({book, chapter, userId});
// }
let color;
if(timestamp)
{
    const deltaTime = (os.localTime - timestamp) * 100000;
    color = thisBot.GetHistoryColorByDeltaTime({deltaTime, baseColor, userColor});
}
else color = BibleVizUtils.Data.tags.historyNullColor
return color;