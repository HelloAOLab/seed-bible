/**
 * Calculates the highlight scales for the book based on its selection state and the section view.
 * @returns {Vector2} - A vector representing the X and Y scales for highlighting.
 * @example
 * const highlightScales = book.GetHighlightScales();
 */

const bookData = BibleStackManager.GetPieceData({ piece: thisBot });
const { sectionData } = BibleStackManager.GetDataChainFromParentDataIds({
  parentDataIds: bookData.parentDataIds,
});
let scaleX, scaleY;
if (
  sectionData?.isInExplodedView &&
  (bookData.isInsideBible ||
    (!bookData.isInsideTestament && !bookData.isInsideSection))
) {
  if (bookData.isSelected) {
    scaleX = sectionData.piece.tags.initialScaleX;
    scaleY = sectionData.piece.tags.initialScaleY;
  } else {
    if (thisBot.tags.explodedViewCustomScale) {
      scaleX =
        thisBot.tags.explodedViewCustomScale.x *
        sectionData.piece.tags.initialScaleX;
      scaleY =
        thisBot.tags.explodedViewCustomScale.y *
        sectionData.piece.tags.initialScaleY;
    } else {
      scaleX = thisBot.tags.initialScaleX;
      scaleY = thisBot.tags.initialScaleY;
      if (
        bookData instanceof StackSectionBookData &&
        thisBot.masks.hasBeenScaledAsBook
      ) {
        scaleX *= 0.9;
        scaleY *= 0.9;
      }
    }
  }
} else {
  scaleX = thisBot.tags.initialScaleX;
  scaleY = thisBot.tags.initialScaleY;
  if (
    bookData instanceof StackSectionBookData &&
    thisBot.masks.hasBeenScaledAsBook
  ) {
    scaleX *= 0.9;
    scaleY *= 0.9;
  }
}
return new Vector2(scaleX, scaleY);
