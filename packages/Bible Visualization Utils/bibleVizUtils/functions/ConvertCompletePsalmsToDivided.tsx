const { chapter } = that;

const dividedPsalmsNames = [
  "1 Psalms",
  "2 Psalms",
  "3 Psalms",
  "4 Psalms",
  "5 Psalms",
];

const dividedPaslmsInfo = dividedPsalmsNames.map((name) => {
  return [name, BibleVizUtils.Data.tags.booksStaticInfo[name]];
});

const psalmInfo = dividedPaslmsInfo.find(([, info]) => {
  return (
    info.startingIndex + 1 <= chapter &&
    chapter <= info.startingIndex + info.numberOfChapters
  );
});

if (psalmInfo) {
  return {
    book: psalmInfo[0],
    bookId: psalmInfo[1].abbreviation,
    chapter: chapter - psalmInfo[1].startingIndex,
  };
}
