import { GetBotScales } from "bibleVizUtils.functions.index";
const { testamentData, sectionName } = that;
const dimension = os.getCurrentDimension();
const positionYOffset = -4.5;
const duration = 0.5;
const movementYEasing = { type: "linear" };
const movementZEasing = { type: "cubic", mode: "in" };
const sectionData = testamentData.childrenData.find((currSectionData) => {
  return currSectionData.pieceInfo.name == sectionName;
});
const sectionPosition = getBotPosition(sectionData.piece, dimension);
const testamentPosition = getBotPosition(testamentData.piece, dimension);
const testamentScales = GetBotScales(testamentData.piece);
const newPositionY =
  testamentPosition.y - testamentScales.y / 2 + positionYOffset;
await Promise.all([
  animateTag(sectionData.piece, {
    fromValue: {
      [dimension + "X"]: sectionPosition.x,
      [dimension + "Y"]: sectionPosition.y,
    },
    toValue: {
      [dimension + "X"]: testamentPosition.x,
      [dimension + "Y"]: newPositionY,
    },
    duration,
    easing: movementYEasing,
  }),
  animateTag(sectionData.piece, dimension + "Z", {
    toValue: 0,
    duration,
    easing: movementZEasing,
  }),
]);
await thisBot.PullOutPieceFromParent({ pieceData: sectionData, testamentData });
thisBot.OnStackPieceDrop({ data: sectionData, piece: sectionData.piece });
