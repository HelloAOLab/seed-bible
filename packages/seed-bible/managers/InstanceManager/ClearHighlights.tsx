let count = 0;
const maxCount = 1000;
while(thisBot.masks.highlightHistoryIndex >= 0)
{
    thisBot.TryUndoHighlight();
    count++
    if(count >= maxCount) break;
}
thisBot.vars.highlightHistory.splice(thisBot.masks.highlightHistoryIndex + 1, Infinity);