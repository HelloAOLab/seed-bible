const { book, chapter } = that;

const dividedPaslmInfo = BibleVizUtils.Data.tags.booksStaticInfo[book];

if (dividedPaslmInfo) {
  return { chapter: chapter + dividedPaslmInfo.startingIndex };
}
