import { scriptureService } from "bibleVizUtils.services.index";
import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";

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
const { arrangementIndex, testamentIndex, sectionIndex, found } =
  scriptureService.getBookInfoPathByName({ name: bookName });
let chapterSpawned = false;
// let book;
if (found) {
  const { chaptersInfo } =
    BibleVizUtils.Data.tags.booksStaticInfo[bookInfo.commonName];
  const bookInfo = BibleVizUtils.Data.vars.fixedArrangementsInfo[
    arrangementIndex
  ].testaments[testamentIndex].sections[sectionIndex].books.find(
    (currentBookInfo) => {
      return currentBookInfo.commonName == bookName;
    }
  );
  const chaptersLength = chaptersInfo.length;
  const chapterIndex = chapterNumber - 1;
  if (chapterIndex >= 0 && chapterIndex < chaptersLength) {
    const chapterInfo = chaptersInfo[chapterIndex];
    const chapterData = await thisBot.CreateChapter({ chapterInfo });
    const chapter = ObjectPooler.GetObjectFromPool({
      tag: BibleVizUtils.Data.tags.ObjectPoolTags.StackChapter,
    });
    const chapterDeltaDepth =
      (BibleVizDataRepository.getStackPieceMeasurement("BookScales").y -
        chapter.tags.gapY * 2 -
        BibleVizDataRepository.getStackPieceMeasurement(
          "MinChapterBackDepth"
        )) *
      (chapterInfo.amountOfVerses / scriptureService.getBiggerChapter());
    if (displayJarvisSpawnPieceAnimation)
      await jarvis.SpawnPieceStart({
        scales: new Vector3(
          BibleVizDataRepository.getStackPieceMeasurement("ChapterWidth"),
          BibleVizDataRepository.getStackPieceMeasurement(
            "MinChapterBackDepth"
          ) + chapterDeltaDepth,
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
      chapterWidth:
        BibleVizDataRepository.getStackPieceMeasurement("ChapterWidth"),
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
      label: chapterNumber + (bookInfo.startingIndex ?? 0),
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
          BibleVizDataRepository.getStackPieceMeasurement(
            "MinChapterBackDepth"
          ) + chapterDeltaDepth,
          BibleVizDataRepository.getStackPieceMeasurement("ChapterHeight")
        ),
      });
    await chapter.Select();
    chapterSpawned = true;
  }
}

setTagMask(thisBot, "isBibleAnimating", false);

return chapterSpawned;
