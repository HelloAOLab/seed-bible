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