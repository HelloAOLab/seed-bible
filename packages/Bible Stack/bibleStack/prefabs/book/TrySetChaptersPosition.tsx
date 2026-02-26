import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import { GetBotScales } from "bibleVizUtils.functions.index";
/**
 * This tag find the chapter transformers related to this book and update its position.
 * The position in each axis will be updated only if the respective value passed as an argument (setX, setY, setZ) is true
 * @param {Object} that - Object that contains important data for the function
 * @param {Bool} that.setX - Determines if the X axis of the position of the transformer is modified
 * @param {Bool} that.setY - Determines if the Y axis of the position of the transformer is modified
 * @param {Bool} that.setZ - Determines if the Z axis of the position of the transformer is modified
 * @example
 * someBook.TrySetChaptersPosition({setX: true, setY: true, setZ: true});
 */
const dimension = os.getCurrentDimension();
const bookData = BibleStackManager.GetPieceData({ piece: thisBot });
const { bibleData } = BibleStackManager.GetDataChainFromParentDataIds({
  parentDataIds: bookData.parentDataIds,
});
const activeChaptersData = bookData.childrenData.filter((chapterData) => {
  return chapterData.isInsideBook;
});

if (activeChaptersData.length > 0) {
  const { setX, setY, setZ } = that;
  const bibleTransformerPosition = bibleData
    ? getBotPosition(bibleData.staticBiblePieces.bibleTransformer, dimension)
    : null;
  const bookPosition = getBotPosition(thisBot, dimension);
  const bookScales = GetBotScales(thisBot);
  let row = 0;
  let column = 0;
  let xPosition, yPosition, zPosition;

  for (const chapterData of activeChaptersData) {
    if (chapterData.isActive && !chapterData.isHidden) {
      const horizontalChaptersSpace =
        chapterData.piece.tags.chapterWidth * thisBot.tags.chapterColumns;
      const verticalChaptersSpace =
        chapterData.piece.tags.chapterHeight * (thisBot.tags.chapterRows - 1);
      const horizontalEmptySpace =
        thisBot.masks.scaleX - horizontalChaptersSpace;
      const verticalEmptySpace = thisBot.masks.scaleZ - verticalChaptersSpace;
      const chapterHorizontalGap =
        horizontalEmptySpace / thisBot.tags.chapterColumns;
      const chapterVerticalGap =
        verticalEmptySpace / (thisBot.tags.chapterRows - 1);
      const chapterScales = GetBotScales(chapterData.piece);
      if (setX) {
        xPosition =
          (bookData.parentDataIds.stackBibleId
            ? bibleTransformerPosition.x
            : 0) +
          bookPosition.x -
          bookScales.x / 2 +
          chapterData.piece.tags.chapterWidth / 2 +
          chapterHorizontalGap / 2 +
          (chapterData.piece.tags.chapterWidth + chapterHorizontalGap) * column;
        setTagMask(chapterData.piece, dimension + "X", xPosition);
      }
      if (setY) {
        yPosition =
          (bookData.parentDataIds.stackBibleId
            ? bibleTransformerPosition.y
            : 0) +
          bookPosition.y -
          bookScales.y / 2 +
          chapterData.piece.tags.gapY +
          chapterScales.y / 2 -
          (chapterData.isSelected
            ? BibleVizDataRepository.getStackPieceMeasurement(
                "ChapterFrontSelectedDepth"
              )
            : 0);
        setTagMask(chapterData.piece, dimension + "Y", yPosition);
      }
      if (setZ) {
        zPosition =
          (bookData.parentDataIds.stackBibleId
            ? bibleTransformerPosition.z + 1
            : 0) +
          bookPosition.z +
          bookScales.z -
          chapterData.piece.tags.chapterHeight -
          chapterVerticalGap / 2 -
          (chapterData.piece.tags.chapterHeight + chapterVerticalGap) * row;
        setTagMask(chapterData.piece, dimension + "Z", zPosition);
      }
    }
    column++;
    if (column >= thisBot.tags.chapterColumns) {
      column = 0;
      row++;
    }
    xPosition = null;
    yPosition = null;
    zPosition = null;
  }
}
