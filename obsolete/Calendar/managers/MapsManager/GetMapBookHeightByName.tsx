const {bookName} = that;

const {chaptersInfo} = StacksManager.tags.booksStaticInfo[bookName];
const amountOfRows = Math.ceil(chaptersInfo.length / MapElementMeasurements.BookMaxAmountOfColumns);
const height = (amountOfRows * MapElementMeasurements.ChapterHeight) + (MapElementMeasurements.ChapterPadding * 2) + (MapElementMeasurements.ChapterGap * (amountOfRows - 1))
return height;