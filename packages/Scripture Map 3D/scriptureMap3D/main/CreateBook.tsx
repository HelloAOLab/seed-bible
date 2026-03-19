import { LayoutBookData } from "bibleVizUtils.models.entities.LayoutBookData";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import type { LayoutChapterData } from "bibleVizUtils.models.entities.LayoutChapterData";

const {
  bookInfo,
  layoutDataId,
  arrangementIndex,
  testamentIndex,
  sectionIndex,
} = that;
const parentDataIds = { layoutId: layoutDataId };
const creationParams = { arrangementIndex, testamentIndex, sectionIndex };
const bookStaticInfo = BibleVizDataRepository.getBookStaticInfo(
  bookInfo.commonName
);
if (!bookStaticInfo) {
  console.error("bookStaticInfo not found at CreateBook");
  return;
}

const layoutBookId = uuid();

const chaptersData = await Promise.all(
  bookStaticInfo.chaptersInfo.map((chapterInfo): Promise<LayoutChapterData> => {
    return thisBot.CreateChapter({
      chapterInfo,
      layoutDataId,
      layoutBookId: layoutBookId,
    });
  })
);

const layoutBookData = new LayoutBookData({
  childrenData: chaptersData,
  id: layoutBookId,
  piece: undefined,
  pieceInfo: bookInfo,
  isSelected: false,
  parentDataIds,
  creationParams,
});

thisBot.vars.layoutBooksData.push(layoutBookData);
return layoutBookData;
