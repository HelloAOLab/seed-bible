import { GetDarkerColor } from "bibleVizUtils.functions.index";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import {
  BibleType,
  ObjectPoolTags,
  type BibleTypeType,
} from "bibleVizUtils.models.canvas";
import type { StackBibleData } from "bibleVizUtils.models.entities.StackBibleData";
import type { Vector3 as Vector3Type } from "../../../../typings/AuxLibraryDefinitions";
import { GetIsInHistoryMode } from "bibleVizUtils.services.HistoryMode";

/**
 * Sets up a Bible, positioning its pieces and initializing the testament data.
 *
 * @param {Object} that - Object containing the required StackBibleData and position.
 * @param {StackBibleData} that.bibleData - The StackBibleData object to set up.
 * @param {Vector3} that.position - The position to place the Bible in the 3D space.
 *
 * @example
 * thisBot.SetUpBible({ bibleData: someBibleData, position: new Vector3(0, 0, 0) });
 */

const {
  bibleData,
  position,
  bibleType = BibleType.Default,
}: {
  bibleData: StackBibleData;
  position: Vector3Type;
  bibleType: BibleTypeType;
} = that;
if (bibleData.hasBeenSetUp) return false;

const dimension = os.getCurrentDimension();
const bibleTransformerPosition = position;
const bibleTransformerRotationZ = 0;
const bibleShadowPosition = new Vector3(0, 0, -1);
const leftCoverScales = new Vector3(0.15, 3.85, 0.75);
const lowerCoverPosition = new Vector3(0, 0, 0);
const testamentsPosition = new Vector3(
  0,
  0,
  lowerCoverPosition.z +
    BibleVizDataRepository.getStackPieceMeasurement("CoverScales").z
);
const upperCoverPosition = new Vector3(
  0,
  0,
  lowerCoverPosition.z +
    BibleVizDataRepository.getStackPieceMeasurement("CoverScales").z +
    BibleVizDataRepository.getStackPieceMeasurement("TestamentScales").z
);
const leftCoverPosition = new Vector3(
  upperCoverPosition.x -
    BibleVizDataRepository.getStackPieceMeasurement("CoverScales").x / 2 +
    leftCoverScales.x / 2,
  0,
  lowerCoverPosition.z +
    BibleVizDataRepository.getStackPieceMeasurement("CoverScales").z
);
const crossVerticalLinePosition = new Vector3(
  0,
  0,
  upperCoverPosition.z +
    BibleVizDataRepository.getStackPieceMeasurement("CoverScales").z
);
const crossVerticalLineScales = new Vector3(
  BibleVizDataRepository.getStackPieceMeasurement("CoverScales").x * 0.07,
  BibleVizDataRepository.getStackPieceMeasurement("CoverScales").y / 2,
  0.055
);
const crossHorizontalLinePosition = new Vector3(
  0,
  crossVerticalLinePosition.y + crossVerticalLineScales.y / 4,
  upperCoverPosition.z +
    BibleVizDataRepository.getStackPieceMeasurement("CoverScales").z
);
const crossHorizontalLineScales = new Vector3(
  crossVerticalLineScales.y / 2,
  crossVerticalLineScales.x,
  0.055
);
// const animationDuration = 0;
// const collisionType = bibleType === BibleType.PlatformerGame ? CollisionType.Collision : null
const bibleTransformerMod = {
  [dimension]: true,
  [dimension + "X"]: bibleTransformerPosition.x,
  [dimension + "Y"]: bibleTransformerPosition.y,
  [dimension + "Z"]: bibleTransformerPosition.z,
  [dimension + "RotationZ"]: bibleTransformerRotationZ,
  initialPositionZ: bibleTransformerPosition.z,
};
const bibleShadowMod = {
  [dimension]: true,
  [dimension + "X"]: bibleShadowPosition.x,
  [dimension + "Y"]: bibleShadowPosition.y,
  [dimension + "Z"]: bibleShadowPosition.z,
  transformerLink: `🔗${bibleData.getStaticPieceId("bibleTransformer")}`,
  transformer: bibleData.getStaticPieceId("bibleTransformer"),
};
const upperCoverMod = {
  [dimension]: true,
  [dimension + "X"]: upperCoverPosition.x,
  [dimension + "Y"]: upperCoverPosition.y,
  [dimension + "Z"]: upperCoverPosition.z,
  scaleX: BibleVizDataRepository.getStackPieceMeasurement("CoverScales").x,
  scaleY: BibleVizDataRepository.getStackPieceMeasurement("CoverScales").y,
  scaleZ: BibleVizDataRepository.getStackPieceMeasurement("CoverScales").z,
  pointable: bibleType === BibleType.Default,
  transformer: bibleData.getStaticPieceId("bibleTransformer"),
  transformerLink: `🔗${bibleData.getStaticPieceId("bibleTransformer")}`,
  // collisionType,
  isGoalZonePlatform: bibleType === BibleType.PlatformerGame,
};
const lowerCoverMod = {
  [dimension]: true,
  [dimension + "X"]: lowerCoverPosition.x,
  [dimension + "Y"]: lowerCoverPosition.y,
  [dimension + "Z"]: lowerCoverPosition.z,
  scaleX: BibleVizDataRepository.getStackPieceMeasurement("CoverScales").x,
  scaleY: BibleVizDataRepository.getStackPieceMeasurement("CoverScales").y,
  scaleZ: BibleVizDataRepository.getStackPieceMeasurement("CoverScales").z,
  transformer: bibleData.getStaticPieceId("bibleTransformer"),
  transformerLink: `🔗${bibleData.getStaticPieceId("bibleTransformer")}`,
  draggable: true,
  pointable: bibleType === BibleType.Default,
  onDrag: `@os.enableCustomDragging();`,
  onDragging: `@const dimension = os.getCurrentDimension();
const positionUpdateThreshold = 50;

if(!thisBot.masks.lastPositionUpdateTime || os.localTime > (thisBot.masks.lastPositionUpdateTime + positionUpdateThreshold))
{
    setTagMask(thisBot, 'lastPositionUpdateTime', os.localTime);
    const positionDifference = new Vector2(that.to.x - that.from.x, that.to.y - that.from.y)
    const transformer = getBot(byID(thisBot.tags.transformer));
    const transformerPosition = getBotPosition(transformer, dimension);
    const newPosition = new Vector2(transformerPosition.x + positionDifference.x, transformerPosition.y + positionDifference.y);
    const transformerChildren = getBots(byTag('transformer', transformer.id));
    setTagMask(transformer, dimension + 'X', newPosition.x);
    setTagMask(transformer, dimension + 'Y', newPosition.y);
    whisper(transformerChildren, 'onBotChanged', {force: true});
}`,
  // collisionType
};
const leftCoverMod = {
  [dimension]: true,
  [dimension + "X"]: leftCoverPosition.x,
  [dimension + "Y"]: leftCoverPosition.y,
  [dimension + "Z"]: leftCoverPosition.z,
  scaleX: leftCoverScales.x,
  scaleY: leftCoverScales.y,
  scaleZ: leftCoverScales.z,
  pointable: bibleType === BibleType.Default,
  transformer: bibleData.getStaticPieceId("bibleTransformer"),
  transformerLink: `🔗${bibleData.getStaticPieceId("bibleTransformer")}`,
  // collisionType
};
const crossVerticalLineMod = {
  [dimension]: true,
  [dimension + "X"]: crossVerticalLinePosition.x,
  [dimension + "Y"]: crossVerticalLinePosition.y,
  [dimension + "Z"]: crossVerticalLinePosition.z,
  scaleX: crossVerticalLineScales.x,
  scaleY: crossVerticalLineScales.y,
  scaleZ: crossVerticalLineScales.z,
  pointable: bibleType === BibleType.Default,
  transformer: bibleData.getStaticPieceId("bibleTransformer"),
  transformerLink: `🔗${bibleData.getStaticPieceId("bibleTransformer")}`,
  // collisionType
};
const crossHorizontalLineMod = {
  [dimension]: true,
  [dimension + "X"]: crossHorizontalLinePosition.x,
  [dimension + "Y"]: crossHorizontalLinePosition.y,
  [dimension + "Z"]: crossHorizontalLinePosition.z,
  scaleX: crossHorizontalLineScales.x,
  scaleY: crossHorizontalLineScales.y,
  scaleZ: crossHorizontalLineScales.z,
  pointable: bibleType === BibleType.Default,
  transformer: bibleData.getStaticPieceId("bibleTransformer"),
  transformerLink: `🔗${bibleData.getStaticPieceId("bibleTransformer")}`,
  // collisionType
};
for (const testamentData of bibleData.childrenData) {
  const testament = ObjectPooler.GetObjectFromPool({
    tag: ObjectPoolTags.StackTestament,
  });
  const fixedColor =
    testamentData.highlightColor ??
    testamentData.getPieceInfoProperty("color") ??
    "#FFFFFF";
  const testamentMod = {
    infoLabel: testamentData.getPieceInfoProperty("name"),
    formOpacity: 1,
    testamentName: testamentData.getPieceInfoProperty("name"),
    draggable: thisBot.masks.areBiblePiecesDraggable,
    arrangementIndex: testamentData.getCreationParam("arrangementIndex"),
    testamentIndex: testamentData.getCreationParam("testamentIndex"),
    [dimension]: true,
    [dimension + "X"]: testamentsPosition.x,
    [dimension + "Y"]: testamentsPosition.y,
    [dimension + "Z"]: testamentsPosition.z,
    scale: 1,
    color: fixedColor,
    orginalColor: fixedColor,
    initialColor: fixedColor,
    labelTextColor: GetDarkerColor(
      testamentData.getPieceInfoProperty("color") ?? "#000000"
    ),
    scaleX:
      BibleVizDataRepository.getStackPieceMeasurement("TestamentScales").x,
    scaleY:
      BibleVizDataRepository.getStackPieceMeasurement("TestamentScales").y,
    scaleZ:
      BibleVizDataRepository.getStackPieceMeasurement("TestamentScales").z,
    pointable: bibleType === BibleType.Default,
    initialScaleX:
      BibleVizDataRepository.getStackPieceMeasurement("TestamentScales").x,
    hoveredScaleX:
      BibleVizDataRepository.getStackPieceMeasurement("TestamentScales").x *
      1.1,
    initialScaleY:
      BibleVizDataRepository.getStackPieceMeasurement("TestamentScales").y,
    hoveredScaleY:
      BibleVizDataRepository.getStackPieceMeasurement("TestamentScales").y *
      1.1,
    initialScaleZ:
      BibleVizDataRepository.getStackPieceMeasurement("TestamentScales").z,
    desiredScaleZ:
      BibleVizDataRepository.getStackPieceMeasurement("TestamentScales").z,
    transformer: bibleData.getStaticPieceId("bibleTransformer"),
    transformerLink: `🔗${bibleData.getStaticPieceId("bibleTransformer")}`,
  };
  testament.OnSpawned({ mod: testamentMod });
  testamentData.setPiece(testament);
  testamentData.activate();
  if (GetIsInHistoryMode() && bibleType === BibleType.Default)
    setTagMask(
      testament,
      "color",
      "#FFFFFF" //BibleVizUtils.Functions.GetHistoryColor({ piece: testament }) TODO: Needs to be correctly implemented
    );
}

applyMod(bibleData.getStaticPiece("bibleTransformer"), bibleTransformerMod);
applyMod(bibleData.getStaticPiece("bibleShadow"), bibleShadowMod);
applyMod(bibleData.getStaticPiece("upperCover"), upperCoverMod);
applyMod(bibleData.getStaticPiece("lowerCover"), lowerCoverMod);
applyMod(bibleData.getStaticPiece("leftCover"), leftCoverMod);
applyMod(bibleData.getStaticPiece("crossVerticalLine"), crossVerticalLineMod);
applyMod(
  bibleData.getStaticPiece("crossHorizontalLine"),
  crossHorizontalLineMod
);

bibleData.changeState("Closed");
bibleData.handleSetup();

return true;
