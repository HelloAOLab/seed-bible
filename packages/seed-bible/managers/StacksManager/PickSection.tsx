const {testamentData, sectionName} = that;
const dimension = os.getCurrentDimension()
const positionYOffset = -4.5;
const duration = 0.5;
const movementYEasing = {type: "linear"}
const movementZEasing = {type: "cubic", mode: "in"}
const sectionData = testamentData.childrenData.find((currSectionData) => {return currSectionData.elementInfo.name == sectionName});
const sectionPosition = getBotPosition(sectionData.element, dimension);
const testamentPosition = getBotPosition(testamentData.element, dimension);
const testamentScales = GetBotScales(testamentData.element)
const newPositionY = testamentPosition.y - (testamentScales.y/2) + positionYOffset;
await Promise.all([
    animateTag(sectionData.element, {
        fromValue: {
            [dimension + 'X']: sectionPosition.x,
            [dimension + 'Y']: sectionPosition.y
        },
        toValue: {
            [dimension + 'X']: testamentPosition.x,
            [dimension + 'Y']: newPositionY
        },
        duration,
        easing: movementYEasing
    }),
    animateTag(sectionData.element, dimension + 'Z', {
        toValue: 0,
        duration,
        easing: movementZEasing
    })
])
await thisBot.PullOutElementFromParentStack({elementData: sectionData, testamentData});
thisBot.OnStackElementDrop({data: sectionData, element: sectionData.element});