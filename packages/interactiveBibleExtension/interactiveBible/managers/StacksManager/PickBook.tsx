/**
    * Handles the ejection of a book from a section, animating its movement.
    *
    * @param {Object} that - Object that contains important data for the function.
    * @param {BookData} that.sectionData - Data related to the section containing the book.
    * @param {BookData} that.bookName - The name of the book that will be ejected.
    * @returns {Promise<void>} - Resolves when the book ejection animation completes.
    * @throws {Error} - Throws an error if the chapter animation fails.
    * @example
    * StacksManager.PickBook({sectionData: someSectionData, bookData: someBookData})
*/

const {sectionData, bookName} = that;
const dimension = os.getCurrentDimension()
const positionYOffset = -3;
const duration = 0.5;
const movementYEasing = {type: "linear"}
const movementZEasing = {type: "cubic", mode: "in"}
const bookData = sectionData.childrenData.flat().find((currBookData) => {return currBookData.elementInfo.commonName == bookName});
const bookPosition = getBotPosition(bookData.element, dimension);
const sectionShadowPosition = getBotPosition(sectionData.shadow, dimension);
const sectionShadowScales = GetBotScales(sectionData.shadow)
const newPositionY = sectionShadowPosition.y - (sectionShadowScales.y/2) + positionYOffset;
await Promise.all([
    animateTag(bookData.element, {
        fromValue: {
            [dimension + 'X']: bookPosition.x,
            [dimension + 'Y']: bookPosition.y
        },
        toValue: {
            [dimension + 'X']: sectionShadowPosition.x,
            [dimension + 'Y']: newPositionY
        },
        duration,
        easing: movementYEasing
    }),
    animateTag(bookData.element, dimension + 'Z', {
        toValue: 0,
        duration,
        easing: movementZEasing
    })
])
await thisBot.PullOutElementFromParentStack({elementData: bookData, sectionData});
thisBot.OnStackElementDrop({data: bookData, element: bookData.element});