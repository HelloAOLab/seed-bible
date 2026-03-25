import type { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import { LabelsRepository } from "bibleVizUtils.data.LabelsRepository";
/**
 * Hides chapters of the book and releases their resources if they are currently shown.
 * @param {Object} [that] - Optional parameter containing additional data.
 * @param {string} [that.bibleId] - The ID of the Bible to check against.
 * @example
 * book.HideChapters();
 */

if (thisBot.tags.isBaseStackBook) return;
const {
  bibleId,
}: {
  bibleId?: string;
} = that ?? {};
const bookData = await (BibleStackManager.GetPieceData({
  piece: thisBot,
}) as Promise<StackBookData | undefined>);

if (!bookData) {
  throw new Error("bookData not found at HideChapters");
}

const bookBibleId = bookData.getParentId("stackBibleId");

if (
  !thisBot.masks.isShowingChapters ||
  (bibleId && (!bookBibleId || bibleId !== bookBibleId))
)
  return;
// const dimension = os.getCurrentDimension();
setTagMask(thisBot, "isShowingChapters", false);
thisBot.vars.previousHighlightedChapterData = null;
for (const chapterData of bookData.childrenData) {
  if (chapterData.isActive && chapterData.isInsideBook) {
    if (!chapterData.piece) {
      console.warn("chapterData.piece not defined at HideChapters");
      continue;
    }
    const infoLabelTransformer = LabelsRepository.getLabelTransformerByOwner(
      chapterData.piece
    );
    if (infoLabelTransformer)
      ObjectPooler.ReleaseObject({
        obj: infoLabelTransformer,
        tag: infoLabelTransformer.tags.poolTag,
      });

    ObjectPooler.ReleaseObject({
      obj: chapterData.piece,
      tag: chapterData.piece.tags.poolTag,
    });
    chapterData.resetData();
  }
}
