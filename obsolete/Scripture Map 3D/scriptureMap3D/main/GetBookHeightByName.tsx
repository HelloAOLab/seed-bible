import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
const { bookName } = that;

const { chaptersInfo } = BibleVizUtils.Data.tags.booksStaticInfo[bookName];
const amountOfRows = Math.ceil(
  chaptersInfo.length /
    BibleVizDataRepository.getBibleLayoutMeasurement("Book3DMaxAmountOfColumns")
);
const height =
  amountOfRows *
    BibleVizDataRepository.getBibleLayoutMeasurement("Chapter3DHeight") +
  BibleVizDataRepository.getBibleLayoutMeasurement("Chapter3DPadding") * 2 +
  BibleVizDataRepository.getBibleLayoutMeasurement("Chapter3DGap") *
    (amountOfRows - 1);
return height;
