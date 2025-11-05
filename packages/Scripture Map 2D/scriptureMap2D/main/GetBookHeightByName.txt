const {bookName} = that;

const {chaptersInfo} = BibleVizUtils.Data.tags.booksStaticInfo[bookName];
const amountOfRows = Math.ceil(chaptersInfo.length / BibleVizUtils.Data.tags.BibleLayoutMeasurements.Book2DMaxAmountOfColumns);
const height = (amountOfRows * BibleVizUtils.Data.tags.BibleLayoutMeasurements.Chapter2DHeight) + (BibleVizUtils.Data.tags.BibleLayoutMeasurements.Chapter2DPadding * 2) + (BibleVizUtils.Data.tags.BibleLayoutMeasurements.Chapter2DGap * (amountOfRows - 1))
return height;