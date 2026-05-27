import { BibleVizDataRepository } from "bibleVizUtils.data.BibleVizDataRepository";
import {
  GetChildrenLevelColors,
  HexToRgb,
} from "bibleVizUtils.functions.index";
import { arrangementService } from "bibleVizUtils.services.index";
import {
  ObjectPoolTags,
  type LayoutBookStructure,
} from "bibleVizUtils.models.canvas";
import type { Vector2 as Vector2Type } from "../../../../typings/AuxLibraryDefinitions";

const {
  layoutBookStructure,
  position,
}: {
  layoutBookStructure: LayoutBookStructure;
  position?: Vector2Type;
} = that;

const bookStaticInfo = BibleVizDataRepository.getBookStaticInfo(
  layoutBookStructure.layoutBookData.pieceInfo.commonName
);

if (!bookStaticInfo) {
  throw new Error("bookStaticInfo not found at SpawnBook");
}

const dimension = os.getCurrentDimension();
const { chaptersInfo } = bookStaticInfo;
const amountOfRows = Math.ceil(
  chaptersInfo.length /
    BibleVizDataRepository.getBibleLayoutMeasurement("Book3DMaxAmountOfColumns")
);
// TODO: Delete? -> const amountOfColumns = Math.min(BibleVizDataRepository.getBibleLayoutMeasurement("Book3DMaxAmountOfColumns"), chaptersInfo.length)
// TODO: Integrage -> const bookScaleY = thisBot.GetBookHeightByName({bookName: layoutBookStructure.layoutBookData.pieceInfo.commonName})
const bookScales = new Vector3(
  BibleVizDataRepository.getBibleLayoutMeasurement("Book3DScaleX"),
  amountOfRows *
    BibleVizDataRepository.getBibleLayoutMeasurement("Chapter3DHeight") +
    BibleVizDataRepository.getBibleLayoutMeasurement("Chapter3DPadding") * 2 +
    BibleVizDataRepository.getBibleLayoutMeasurement("Chapter3DGap") *
      (amountOfRows - 1),
  0.175
);

const book =
  layoutBookStructure.layoutBookData.piece ??
  (await ObjectPooler.GetObjectFromPool({
    tag: ObjectPoolTags.LayoutBook,
  }));

const { arrangementIndex, testamentIndex, sectionIndex, found } =
  arrangementService.getBookInfoPathByName({
    name: layoutBookStructure.layoutBookData.pieceInfo.commonName,
    arrangementIndex: arrangementService.getCurrentArrangementIndex(),
  });

if (!found) {
  console.error(`book info path not found at SpawnBook`);
  return book;
}

const sectionInfo = arrangementService.getSectionByIndices({
  arrangementIndex,
  testamentIndex: testamentIndex as number,
  sectionIndex: sectionIndex as number,
});

if (!sectionInfo) {
  console.error(`section not found at SpawnBook`);
  return book;
}

const bookIndexWithinSection = sectionInfo.books.findIndex((bookInfo) => {
  return (
    bookInfo.commonName ===
    layoutBookStructure.layoutBookData.pieceInfo.commonName
  );
});
const sectionLevelsColors = GetChildrenLevelColors({
  sectionColorRGB: HexToRgb({
    hexColor: sectionInfo.color,
  }),
  colorRange: sectionInfo.customColorRange ?? 70,
  levelsLength: sectionInfo.books.length,
});

const color =
  layoutBookStructure.layoutBookData.highlightColor ??
  layoutBookStructure.layoutBookData.pieceInfo.customColor ??
  sectionLevelsColors[bookIndexWithinSection];

const layoutBookMod = {
  [dimension]: true,
  [dimension + "X"]: position ? position.x : null,
  [dimension + "Y"]: position ? position.y : null,
  [dimension + "Z"]:
    BibleVizDataRepository.getBibleLayoutMeasurement("BookPositionZ"),
  scaleX: bookScales.x,
  scaleY: bookScales.y,
  scaleZ: bookScales.z,
  color: color,
  initialColor: color,
  draggable: true,
  apiName: layoutBookStructure.layoutBookData.pieceInfo.commonName,
  bookName: layoutBookStructure.layoutBookData.pieceInfo.commonName,
  sectionName: sectionInfo.name,
  startChapter: bookStaticInfo.startingIndex ?? 0,
  chapterCount: bookStaticInfo.numberOfChapters,
  index: layoutBookStructure.structureIndex,
  system: null,
  formOpacity: 0,
  arrangementIndex,
  testamentIndex,
  sectionIndex,
};
book.OnSpawned({ mod: layoutBookMod });
layoutBookStructure.layoutBookData.setPiece(book);
layoutBookStructure.layoutBookData.activate();
layoutBookStructure.layoutBookData.deselect();
if (BibleVizUtils.Data.masks.isInHistoryMode)
  setTagMask(
    book,
    "color",
    BibleVizUtils.Functions.GetHistoryColor({ piece: book })
  );

return book;
