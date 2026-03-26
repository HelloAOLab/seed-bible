const { piece, data, baseColor, userColor, reading, range } = that;

let color;
if (reading) {
  if (range) {
    color = thisBot.GetHistoryColorByReadingTime({
      baseColor,
      userColor,
      readingTimeSeconds,
    });
  } else {
    color = thisBot.GetHistoryColorByRecency({
      recencyTimeSeconds,
      baseColor,
      userColor,
    });
  }
} else color = BibleVizUtils.Data.tags.historyNullColor;
return color;
