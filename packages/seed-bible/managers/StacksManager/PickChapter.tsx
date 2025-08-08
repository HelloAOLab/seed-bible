/**
    * Handles the ejection of a chapter from a book, animating its movement.
    *
    * @param {Object} that - Object that contains important data for the function.
    * @param {BookData} that.bookData - Data related to the book containing the chapter.
    * @param {number} that.chapterNumber - The number of the chapter being ejected.
    * @returns {Promise<void>} - Resolves when the chapter ejection animation completes.
    * @throws {Error} - Throws an error if the chapter animation fails.
    * @example
    * StacksManager.PickChapter({bookData: someBookData, chapterNumber: 1})
*/

const {bookData, chapterNumber} = that;
const dimension = os.getCurrentDimension()
const positionYOffset = -2;
const duration = 0.5;
const movementYEasing = {type: "linear"}
const movementZEasing = {type: "cubic", mode: "in"}
const chapterData = bookData.childrenData.find((currChapterData) => {return currChapterData.elementInfo.number == chapterNumber});
const chapterPosition = getBotPosition(chapterData.element, dimension);
const newPositionY = chapterPosition.y + positionYOffset;
thisBot.PullOutElementFromParentStack({elementData: chapterData, bookData});
await Promise.all([
    animateTag(chapterData.element, dimension + 'Y', {
        toValue: newPositionY,
        duration,
        easing: movementYEasing
    }),
    animateTag(chapterData.element, dimension + 'Z', {
        toValue: 0,
        duration,
        easing: movementZEasing
    })
])
setTagMask(chapterData.element, "isOnTheGround", true);