let count = 0;
const maxCount = 1000;
while (BibleVizUtils.Data.masks.highlightHistoryIndex >= 0) {
  thisBot.TryUndoHighlight();
  count++;
  if (count >= maxCount) break;
}
BibleVizUtils.Data.vars.highlightHistory.splice(
  BibleVizUtils.Data.masks.highlightHistoryIndex + 1,
  Infinity
);
