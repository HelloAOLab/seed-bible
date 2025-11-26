const { piece, data, baseColor, userColor, reading, range } = that;

// if(piece) timestamp = thisBot.GetHistoryEntriesForElement({piece});
// else if(data)
// {
// const {book, chapter} = data;
// timestamp = thisBot.GetHistoryEntries({book, chapter, userId});
// }

let color;
if (reading) {
  if (range) {
    color = thisBot.GetHistoryColorByReadingTime({
      baseColor,
      userColor,
      readingTimeSeconds,
    });

    // color = thisBot.GetHistoryColorByRange({
    //   baseColor,
    //   userColor,
    //   reading,
    //   range,
    // });
  } else {
    color = thisBot.GetHistoryColorByRecency({
      recencyTimeSeconds,
      baseColor,
      userColor,
    });
    // const deltaTime =
    //   os.localTime - (reading?.[reading?.length - 1]?.end ?? Date.now());
    // color = thisBot.GetHistoryColorByDeltaTime({
    //   deltaTime,
    //   baseColor,
    //   userColor,
    // });
  }
} else color = BibleVizUtils.Data.tags.historyNullColor;
return color;
