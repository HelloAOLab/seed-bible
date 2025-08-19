const { layoutData, newDateFormat } = that;

layoutData.currentDateFormat = newDateFormat;

layoutData.childrenStructures.forEach((layoutBookStructure) => {
    let newLabel;
    switch(newDateFormat)
    {
        case DateFormats.ElapsedYears: {
            newLabel = layoutBookStructure.elapsedYearsRange
        }
        break;
        case DateFormats.HistoricalDate: {
            newLabel = layoutBookStructure.historicalDateRange
        }
        break;
    }
    setTag(layoutBookStructure.dateLabel, "label", newLabel);
});
