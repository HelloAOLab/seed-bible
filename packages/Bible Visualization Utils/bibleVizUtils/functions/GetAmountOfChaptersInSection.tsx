const { section } = that;

const values = section.map((book: any) => {
  return BibleVizUtils.Data.tags.booksStaticInfo[book.commonName]
    .numberOfChapters;
});
return values.reduce((accumulator, currentValue) => {
  return accumulator + currentValue;
}, 0);
