/**
 * Finds and returns the chapter with the most verses in the Bible based on the current arrangement.
 *
 * @returns {number} - The number of verses in the largest chapter found.
 * @example
 * const biggerChapter = thisBot.GetBiggerChapter();
 */

let biggerChapter = thisBot.masks.biggerChapterInBible;
if (!biggerChapter) {
  const arrangementsInfo =
    BibleVizUtils.Data.vars.fixedArrangementsInfo.slice();
  const arrangementIndex = BibleVizUtils.Functions.GetCurrentArrangementIndex();
  const arrangement = arrangementsInfo[arrangementIndex];

  biggerChapter = 0;
  let chapterInfo;

  for (const testament of arrangement.testaments) {
    for (const sectionInfo of testament.sections) {
      for (const book of sectionInfo.books) {
        const { chaptersInfo } =
          BibleVizUtils.Data.tags.booksStaticInfo[book.commonName];
        if (chaptersInfo) {
          for (let i = 0; i < chaptersInfo.length; i++) {
            chapterInfo = chaptersInfo[i];
            if (chapterInfo.amountOfVerses > biggerChapter) {
              biggerChapter = chapterInfo.amountOfVerses;
            }
          }
        }
      }
    }
  }

  setTagMask(thisBot, "biggerChapterInBible", biggerChapter);
}

return biggerChapter;
