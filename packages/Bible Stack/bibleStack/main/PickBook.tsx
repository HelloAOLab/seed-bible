import type { StackSectionData } from "bibleVizUtils.models.entities.StackSectionData";
import { GetBotScales } from "bibleVizUtils.functions.index";
import type { Easing } from "../../../../typings/AuxLibraryDefinitions";
/**
 * Handles the ejection of a book from a section, animating its movement.
 *
 * @param {Object} that - Object that contains important data for the function.
 * @param {StackBookData} that.sectionData - Data related to the section containing the book.
 * @param {StackBookData} that.bookName - The name of the book that will be ejected.
 * @returns {Promise<void>} - Resolves when the book ejection animation completes.
 * @throws {Error} - Throws an error if the chapter animation fails.
 * @example
 * thisBot.PickBook({sectionData: someSectionData, bookData: someBookData})
 */

const {
  sectionData,
  bookName,
}: {
  sectionData: StackSectionData;
  bookName: string;
} = that;

const dimension = os.getCurrentDimension();
const positionYOffset = -3;
const duration = 0.5;
const movementYEasing: Easing = { type: "linear", mode: "inout" };
const movementZEasing: Easing = { type: "cubic", mode: "in" };
const bookData = sectionData.findBookByPieceInfoProperty(
  "commonName",
  bookName
);

if (!bookData) {
  console.warn("bookData not found at PickBook");
  return;
}

const bookPiece = bookData.piece;

if (!bookPiece) {
  console.warn("bookPiece not found at PickBook");
  return;
}

const sectionShadow = sectionData.shadow;

if (!sectionShadow) {
  console.warn("sectionShadow not found at PickBook");
  return;
}

const bookPosition = getBotPosition(bookPiece, dimension);
const sectionShadowPosition = getBotPosition(sectionShadow, dimension);
const sectionShadowScales = GetBotScales(sectionShadow);
const newPositionY =
  sectionShadowPosition.y - sectionShadowScales.y / 2 + positionYOffset;
await Promise.all([
  animateTag(bookPiece, {
    fromValue: {
      [dimension + "X"]: bookPosition.x,
      [dimension + "Y"]: bookPosition.y,
    },
    toValue: {
      [dimension + "X"]: sectionShadowPosition.x,
      [dimension + "Y"]: newPositionY,
    },
    duration,
    easing: movementYEasing,
  }),
  animateTag(bookPiece, dimension + "Z", {
    toValue: 0,
    duration,
    easing: movementZEasing,
  }),
]);
await thisBot.PullOutPieceFromParent({ pieceData: bookData, sectionData });
thisBot.OnStackPieceDrop({ data: bookData, piece: bookPiece });
