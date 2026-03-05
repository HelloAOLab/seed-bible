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

const { sectionData, bookName } = that;
const dimension = os.getCurrentDimension();
const positionYOffset = -3;
const duration = 0.5;
const movementYEasing = { type: "linear" };
const movementZEasing = { type: "cubic", mode: "in" };
const bookData = sectionData.childrenData.flat().find((currBookData: any) => {
  return currBookData.pieceInfo.commonName == bookName;
});
const bookPosition = getBotPosition(bookData.piece, dimension);
const sectionShadowPosition = getBotPosition(sectionData.shadow, dimension);
const sectionShadowScales = BibleVizUtils.Functions.GetBotScales(
  sectionData.shadow
);
const newPositionY =
  sectionShadowPosition.y - sectionShadowScales.y / 2 + positionYOffset;
await Promise.all([
  animateTag(bookData.piece, {
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
  animateTag(bookData.piece, dimension + "Z", {
    toValue: 0,
    duration,
    easing: movementZEasing,
  }),
]);
await thisBot.PullOutPieceFromParent({ pieceData: bookData, sectionData });
thisBot.OnStackPieceDrop({ data: bookData, piece: bookData.piece });
