import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import { HexToRgb, RgbToHex, type RGB } from "bibleVizUtils.functions.index";
import {
  scriptureService,
  stackService,
  arrangementService,
} from "bibleVizUtils.services.index";

/**
 * Spawns a book piece into the scene based on the provided name and position. It calculates various properties like the book's scale, color, and placement based on its section, level, and other contextual data.
 *
 * @param {Object} that - Object containing information for spawning the book.
 * @param {string} that.name - The name of the book to spawn.
 * @param {Vector3} that.spawnPosition - The optional spawn position for the book, defaults to (0,0,0).
 *
 * @returns {Object} - The spawned book piece and its associated data.
 * @property {Bot} book - The book piece spawned from the object pool.
 * @property {StackBookData} bookData - The data associated with the spawned book.
 *
 * @example
 * const { book, bookData } = thisBot.SpawnBook({ name: "Genesis", spawnPosition: new Vector3(1, 1, 1) });
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
const { arrangementIndex, testamentIndex, sectionIndex, found } =
  arrangementService.getBookInfoPathByName({ name });
let book, bookData;

if (!found) {
  console.error(`book info path not found at bibleStack.main.SpawnBook`);
  return { book, bookData };
}

const sectionInfo = arrangementService.getSectionByIndices({
  arrangementIndex,
  testamentIndex: testamentIndex as number,
  sectionIndex: sectionIndex as number,
});

if (!sectionInfo) {
  console.error(`sectionInfo not found at bibleStack.main.SpawnBook`);
  return { book, bookData };
}

const amountOfChaptersInSection = scriptureService.getSectionChapterCount(
  sectionInfo.books
);
const levels = stackService.getSectionLevels(sectionInfo.books);
const levelsLenght = levels.length;
const level = levels.find((level) => {
  return level.some((bookInfo) => {
    return bookInfo.commonName == name;
  });
});
const levelIndex = levels.indexOf(level);
const bookInfo = sectionInfo.books.find((currentBookInfo) => {
  return currentBookInfo.commonName == name;
});
const bookIndex = sectionInfo.books.indexOf(bookInfo);
const bookLevelIndex = level.indexOf(bookInfo);
bookData = await thisBot.CreateBook({
  arrangementIndex,
  testamentIndex,
  sectionIndex,
  levelIndex,
  bookIndex,
  bookLevelIndex,
  levelsLenght,
});
const amountOfChaptersInLevel = level.reduce((total, bookInfo) => {
  return total + bookInfo.numberOfChapters;
}, 0);
const percentageOfLevelInSection =
  amountOfChaptersInLevel / amountOfChaptersInSection;
const sectionAvailableSpace =
  amountOfChaptersInSection *
    BibleVizDataRepository.getStackPieceMeasurement(
      "SectionDesiredScaleZRatio"
    ) -
  BibleVizDataRepository.getStackSpacing("BetweenBooks") * (levelsLenght + 1);
const levelScaleZ = percentageOfLevelInSection * sectionAvailableSpace;
let groupBookScaleX, groupBookScaleY;
if (bookData.pieceInfo.group) {
  const groupBookIndex = level.indexOf(bookInfo);
  const layout = thisBot.GetLayoutForBooksGroup({
    amountOfBooks: level.length,
  });
  const bookLayout = layout[groupBookIndex];
  const { scale: groupBookScales } =
    stackService.computeGroupBookProperties(bookLayout);

  if (groupBookScales) {
    groupBookScaleX = groupBookScales.x;
    groupBookScaleY = groupBookScales.y;
  }
}
const sectionColorRGB = HexToRgb({
  hexColor: sectionInfo.color,
});
const colorRangeSize = sectionInfo.customColorRange ?? 70;
const levelsColorRange = {
  min: [
    Math.max(sectionColorRGB[0] - colorRangeSize, 0),
    Math.max(sectionColorRGB[1] - colorRangeSize, 0),
    Math.max(sectionColorRGB[2] - colorRangeSize, 0),
  ],
  max: [
    Math.min(sectionColorRGB[0] + colorRangeSize, 255),
    Math.min(sectionColorRGB[1] + colorRangeSize, 255),
    Math.min(sectionColorRGB[2] + colorRangeSize, 255),
  ],
};
const deltaRed = Math.floor(
  (levelsColorRange.max[0] - levelsColorRange.min[0]) / levelsLenght
);
const deltaGreen = Math.floor(
  (levelsColorRange.max[1] - levelsColorRange.min[1]) / levelsLenght
);
const deltaBlue = Math.floor(
  (levelsColorRange.max[2] - levelsColorRange.min[2]) / levelsLenght
);
const levelsColors = levels.map((level, i) => {
  const levelColorRGB: RGB = [
    levelsColorRange.min[0] + deltaRed * i,
    levelsColorRange.min[1] + deltaGreen * i,
    levelsColorRange.min[2] + deltaBlue * i,
  ];
  return RgbToHex({ rgbColor: levelColorRGB });
});
if (displayJarvisSpawnPieceAnimation)
  await jarvis.SpawnPieceStart({
    scales: new Vector3(
      groupBookScaleX ??
        BibleVizDataRepository.getStackPieceMeasurement("BookScales").x,
      groupBookScaleY ??
        BibleVizDataRepository.getStackPieceMeasurement("BookScales").y,
      levelScaleZ
    ),
  });
book = ObjectPooler.GetObjectFromPool({
  tag: BibleVizUtils.Data.tags.ObjectPoolTags.StackBook,
});
const bookMod = {
  [dimension]: true,
  [dimension + "X"]: spawnPosition.x,
  [dimension + "Y"]: spawnPosition.y,
  [dimension + "Z"]: spawnPosition.z,
  typeOfPiece: BibleVizUtils.Data.tags.BiblePieceType.StackBook,
  bookIndex: bookData.creationInfo.levelIndex,
  isStackPiece: true,
  bookName: bookData.pieceInfo.commonName,
  sectionName: bookData.pieceInfo.name,
  sectionIndex: bookData.creationInfo.sectionIndex,
  label: bookData.pieceInfo.commonName,
  labelColor:
    bookData.creationInfo.levelIndex <
    Math.floor(bookData.creationInfo.levelsLenght / 2)
      ? "#FFFFFF"
      : "#000000",
  labelOpacity: 0,
  formOpacity: 1,
  numberOfChapters: bookData.pieceInfo.numberOfChapters,
  explodedViewPosition: bookData.pieceInfo.explodedViewPosition,
  explodedViewCustomScale: bookData.pieceInfo.explodedViewCustomScale ?? null,
  isGroupBook: bookData.pieceInfo.group ? true : null,
  groupId: bookData.pieceInfo.group ?? null,
  groupBookIndex: bookData.pieceInfo.group
    ? bookData.creationInfo.bookLevelIndex
    : null,
  draggable: thisBot.masks.areBiblePiecesDraggable,
  desiredPositionZ: spawnPosition.z,
  scaleX:
    groupBookScaleX ??
    BibleVizDataRepository.getStackPieceMeasurement("BookScales").x,
  scaleY:
    groupBookScaleY ??
    BibleVizDataRepository.getStackPieceMeasurement("BookScales").y,
  scaleZ: levelScaleZ,
  initialScaleX:
    groupBookScaleX ??
    BibleVizDataRepository.getStackPieceMeasurement("BookScales").x,
  initialScaleY:
    groupBookScaleY ??
    BibleVizDataRepository.getStackPieceMeasurement("BookScales").y,
  initialScaleZ: levelScaleZ,
  hoveredScaleX:
    (groupBookScaleX ??
      BibleVizDataRepository.getStackPieceMeasurement("BookScales").x) +
    BibleVizDataRepository.getStackPieceMeasurement(
      "AditionalBookScaleOnHover"
    ),
  hoveredScaleY:
    (groupBookScaleY ??
      BibleVizDataRepository.getStackPieceMeasurement("BookScales").y) +
    BibleVizDataRepository.getStackPieceMeasurement(
      "AditionalBookScaleOnHover"
    ),
  desiredScaleZ: levelScaleZ,
  color: bookData.pieceInfo.customColor ?? levelsColors[levelIndex],
  strokeColor: "clear",
  orginalColor: levelsColors[levelIndex],
  initialColor: levelsColors[levelIndex],
  labelTextColor: levelsColors[Math.round(levelsColors.length * 0.4) - 1],
  // layoutBookDirectionNormalized: bookData.pieceInfo.group ? new Vector3(groupBookLayoutPositionX, groupBookLayoutPositionY, 0).normalize() : null,
  bookInfo: bookData.pieceInfo,
  singleBooksScales:
    BibleVizDataRepository.getStackPieceMeasurement("BookScales"),
  toErase: true,
};
book.OnSpawned({ mod: bookMod });
bookData.piece = book;
bookData.isActive = true;
setTagMask(book, "highlightable", true);
setTagMask(book, "pointable", true);
setTagMask(book, "isOnTheGround", true);
if (displayJarvisSpawnPieceAnimation)
  await jarvis.SpawnPieceEnd({
    scales: new Vector3(
      groupBookScaleX ??
        BibleVizDataRepository.getStackPieceMeasurement("BookScales").x,
      groupBookScaleY ??
        BibleVizDataRepository.getStackPieceMeasurement("BookScales").y,
      levelScaleZ
    ),
  });

return { book, bookData };
