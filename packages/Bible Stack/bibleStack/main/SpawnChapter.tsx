import {
  scriptureService,
  arrangementService,
} from "bibleVizUtils.services.index";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import { IsValueBetween } from "bibleVizUtils.functions.index";
import { ObjectPoolTags } from "bibleVizUtils.models.enums";

/**
 * Spawns a chapter from a specified book and initializes its properties. If the chapter is valid, it will be selected after spawning.
 *
 * @param {Object} that - Object containing the chapter and book information.
 * @param {string} that.bookName - The name of the book from which the chapter will be spawned.
 * @param {number} that.chapterNumber - The number of the chapter to spawn.
 * @param {Vector3} that.spawnPosition - Is optional and is the position where the chapter will be spawned, defaults to Vector3(0,0,0).
 *
 * @returns {Promise<boolean>} - A promise that resolves to `true` if the chapter is successfully spawned and selected, `false` otherwise.
 *
 * @example
 * const chapterSpawned = await thisBot.SpawnChapter({
 *   bookName: "Genesis",
 *   chapterNumber: 5,
 *   spawnPosition: new Vector3(1, 2, 3)
 * });
 */

if (thisBot.masks.isBibleAnimating) return;
setTagMask(thisBot, "isBibleAnimating", true);

const dimension = os.getCurrentDimension();
const jarvis = getBot("jarvis", true);
const jarvisPosition = getBotPosition(jarvis, dimension);
let { spawnPosition } = that;
const { bookName, chapterNumber } = that;
let displayJarvisSpawnPieceAnimation = false;
if (jarvis && !spawnPosition) {
  spawnPosition = jarvisPosition;
  displayJarvisSpawnPieceAnimation = true;
}
const { arrangementIndex, testamentIndex, sectionIndex, bookIndex, found } =
  scriptureService.getBookInfoPathByName({ name: bookName });
let chapterSpawned = false;
// let book;
if (!found) {
  console.error(`book info path not found at SpawnChapter`);
  return chapterSpawned;
}

const bookStaticInfo = BibleVizDataRepository.getBookStaticInfo(bookName);

if (!bookStaticInfo) {
  console.error(`bookStaticInfo not found at SpawnChapter`);
  return chapterSpawned;
}

const { chaptersInfo } = bookStaticInfo;

const bookInfo = arrangementService.getBookByIndices({
  arrangementIndex,
  testamentIndex: testamentIndex as number,
  sectionIndex: sectionIndex as number,
  bookIndex: bookIndex as number,
});

if (!bookInfo) {
  console.error(`bookInfo not found at SpawnChapter`);
  return chapterSpawned;
}

const chaptersLength = chaptersInfo.length;
const chapterIndex = chapterNumber - 1;

if (!IsValueBetween({ value: chapterIndex, min: 0, max: chaptersLength - 1 })) {
  console.warn(`chapterIndex is not a valid index at SpawnChapter`);
  return chapterSpawned;
}

const chapterInfo = chaptersInfo[chapterIndex];

if (!chapterInfo) {
  console.error(`chapterInfo not found at SpawnChapter`);
  return chapterSpawned;
}

const chapterData = await thisBot.CreateChapter({ chapterInfo });
const chapter = ObjectPooler.GetObjectFromPool({
  tag: ObjectPoolTags.StackChapter,
});
const chapterDeltaDepth =
  (BibleVizDataRepository.getStackPieceMeasurement("BookScales").y -
    chapter.tags.gapY * 2 -
    BibleVizDataRepository.getStackPieceMeasurement("MinChapterBackDepth")) *
  (chapterInfo.amountOfVerses / scriptureService.getBiggerChapter());
if (displayJarvisSpawnPieceAnimation)
  await jarvis.SpawnPieceStart({
    scales: new Vector3(
      BibleVizDataRepository.getStackPieceMeasurement("ChapterWidth"),
      BibleVizDataRepository.getStackPieceMeasurement("MinChapterBackDepth") +
        chapterDeltaDepth,
      BibleVizDataRepository.getStackPieceMeasurement("ChapterHeight")
    ),
  });
const chapterMod = {
  [dimension]: true,
  [dimension + "X"]: spawnPosition.x,
  [dimension + "Y"]: spawnPosition.y,
  [dimension + "Z"]: spawnPosition.z,
  creator: null,
  index: chapterIndex,
  chapterNumber,
  chapterWidth: BibleVizDataRepository.getStackPieceMeasurement("ChapterWidth"),
  chapterHeight:
    BibleVizDataRepository.getStackPieceMeasurement("ChapterHeight"),
  parentBookName: bookName,
  arrangementIndex,
  scaleX: BibleVizDataRepository.getStackPieceMeasurement("ChapterWidth"),
  scaleY:
    BibleVizDataRepository.getStackPieceMeasurement("MinChapterBackDepth") +
    chapterDeltaDepth,
  scaleZ: BibleVizDataRepository.getStackPieceMeasurement("ChapterHeight"),
  initialScaleX:
    BibleVizDataRepository.getStackPieceMeasurement("ChapterWidth"),
  initialScaleY:
    BibleVizDataRepository.getStackPieceMeasurement("MinChapterBackDepth") +
    chapterDeltaDepth,
  initialScaleZ:
    BibleVizDataRepository.getStackPieceMeasurement("ChapterHeight"),
  selectedScaleY:
    BibleVizDataRepository.getStackPieceMeasurement("MinChapterBackDepth") +
    chapterDeltaDepth +
    BibleVizDataRepository.getStackPieceMeasurement(
      "ChapterFrontSelectedDepth"
    ),
  label: chapterNumber + (bookStaticInfo.startingIndex ?? 0),
  toErase: true,
};
chapter.OnSpawned({ mod: chapterMod });
chapterData.piece = chapter;
chapterData.isActive = true;
setTagMask(chapter, "isOnTheGround", true);
if (displayJarvisSpawnPieceAnimation)
  await jarvis.SpawnPieceEnd({
    scales: new Vector3(
      BibleVizDataRepository.getStackPieceMeasurement("ChapterWidth"),
      BibleVizDataRepository.getStackPieceMeasurement("MinChapterBackDepth") +
        chapterDeltaDepth,
      BibleVizDataRepository.getStackPieceMeasurement("ChapterHeight")
    ),
  });
await chapter.Select();
chapterSpawned = true;

setTagMask(thisBot, "isBibleAnimating", false);

return chapterSpawned;
