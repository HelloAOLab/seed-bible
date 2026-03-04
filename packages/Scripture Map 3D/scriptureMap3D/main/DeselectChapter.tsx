import { tryHideIndicators } from "bibleVizUtils.controllers.userPresence.activityIndicatorsController";
const { chapterData, layoutData } = that;

chapterData.isSelected = false;
tryHideIndicators(chapterData.piece);
const previousLinkedChapter = getBot("lineTo", chapterData.piece.id);
if (layoutData.currentSelectedChapterData?.id == chapterData.id) {
  if (previousLinkedChapter) {
    const previousChapterData = thisBot.GetPieceData({
      piece: previousLinkedChapter,
    });
    layoutData.currentSelectedChapterData = previousChapterData;
  } else layoutData.currentSelectedChapterData = null;
}
if (previousLinkedChapter) previousLinkedChapter.tags.lineTo = null;
chapterData.piece.tags.lineTo = null;
return chapterData.piece.Deselect();
