/**
 * Calculates the highlight scales for the book based on its selection state and the section view.
 * @returns {Vector2} - A vector representing the X and Y scales for highlighting.
 * @example
 * const highlightScales = book.GetHighlightScales();
 */

import type { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import type { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import { StackSectionBookData } from "bibleVizUtils.models.entities.StackSectionBookData";

const bookData: StackBookData | undefined = BibleStackManager.GetPieceData({
  piece: thisBot,
});

if (!bookData) {
  console.error("bookData not found at GetHighlightScales");
  return null;
}

const {
  sectionData,
}: {
  sectionData: StackSectionData | undefined;
} = await BibleStackManager.GetDataChainFromParentDataIds({
  parentDataIds: bookData.parentDataIds,
});

if (!sectionData) {
  console.error("sectionData not found at GetHighlightScales");
  return null;
}

let scaleX: number | undefined;
let scaleY: number | undefined;

if (
  sectionData.isInExplodedView &&
  (bookData.isInsideBible ||
    (!bookData.isInsideTestament && !bookData.isInsideSection))
) {
  if (!sectionData.piece) {
    console.warn("sectionData.piece not defined at GetHighlightScales");
    return null;
  }
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
