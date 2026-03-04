import { LayoutBookData } from "bibleVizUtils.classes.LayoutBookData";
import { ParentDataIds } from "bibleVizUtils.classes.ParentDataIds";

const { bookInfo, layoutData, arrangementIndex, testamentIndex, sectionIndex } =
  that;
const parentDataIds = new ParentDataIds({ layoutId: layoutData?.id });
const creationInfo = { arrangementIndex, testamentIndex, sectionIndex };
const layoutBookData = new LayoutBookData({
  id: uuid(),
  piece: null,
  pieceInfo: bookInfo,
  isSelected: false,
  parentDataIds,
  creationInfo,
});

const chaptersData = await Promise.all(
  BibleVizUtils.Data.tags.booksStaticInfo[bookInfo.commonName].chaptersInfo.map(
    (chapterInfo) => {
      return thisBot.CreateChapter({ chapterInfo, layoutData, layoutBookData });
    }
  )
);

chaptersData.forEach((chapterData) => {
  layoutBookData.AddChild(chapterData);
});
thisBot.vars.layoutBooksData.push(layoutBookData);
return layoutBookData;
