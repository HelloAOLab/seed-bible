const { bookData, chapterNumber } = that;
const dimension = os.getCurrentDimension();
const positionYOffset = -2;
const duration = 0.5;
const movementYEasing = { type: "linear" };
const movementZEasing = { type: "cubic", mode: "in" };
const chapterData = bookData.childrenData.find((currChapterData) => {
  return currChapterData.pieceInfo.number == chapterNumber;
});
const chapterPosition = getBotPosition(chapterData.piece, dimension);
const newPositionY = chapterPosition.y + positionYOffset;
thisBot.PullOutPieceFromParent({ pieceData: chapterData, bookData });
await Promise.all([
  animateTag(chapterData.piece, dimension + "Y", {
    toValue: newPositionY,
    duration,
    easing: movementYEasing,
  }),
  animateTag(chapterData.piece, dimension + "Z", {
    toValue: 0,
    duration,
    easing: movementZEasing,
  }),
]);
setTagMask(chapterData.piece, "isOnTheGround", true);
