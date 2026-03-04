const { layoutBookStructure, position } = that;
const dimension = os.getCurrentDimension();
const { chaptersInfo } =
  BibleVizUtils.Data.tags.booksStaticInfo[
    layoutBookStructure.layoutBookData.pieceInfo.commonName
  ];
const amountOfRows = Math.ceil(
  chaptersInfo.length /
    BibleVizUtils.Data.tags.BibleLayoutMeasurements.Book3DMaxAmountOfColumns
);
// Delete? -> const amountOfColumns = Math.min(BibleVizUtils.Data.tags.BibleLayoutMeasurements.Book3DMaxAmountOfColumns, chaptersInfo.length)
// Integrage -> const bookScaleY = thisBot.GetBookHeightByName({bookName: layoutBookStructure.layoutBookData.pieceInfo.commonName})
const bookScales = new Vector3(
  BibleVizUtils.Data.tags.BibleLayoutMeasurements.Book3DScaleX,
  amountOfRows *
    BibleVizUtils.Data.tags.BibleLayoutMeasurements.Chapter3DHeight +
    BibleVizUtils.Data.tags.BibleLayoutMeasurements.Chapter3DPadding * 2 +
    BibleVizUtils.Data.tags.BibleLayoutMeasurements.Chapter3DGap *
      (amountOfRows - 1),
  0.175
);

const book =
  layoutBookStructure.layoutBookData.piece ??
  ObjectPooler.GetObjectFromPool({
    tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutBook,
  });

const { arrangementIndex, testamentIndex, sectionIndex } =
  BibleVizUtils.Functions.GetBookInfoPathByName({
    name: layoutBookStructure.layoutBookData.pieceInfo.commonName,
    arrangementIndex: BibleVizUtils.Functions.GetCurrentArrangementIndex(),
  });

const sectionName =
  BibleVizUtils.Data.vars.fixedArrangementsInfo[arrangementIndex].testaments[
    testamentIndex
  ].sections[sectionIndex].name;

const bookIndexWithinSection = BibleVizUtils.Data.vars.fixedArrangementsInfo[
  arrangementIndex
].testaments[testamentIndex].sections[sectionIndex].books.findIndex(
  (bookInfo) => {
    return (
      bookInfo.commonName ===
      layoutBookStructure.layoutBookData.pieceInfo.commonName
    );
  }
);

const sectionInfo =
  BibleVizUtils.Data.vars.fixedArrangementsInfo.slice()[arrangementIndex]
    .testaments[testamentIndex].sections[sectionIndex];
const sectionLevelsColors = BibleVizUtils.Functions.GetChildrenLevelColors({
  sectionColorRGB: BibleVizUtils.Functions.HexToRgb({
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
    BibleVizUtils.Data.tags.BibleLayoutMeasurements.BookPositionZ,
  scaleX: bookScales.x,
  scaleY: bookScales.y,
  scaleZ: bookScales.z,
  color: color,
  initialColor: color,
  draggable: true,
  apiName: layoutBookStructure.layoutBookData.pieceInfo.commonName,
  bookName: layoutBookStructure.layoutBookData.pieceInfo.commonName,
  sectionName,
  startChapter: layoutBookStructure.layoutBookData.pieceInfo.startingIndex ?? 0,
  chapterCount: layoutBookStructure.layoutBookData.pieceInfo.numberOfChapters,
  index: layoutBookStructure.structureIndex,
  system: null,
  formOpacity: 0,
  arrangementIndex,
  testamentIndex,
  sectionIndex,
};
book.OnSpawned({ mod: layoutBookMod });
layoutBookStructure.layoutBookData.piece = book;
layoutBookStructure.layoutBookData.isActive = true;
layoutBookStructure.layoutBookData.isSelected = false;
if (BibleVizUtils.Data.masks.isInHistoryMode)
  setTagMask(
    book,
    "color",
    BibleVizUtils.Functions.GetHistoryColor({ piece: book })
  );

return book;
