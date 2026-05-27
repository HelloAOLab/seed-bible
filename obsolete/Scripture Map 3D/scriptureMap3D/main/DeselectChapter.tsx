import type { LayoutChapterData } from "bibleVizUtils.models.entities.LayoutChapterData";
import { tryHideIndicators } from "bibleVizUtils.controllers.userPresence.activityIndicatorsController";
import type { LayoutBibleData } from "bibleVizUtils.models.entities.LayoutBibleData";
const {
  chapterData,
  layoutData,
}: {
  chapterData: LayoutChapterData;
  layoutData: LayoutBibleData;
} = that;

if (!chapterData.piece) {
  throw new Error("chapterData.piece not defined at DeselectChapter");
}

chapterData.deselect();
tryHideIndicators(chapterData.piece);
const previousLinkedChapter = getBot("lineTo", chapterData.piece.id);
if (layoutData.currentSelectedChapterData?.id === chapterData.id) {
  if (previousLinkedChapter) {
    const previousChapterData = await thisBot.GetPieceData({
      piece: previousLinkedChapter,
    });
    if (!previousChapterData) {
      throw new Error("previousChapterData not found at DeselectChapter");
    }
    layoutData.selectChapterData(previousChapterData);
  } else layoutData.clearSelectedChapterData();
}
if (previousLinkedChapter) previousLinkedChapter.tags.lineTo = null;
chapterData.piece.tags.lineTo = null;
return chapterData.piece.Deselect();
