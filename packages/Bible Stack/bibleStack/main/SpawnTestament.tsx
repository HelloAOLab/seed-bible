import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";

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
 * thisBot.SpawnTestament({
 *   name: "Old Testament",
 *   spawnPosition: new Vector3(1, 2, 3)
 * });
 */

const dimension = os.getCurrentDimension();
const jarvis = getBot("jarvis", true);
const jarvisPosition = getBotPosition(jarvis, dimension);
let { spawnPosition } = that;
const { name } = that;
let displayJarvisSpawnPieceAnimation = false;
if (jarvis && !spawnPosition) {
  spawnPosition = jarvisPosition;
  displayJarvisSpawnPieceAnimation = true;
}
const { arrangementIndex, testamentIndex, found } =
  BibleVizUtils.Functions.GetTestamentInfoPathByName({ name });
let testamentData;
if (found) {
  if (displayJarvisSpawnPieceAnimation)
    await jarvis.SpawnPieceStart({
      scales:
        BibleVizDataRepository.getStackPieceMeasurement("TestamentScales"),
    });
  testamentData = await thisBot.CreateTestament({
    arrangementIndex,
    testamentIndex,
  });
  const testament = ObjectPooler.GetObjectFromPool({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.StackTestament,
  });
  const testamentMod = {
    infoLabel: testamentData.pieceInfo.name,
    formOpacity: 1,
    testamentName: testamentData.pieceInfo.name,
    draggable: thisBot.masks.areBiblePiecesDraggable,
    arrangementIndex,
    testamentIndex,
    [dimension]: true,
    [dimension + "X"]: spawnPosition.x,
    [dimension + "Y"]: spawnPosition.y,
    [dimension + "Z"]: spawnPosition.z,
    scale: 1,
    scaleX:
      BibleVizDataRepository.getStackPieceMeasurement("TestamentScales").x,
    scaleY:
      BibleVizDataRepository.getStackPieceMeasurement("TestamentScales").y,
    scaleZ:
      BibleVizDataRepository.getStackPieceMeasurement("TestamentScales").z,
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
    toErase: true,
  };
  testament.OnSpawned({ mod: testamentMod });
  testamentData.piece = testament;
  testamentData.isActive = true;
  setTagMask(testament, "highlightable", true);
  setTagMask(testament, "isOnTheGround", true);
  if (displayJarvisSpawnPieceAnimation)
    await jarvis.SpawnPieceEnd({
      scales:
        BibleVizDataRepository.getStackPieceMeasurement("TestamentScales"),
    });
}

return { testamentData };
