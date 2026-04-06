/**
 * Handles the ejection of a chapter from a book, animating its movement.
 *
 * @param {Object} that - Object that contains important data for the function.
 * @param {StackBookData} that.bookData - Data related to the book containing the chapter.
 * @param {number} that.chapterNumber - The number of the chapter being ejected.
 * @returns {Promise<void>} - Resolves when the chapter ejection animation completes.
 * @throws {Error} - Throws an error if the chapter animation fails.
 * @example
 * thisBot.PickChapter({bookData: someBookData, chapterNumber: 1})
 */

import type { StackBookData } from "bibleVizUtils.models.entities.StackBookData";
import type {
  EaseType,
  Easing,
} from "../../../../typings/AuxLibraryDefinitions";

const {
  bookData,
  chapterNumber,
}: {
  bookData: StackBookData;
  chapterNumber: number;
} = that;
const dimension = os.getCurrentDimension();
const positionYOffset = -2;
const duration = 0.5;
const movementYEasing: EaseType = "linear";
const movementZEasing: Easing = { type: "cubic", mode: "in" };
const chapterData = bookData.findChapterByPieceInfoProperty(
  "number",
  chapterNumber
);

if (!chapterData) {
  console.ward("chapterData not found at PickChapter");
  return;
}

const piece = chapterData.piece;

if (!piece) {
  console.warn("piece not found at PickChapter");
  return;
}

const chapterPosition = getBotPosition(piece, dimension);
const newPositionY = chapterPosition.y + positionYOffset;
thisBot.PullOutPieceFromParent({ pieceData: chapterData, bookData });
await Promise.all([
  animateTag(piece, dimension + "Y", {
    toValue: newPositionY,
    duration,
    easing: movementYEasing,
  }),
  animateTag(piece, dimension + "Z", {
    toValue: 0,
    duration,
    easing: movementZEasing,
  }),
]);
setTagMask(piece, "isOnTheGround", true);
