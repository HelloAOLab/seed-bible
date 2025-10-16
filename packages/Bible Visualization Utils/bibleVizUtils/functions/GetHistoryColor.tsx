const {piece, data} = that;

let timestamp;
if(piece) timestamp = thisBot.GetHistoryEntriesForElement({piece});
else if(data)
{
    const {typeOfPiece, book, chapter} = data;
    timestamp = thisBot.GetHistoryEntries({typeOfPiece, book, chapter});
}
let color;
if(timestamp)
{
    const deltaTime = (os.localTime - timestamp);
    color = thisBot.GetHistoryColorByDeltaTime({deltaTime});
}
else color = BibleVizUtils.Data.tags.historyNullColor
return color;