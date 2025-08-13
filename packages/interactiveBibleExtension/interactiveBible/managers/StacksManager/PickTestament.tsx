const {bibleData, testamentName} = that;
const dimension = os.getCurrentDimension()
const positionYOffset = -4.5;
const duration = 0.5;
const movementYEasing = {type: "linear"}
const movementZEasing = {type: "cubic", mode: "in"}
const testamentData = bibleData.childrenData.find((currTestamentData) => {return currTestamentData.elementInfo.name == testamentName});
const testamentPosition = getBotPosition(testamentData.element, dimension);
// const testamentScales = GetBotScales(testamentData.element)
const newPositionY = testamentPosition.y + positionYOffset;
await Promise.all([
    animateTag(testamentData.element, {
        fromValue: {
            [dimension + 'X']: testamentPosition.x,
            [dimension + 'Y']: testamentPosition.y
        },
        toValue: {
            [dimension + 'X']: testamentPosition.x,
            [dimension + 'Y']: newPositionY
        },
        duration,
        easing: movementYEasing
    }),
    animateTag(testamentData.element, dimension + 'Z', {
        toValue: 0,
        duration,
        easing: movementZEasing
    })
])
await thisBot.PullOutElementFromParentStack({elementData: testamentData, bibleData});
thisBot.OnStackElementDrop({data: testamentData, element: testamentData.element});