/**
 * Spawns a testament in the current dimension with specified properties and initializes it.
 * 
 * @param {Object} that - The object containing testament information.
 * @param {string} that.name - The name of the testament to spawn.
 * @param {Vector3} that.spawnPosition - Is optional and is the position where the testament will be spawned, defaults to Vector3(0,0,0).
 * 
 * @returns {Promise<void>} - A promise that resolves after the testament has been spawned and initialized.
 * 
 * @example
 * StacksManager.SpawnTestament({
 *   name: "Old Testament",
 *   spawnPosition: new Vector3(1, 2, 3)
 * });
 */

const dimension = os.getCurrentDimension();
const jarvis = getBot("jarvis", true);
const jarvisPosition = getBotPosition(jarvis, dimension);
let {name, spawnPosition} = that;
let displayJarvisSpawnElementAnimation = false;
if(jarvis && !spawnPosition)
{
    spawnPosition = jarvisPosition;
    displayJarvisSpawnElementAnimation = true
}
const {arrangementIndex, testamentIndex, found} = thisBot.GetTestamentInfoPathByName({name});
let testamentData;
if(found)
{
    if(displayJarvisSpawnElementAnimation) await jarvis.SpawnElementStart({scales: StackElementMeasurements.TestamentScales})
    testamentData = await thisBot.CreateTestament({arrangementIndex, testamentIndex})
    const testament = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.Testament});
    const testamentMod = {
        infoLabel       : testamentData.elementInfo.name,
        formOpacity     : 1,
        testamentName   : testamentData.elementInfo.name,
        draggable       : thisBot.masks.areBibleElementsDraggable,
        arrangementIndex,
        testamentIndex,
        [dimension]: true,
        [dimension + "X"]: spawnPosition.x,
        [dimension + "Y"]: spawnPosition.y,
        [dimension + "Z"]: spawnPosition.z,
        scale: 1,
        scaleX: StackElementMeasurements.TestamentScales.x,
        scaleY: StackElementMeasurements.TestamentScales.y,
        scaleZ: StackElementMeasurements.TestamentScales.z,
        initialScaleX: StackElementMeasurements.TestamentScales.x,
        hoveredScaleX: StackElementMeasurements.TestamentScales.x * 1.1,
        initialScaleY: StackElementMeasurements.TestamentScales.y,
        hoveredScaleY: StackElementMeasurements.TestamentScales.y * 1.1,
        initialScaleZ: StackElementMeasurements.TestamentScales.z,
        desiredScaleZ: StackElementMeasurements.TestamentScales.z,
        toErase: true
    }
    testament.OnSpawned({mod: testamentMod});
    testamentData.element = testament;
    testamentData.isActive = true;
    setTagMask(testament, 'highlightable', true);
    setTagMask(testament, 'isOnTheGround', true);
    if(displayJarvisSpawnElementAnimation) await jarvis.SpawnElementEnd({scales: StackElementMeasurements.TestamentScales})
}

return {testamentData}