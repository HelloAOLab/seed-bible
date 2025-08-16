const {bookName} = that;

const {chaptersInfo} = InteractiveBibleData.tags.booksStaticInfo[bookName];
const amountOfRows = Math.ceil(chaptersInfo.length / InteractiveBibleData.tags.BibleLayoutMeasurements.Book2DMaxAmountOfColumns);
const height = (amountOfRows * InteractiveBibleData.tags.BibleLayoutMeasurements.Chapter2DHeight) + (InteractiveBibleData.tags.BibleLayoutMeasurements.Chapter2DPadding * 2) + (InteractiveBibleData.tags.BibleLayoutMeasurements.Chapter2DGap * (amountOfRows - 1))
return height;