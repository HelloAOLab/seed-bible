const {bibleData, testamentName} = that;
const dimension = os.getCurrentDimension()
const positionYOffset = -4.5;
const duration = 0.5;
const movementYEasing = {type: "linear"}
const movementZEasing = {type: "cubic", mode: "in"}
const testamentData = bibleData.childrenData.find((currTestamentData) => {return currTestamentData.pieceInfo.name == testamentName});
const testamentPosition = getBotPosition(testamentData.piece, dimension);
// const testamentScales = BibleVizUtils.Functions.GetBotScales(testamentData.piece)
const newPositionY = testamentPosition.y + positionYOffset;
await Promise.all([
    animateTag(testamentData.piece, {
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
    animateTag(testamentData.piece, dimension + 'Z', {
        toValue: 0,
        duration,
        easing: movementZEasing
    })
])
await thisBot.PullOutPieceFromParent({pieceData: testamentData, bibleData});
thisBot.OnStackPieceDrop({data: testamentData, piece: testamentData.piece});