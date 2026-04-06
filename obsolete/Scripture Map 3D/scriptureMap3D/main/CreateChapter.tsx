import type { ChapterInfo } from "bibleVizUtils.data.BibleVizDataRepository";
import { LayoutChapterData } from "bibleVizUtils.models.entities.LayoutChapterData";

const {
  chapterInfo,
  layoutDataId,
  layoutBookId,
}: {
  chapterInfo: ChapterInfo;
  layoutDataId: string | undefined;
  layoutBookId: string | undefined;
} = that;
const parentDataIds = {
  layoutId: layoutDataId,
  layoutBookId,
};
const chapterData = new LayoutChapterData({
  id: uuid(),
  pieceInfo: chapterInfo,
  parentDataIds,
  originalLayoutId: layoutDataId,
});
thisBot.vars.layoutChaptersData.push(chapterData);
return chapterData;
