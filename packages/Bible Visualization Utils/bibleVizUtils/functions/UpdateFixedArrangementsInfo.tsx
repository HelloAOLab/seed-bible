import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";

const currentArrangementName =
  BibleVizDataRepository.getCurrentArrangementName();

BibleVizUtils.Data.vars.fixedArrangementsInfo = [
  ...BibleVizUtils.Data.tags.arrangementsInfo,
  ...BibleVizUtils.Data.vars.customArrangements,
];

thisBot.SetArrangementIndexByName({
  name:
    currentArrangementName ??
    BibleVizUtils.Data.vars.fixedArrangementsInfo[0].name,
});
