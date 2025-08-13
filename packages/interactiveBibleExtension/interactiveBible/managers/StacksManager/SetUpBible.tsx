/**
 * Sets up a Bible, positioning its elements and initializing the testament data.
 * 
 * @param {Object} that - Object containing the required BibleData and position.
 * @param {BibleData} that.bibleData - The BibleData object to set up.
 * @param {Vector3} that.position - The position to place the Bible in the 3D space.
 * 
 * @example
 * StacksManager.SetUpBible({ bibleData: someBibleData, position: new Vector3(0, 0, 0) });
 */

const {bibleData, position, bibleType = BibleType.Default} = that;
if(bibleData.hasBeenSetUp) return;

const dimension = os.getCurrentDimension();
const bibleTransformerPosition = position;
const bibleTransformerRotationZ = 0;
const bibleShadowPosition = new Vector3(0, 0, -1)
const leftCoverScales = new Vector3(0.15, 3.85, 0.75);
const lowerCoverPosition = new Vector3(0, 0, 0);
const testamentsPosition = new Vector3(0, 0, lowerCoverPosition.z + StackElementMeasurements.CoverScales.z);
const upperCoverPosition = new Vector3(0, 0, lowerCoverPosition.z + StackElementMeasurements.CoverScales.z + StackElementMeasurements.TestamentScales.z);
const leftCoverPosition = new Vector3(upperCoverPosition.x - (StackElementMeasurements.CoverScales.x/2) + (leftCoverScales.x/2), 0, lowerCoverPosition.z + StackElementMeasurements.CoverScales.z);
const crossVerticalLinePosition = new Vector3(0, 0, upperCoverPosition.z + StackElementMeasurements.CoverScales.z);
const crossVerticalLineScales = new Vector3(StackElementMeasurements.CoverScales.x * 0.07, StackElementMeasurements.CoverScales.y / 2, 0.055);
const crossHorizontalLinePosition = new Vector3(0, crossVerticalLinePosition.y + (crossVerticalLineScales.y/4), upperCoverPosition.z + StackElementMeasurements.CoverScales.z);
const crossHorizontalLineScales = new Vector3(crossVerticalLineScales.y/2, crossVerticalLineScales.x, 0.055);
// const animationDuration = 0;
const collisionType = bibleType === BibleType.PlatformerGame ? CollisionType.Collision : null
const bibleTransformerMod = {
    [dimension]: true,
    [dimension + "X"]: bibleTransformerPosition.x,
    [dimension + "Y"]: bibleTransformerPosition.y,
    [dimension + "Z"]: bibleTransformerPosition.z,
    [dimension + "RotationZ"]: bibleTransformerRotationZ,
    initialPositionZ: bibleTransformerPosition.z
}
const bibleShadowMod = {
    [dimension]: true,
    [dimension + "X"]: bibleShadowPosition.x,
    [dimension + "Y"]: bibleShadowPosition.y,
    [dimension + "Z"]: bibleShadowPosition.z,
    transformerLink: `🔗${bibleData.staticBibleElements.bibleTransformer.id}`,
    transformer: bibleData.staticBibleElements.bibleTransformer.id
};
const upperCoverMod = {
    [dimension]: true,
    [dimension + "X"]: upperCoverPosition.x,
    [dimension + "Y"]: upperCoverPosition.y,
    [dimension + "Z"]: upperCoverPosition.z,
    scaleX: StackElementMeasurements.CoverScales.x,
    scaleY: StackElementMeasurements.CoverScales.y,
    scaleZ: StackElementMeasurements.CoverScales.z,
    pointable: bibleType === BibleType.Default,
    transformer: bibleData.staticBibleElements.bibleTransformer.id,
    transformerLink: `🔗${bibleData.staticBibleElements.bibleTransformer.id}`,
    collisionType,
    isGoalZonePlatform: bibleType === BibleType.PlatformerGame
}
const lowerCoverMod = {
    [dimension]: true,
    [dimension + "X"]: lowerCoverPosition.x,
    [dimension + "Y"]: lowerCoverPosition.y,
    [dimension + "Z"]: lowerCoverPosition.z,
    scaleX: StackElementMeasurements.CoverScales.x,
    scaleY: StackElementMeasurements.CoverScales.y,
    scaleZ: StackElementMeasurements.CoverScales.z,
    transformer: bibleData.staticBibleElements.bibleTransformer.id,
    transformerLink: `🔗${bibleData.staticBibleElements.bibleTransformer.id}`,
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
    collisionType
}
const leftCoverMod = {
    [dimension]: true,
    [dimension + "X"]: leftCoverPosition.x,
    [dimension + "Y"]: leftCoverPosition.y,
    [dimension + "Z"]: leftCoverPosition.z,
    scaleX: leftCoverScales.x,
    scaleY: leftCoverScales.y,
    scaleZ: leftCoverScales.z,
    pointable: bibleType === BibleType.Default,
    transformer: bibleData.staticBibleElements.bibleTransformer.id,
    transformerLink: `🔗${bibleData.staticBibleElements.bibleTransformer.id}`,
    collisionType
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
    transformer: bibleData.staticBibleElements.bibleTransformer.id,
    transformerLink: `🔗${bibleData.staticBibleElements.bibleTransformer.id}`,
    collisionType
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
    transformer: bibleData.staticBibleElements.bibleTransformer.id,
    transformerLink: `🔗${bibleData.staticBibleElements.bibleTransformer.id}`,
    collisionType
};
for(const testamentData of bibleData.childrenData)
{
    const testament = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.Testament});
    const testamentMod = {
        infoLabel       : testamentData.elementInfo.name,
        formOpacity     : 1,
        testamentName   : testamentData.elementInfo.name,
        draggable       : thisBot.masks.areBibleElementsDraggable,
        arrangementIndex: testamentData.creationInfo.arrangementIndex,
        testamentIndex  : testamentData.creationInfo.testamentIndex,
        [dimension]: true,
        [dimension + "X"]: testamentsPosition.x,
        [dimension + "Y"]: testamentsPosition.y,
        [dimension + "Z"]: testamentsPosition.z,
        scale: 1,
        color: testamentData.highlightColor ?? testamentData.elementInfo.color ?? "#FFFFFF",
        orginalColor: testamentData.highlightColor ?? testamentData.elementInfo.color ?? "#FFFFFF",
        initialColor: testamentData.highlightColor ?? testamentData.elementInfo.color ?? "#FFFFFF",
        labelTextColor : GetDarkerColor(testamentData.elementInfo.color ?? "#000000"),
        scaleX: StackElementMeasurements.TestamentScales.x,
        scaleY: StackElementMeasurements.TestamentScales.y,
        scaleZ: StackElementMeasurements.TestamentScales.z,
        pointable: bibleType === BibleType.Default,
        initialScaleX: StackElementMeasurements.TestamentScales.x,
        hoveredScaleX: StackElementMeasurements.TestamentScales.x * 1.1,
        initialScaleY: StackElementMeasurements.TestamentScales.y,
        hoveredScaleY: StackElementMeasurements.TestamentScales.y * 1.1,
        initialScaleZ: StackElementMeasurements.TestamentScales.z,
        desiredScaleZ: StackElementMeasurements.TestamentScales.z,
        transformer: bibleData.staticBibleElements.bibleTransformer.id,
        transformerLink: `🔗${bibleData.staticBibleElements.bibleTransformer.id}`
    }
    testament.OnSpawned({mod: testamentMod});
    testamentData.element = testament;
    testamentData.isActive = true;
    if(InstanceManager.masks.isInHistoryMode && bibleType === BibleType.Default) setTagMask(testament, "color", GetHistoryColor({element: testament}))
}

applyMod(bibleData.staticBibleElements.bibleTransformer, bibleTransformerMod);
applyMod(bibleData.staticBibleElements.bibleShadow, bibleShadowMod);
applyMod(bibleData.staticBibleElements.upperCover, upperCoverMod);
applyMod(bibleData.staticBibleElements.lowerCover, lowerCoverMod);
applyMod(bibleData.staticBibleElements.leftCover, leftCoverMod);
applyMod(bibleData.staticBibleElements.crossVerticalLine, crossVerticalLineMod);
applyMod(bibleData.staticBibleElements.crossHorizontalLine, crossHorizontalLineMod);

bibleData.currentState = BibleState.Closed;
bibleData.hasBeenSetUp = true;