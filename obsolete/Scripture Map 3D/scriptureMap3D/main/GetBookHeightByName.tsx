const {bookName} = that;

const {chaptersInfo} = BibleVizUtils.Data.tags.booksStaticInfo[bookName];
const amountOfRows = Math.ceil(chaptersInfo.length / BibleVizUtils.Data.tags.BibleLayoutMeasurements.Book3DMaxAmountOfColumns);
const height = (amountOfRows * BibleVizUtils.Data.tags.BibleLayoutMeasurements.Chapter3DHeight) + (BibleVizUtils.Data.tags.BibleLayoutMeasurements.Chapter3DPadding * 2) + (BibleVizUtils.Data.tags.BibleLayoutMeasurements.Chapter3DGap * (amountOfRows - 1))
return height;