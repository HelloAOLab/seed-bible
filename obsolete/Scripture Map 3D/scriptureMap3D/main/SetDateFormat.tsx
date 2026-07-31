import { DateFormats, type DateFormat } from "bibleVizUtils.models.canvas";
import type { LayoutBibleData } from "bibleVizUtils.models.entities.LayoutBibleData";

const {
  layoutData,
  newDateFormat,
}: {
  layoutData: LayoutBibleData;
  newDateFormat: DateFormat;
} = that;

layoutData.changeDateFormat(newDateFormat);

layoutData.childrenStructures.forEach((layoutBookStructure) => {
  let newLabel;
  switch (newDateFormat) {
    case DateFormats.ElapsedYears:
      {
        newLabel = layoutBookStructure.elapsedYearsRange;
      }
      break;
    case DateFormats.HistoricalDate:
      {
        newLabel = layoutBookStructure.historicalDateRange;
      }
      break;
  }
  setTag(layoutBookStructure.dateLabel, "label", newLabel);
});
