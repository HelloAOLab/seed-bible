const { bookName } = that;

const { chaptersInfo } = BibleVizUtils.Data.tags.booksStaticInfo[bookName];
const amountOfRows = Math.ceil(
  chaptersInfo.length /
    BibleVizUtils.Data.BibleLayoutMeasurements.BookMaxAmountOfColumns
);
const height =
  amountOfRows * BibleVizUtils.Data.BibleLayoutMeasurements.ChapterHeight +
  BibleVizUtils.Data.BibleLayoutMeasurements.ChapterPadding * 2 +
  BibleVizUtils.Data.BibleLayoutMeasurements.ChapterGap * (amountOfRows - 1);
return height;
