const { piece, data } = that;

let entries;
if (piece) entries = thisBot.GetHistoryEntriesForElement({ piece });
else if (data) {
  const { typeOfPiece, key } = data;
  entries = thisBot.GetHistoryEntries({ typeOfPiece, key });
}
let color;
if (entries.length > 0) {
  const entriesDeltaTime = entries.map((entry) => {
    return os.localTime - entry.date.getTime();
  });
  color = thisBot.GetHistoryColorByDeltaTime({
    deltaTime: entriesDeltaTime[entriesDeltaTime.length - 1],
  });
} else color = BibleVizUtils.Data.tags.historyNullColor;
return color;
