import { LabelsRepository } from "bibleVizUtils.data.LabelsRepository";
/**
 * Hides chapters of the book and releases their resources if they are currently shown.
 * @param {Object} [that] - Optional parameter containing additional data.
 * @param {string} [that.bibleId] - The ID of the Bible to check against.
 * @example
 * book.HideChapters();
 */

if (thisBot.tags.isBaseStackBook) return;
const { bibleId } = that ?? {};
const bookData = BibleStackManager.GetPieceData({ piece: thisBot });
if (
  !thisBot.masks.isShowingChapters ||
  (bibleId &&
    (!bookData.parentDataIds.stackBibleId ||
      bibleId !== bookData.parentDataIds.stackBibleId))
)
  return;
// const dimension = os.getCurrentDimension();
setTagMask(thisBot, "isShowingChapters", false);
thisBot.vars.previousHighlightedChapterData = null;
for (const chapterData of bookData.childrenData) {
  if (chapterData.isActive && chapterData.isInsideBook) {
    if (chapterData.piece) {
      const infoLabelTransformer = LabelsRepository.getLabelTransformerByOwner(
        chapterData.piece
      );
      if (infoLabelTransformer)
        ObjectPooler.ReleaseObject({
          obj: infoLabelTransformer,
          tag: infoLabelTransformer.tags.poolTag,
        });
    }

    ObjectPooler.ReleaseObject({
      obj: chapterData.piece,
      tag: chapterData.piece.tags.poolTag,
    });
    chapterData.ResetData();
  }
}
