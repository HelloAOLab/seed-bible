const { mapData, newDateFormat } = that;

mapData.currentDateFormat = newDateFormat;

mapData.childrenStructures.forEach((mapBookStructure) => {
    let newLabel;
    switch(newDateFormat)
    {
        case DateFormats.ElapsedYears: {
            newLabel = mapBookStructure.elapsedYearsRange
        }
        break;
        case DateFormats.HistoricalDate: {
            newLabel = mapBookStructure.historicalDateRange
        }
        break;
    }
    setTag(mapBookStructure.dateLabel, "label", newLabel);
});
