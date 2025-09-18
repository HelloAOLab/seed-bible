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

const {bookData, chapterNumber} = that;
const dimension = os.getCurrentDimension()
const positionYOffset = -2;
const duration = 0.5;
const movementYEasing = {type: "linear"}
const movementZEasing = {type: "cubic", mode: "in"}
const chapterData = bookData.childrenData.find((currChapterData) => {return currChapterData.pieceInfo.number == chapterNumber});
const chapterPosition = getBotPosition(chapterData.piece, dimension);
const newPositionY = chapterPosition.y + positionYOffset;
thisBot.PullOutPieceFromParent({pieceData: chapterData, bookData});
await Promise.all([
    animateTag(chapterData.piece, dimension + 'Y', {
        toValue: newPositionY,
        duration,
        easing: movementYEasing
    }),
    animateTag(chapterData.piece, dimension + 'Z', {
        toValue: 0,
        duration,
        easing: movementZEasing
    })
])
setTagMask(chapterData.piece, "isOnTheGround", true);