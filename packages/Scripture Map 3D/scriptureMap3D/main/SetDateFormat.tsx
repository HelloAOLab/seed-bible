const { layoutData, newDateFormat } = that;

layoutData.currentDateFormat = newDateFormat;

layoutData.childrenStructures.forEach((layoutBookStructure) => {
  let newLabel;
  switch (newDateFormat) {
    case BibleVizUtils.Data.tags.DateFormats.ElapsedYears:
      {
        newLabel = layoutBookStructure.elapsedYearsRange;
      }
      break;
    case BibleVizUtils.Data.tags.DateFormats.HistoricalDate:
      {
        newLabel = layoutBookStructure.historicalDateRange;
      }
      break;
  }
  setTag(layoutBookStructure.dateLabel, "label", newLabel);
});
