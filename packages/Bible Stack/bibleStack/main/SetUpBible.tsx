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
  bibleType = BibleVizUtils.Data.tags.BibleType.Default,
} = that;
if (bibleData.hasBeenSetUp) return;

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
    BibleVizUtils.Data.tags.StackPieceMeasurements.CoverScales.z
);
const upperCoverPosition = new Vector3(
  0,
  0,
  lowerCoverPosition.z +
    BibleVizUtils.Data.tags.StackPieceMeasurements.CoverScales.z +
    BibleVizUtils.Data.tags.StackPieceMeasurements.TestamentScales.z
);
const leftCoverPosition = new Vector3(
  upperCoverPosition.x -
    BibleVizUtils.Data.tags.StackPieceMeasurements.CoverScales.x / 2 +
    leftCoverScales.x / 2,
  0,
  lowerCoverPosition.z +
    BibleVizUtils.Data.tags.StackPieceMeasurements.CoverScales.z
);
const crossVerticalLinePosition = new Vector3(
  0,
  0,
  upperCoverPosition.z +
    BibleVizUtils.Data.tags.StackPieceMeasurements.CoverScales.z
);
const crossVerticalLineScales = new Vector3(
  BibleVizUtils.Data.tags.StackPieceMeasurements.CoverScales.x * 0.07,
  BibleVizUtils.Data.tags.StackPieceMeasurements.CoverScales.y / 2,
  0.055
);
const crossHorizontalLinePosition = new Vector3(
  0,
  crossVerticalLinePosition.y + crossVerticalLineScales.y / 4,
  upperCoverPosition.z +
    BibleVizUtils.Data.tags.StackPieceMeasurements.CoverScales.z
);
const crossHorizontalLineScales = new Vector3(
  crossVerticalLineScales.y / 2,
  crossVerticalLineScales.x,
  0.055
);
// const animationDuration = 0;
// const collisionType = bibleType === BibleVizUtils.Data.tags.BibleType.PlatformerGame ? CollisionType.Collision : null
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
  transformerLink: `🔗${bibleData.staticBiblePieces.bibleTransformer.id}`,
  transformer: bibleData.staticBiblePieces.bibleTransformer.id,
};
const upperCoverMod = {
  [dimension]: true,
  [dimension + "X"]: upperCoverPosition.x,
  [dimension + "Y"]: upperCoverPosition.y,
  [dimension + "Z"]: upperCoverPosition.z,
  scaleX: BibleVizUtils.Data.tags.StackPieceMeasurements.CoverScales.x,
  scaleY: BibleVizUtils.Data.tags.StackPieceMeasurements.CoverScales.y,
  scaleZ: BibleVizUtils.Data.tags.StackPieceMeasurements.CoverScales.z,
  pointable: bibleType === BibleVizUtils.Data.tags.BibleType.Default,
  transformer: bibleData.staticBiblePieces.bibleTransformer.id,
  transformerLink: `🔗${bibleData.staticBiblePieces.bibleTransformer.id}`,
  // collisionType,
  isGoalZonePlatform:
    bibleType === BibleVizUtils.Data.tags.BibleType.PlatformerGame,
};
const lowerCoverMod = {
  [dimension]: true,
  [dimension + "X"]: lowerCoverPosition.x,
  [dimension + "Y"]: lowerCoverPosition.y,
  [dimension + "Z"]: lowerCoverPosition.z,
  scaleX: BibleVizUtils.Data.tags.StackPieceMeasurements.CoverScales.x,
  scaleY: BibleVizUtils.Data.tags.StackPieceMeasurements.CoverScales.y,
  scaleZ: BibleVizUtils.Data.tags.StackPieceMeasurements.CoverScales.z,
  transformer: bibleData.staticBiblePieces.bibleTransformer.id,
  transformerLink: `🔗${bibleData.staticBiblePieces.bibleTransformer.id}`,
  draggable: true,
  pointable: bibleType === BibleVizUtils.Data.tags.BibleType.Default,
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
  pointable: bibleType === BibleVizUtils.Data.tags.BibleType.Default,
  transformer: bibleData.staticBiblePieces.bibleTransformer.id,
  transformerLink: `🔗${bibleData.staticBiblePieces.bibleTransformer.id}`,
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
  pointable: bibleType === BibleVizUtils.Data.tags.BibleType.Default,
  transformer: bibleData.staticBiblePieces.bibleTransformer.id,
  transformerLink: `🔗${bibleData.staticBiblePieces.bibleTransformer.id}`,
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
  pointable: bibleType === BibleVizUtils.Data.tags.BibleType.Default,
  transformer: bibleData.staticBiblePieces.bibleTransformer.id,
  transformerLink: `🔗${bibleData.staticBiblePieces.bibleTransformer.id}`,
  // collisionType
};
for (const testamentData of bibleData.childrenData) {
  const testament = ObjectPooler.GetObjectFromPool({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.StackTestament,
  });
  const testamentMod = {
    infoLabel: testamentData.pieceInfo.name,
    formOpacity: 1,
    testamentName: testamentData.pieceInfo.name,
    draggable: thisBot.masks.areBiblePiecesDraggable,
    arrangementIndex: testamentData.creationInfo.arrangementIndex,
    testamentIndex: testamentData.creationInfo.testamentIndex,
    [dimension]: true,
    [dimension + "X"]: testamentsPosition.x,
    [dimension + "Y"]: testamentsPosition.y,
    [dimension + "Z"]: testamentsPosition.z,
    scale: 1,
    color:
      testamentData.highlightColor ??
      testamentData.pieceInfo.color ??
      "#FFFFFF",
    orginalColor:
      testamentData.highlightColor ??
      testamentData.pieceInfo.color ??
      "#FFFFFF",
    initialColor:
      testamentData.highlightColor ??
      testamentData.pieceInfo.color ??
      "#FFFFFF",
    labelTextColor: BibleVizUtils.Functions.GetDarkerColor({
      color: testamentData.pieceInfo.color ?? "#000000",
    }),
    scaleX: BibleVizUtils.Data.tags.StackPieceMeasurements.TestamentScales.x,
    scaleY: BibleVizUtils.Data.tags.StackPieceMeasurements.TestamentScales.y,
    scaleZ: BibleVizUtils.Data.tags.StackPieceMeasurements.TestamentScales.z,
    pointable: bibleType === BibleVizUtils.Data.tags.BibleType.Default,
    initialScaleX:
      BibleVizUtils.Data.tags.StackPieceMeasurements.TestamentScales.x,
    hoveredScaleX:
      BibleVizUtils.Data.tags.StackPieceMeasurements.TestamentScales.x * 1.1,
    initialScaleY:
      BibleVizUtils.Data.tags.StackPieceMeasurements.TestamentScales.y,
    hoveredScaleY:
      BibleVizUtils.Data.tags.StackPieceMeasurements.TestamentScales.y * 1.1,
    initialScaleZ:
      BibleVizUtils.Data.tags.StackPieceMeasurements.TestamentScales.z,
    desiredScaleZ:
      BibleVizUtils.Data.tags.StackPieceMeasurements.TestamentScales.z,
    transformer: bibleData.staticBiblePieces.bibleTransformer.id,
    transformerLink: `🔗${bibleData.staticBiblePieces.bibleTransformer.id}`,
  };
  testament.OnSpawned({ mod: testamentMod });
  testamentData.piece = testament;
  testamentData.isActive = true;
  if (
    BibleVizUtils.Data.masks.isInHistoryMode &&
    bibleType === BibleVizUtils.Data.tags.BibleType.Default
  )
    setTagMask(
      testament,
      "color",
      BibleVizUtils.Functions.GetHistoryColor({ piece: testament })
    );
}

applyMod(bibleData.staticBiblePieces.bibleTransformer, bibleTransformerMod);
applyMod(bibleData.staticBiblePieces.bibleShadow, bibleShadowMod);
applyMod(bibleData.staticBiblePieces.upperCover, upperCoverMod);
applyMod(bibleData.staticBiblePieces.lowerCover, lowerCoverMod);
applyMod(bibleData.staticBiblePieces.leftCover, leftCoverMod);
applyMod(bibleData.staticBiblePieces.crossVerticalLine, crossVerticalLineMod);
applyMod(
  bibleData.staticBiblePieces.crossHorizontalLine,
  crossHorizontalLineMod
);

bibleData.currentState = BibleVizUtils.Data.tags.BibleState.Closed;
bibleData.hasBeenSetUp = true;
