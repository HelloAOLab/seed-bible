let { mapBookStructure, mapData, position } = that;
const dimension = os.getCurrentDimension();
const { chaptersInfo } =
  StacksManager.tags.booksStaticInfo[
    mapBookStructure.mapBookData.elementInfo.commonName
  ];
const amountOfRows = Math.ceil(
  chaptersInfo.length / MapElementMeasurements.BookMaxAmountOfColumns
);
// Delete? -> const amountOfColumns = Math.min(MapElementMeasurements.BookMaxAmountOfColumns, chaptersInfo.length)
// Integrage -> const bookScaleY = thisBot.GetMapBookHeightByName({bookName: mapBookStructure.mapBookData.elementInfo.commonName})
const bookScales = new Vector3(
  MapElementMeasurements.BookScaleX,
  amountOfRows * MapElementMeasurements.ChapterHeight +
    MapElementMeasurements.ChapterPadding * 2 +
    MapElementMeasurements.ChapterGap * (amountOfRows - 1),
  0.175
);

const mapBook =
  mapBookStructure.mapBookData.element ??
  ObjectPooler.GetObjectFromPool({ tag: ObjectPoolTags.MapBook });

const { arrangementIndex, testamentIndex, sectionIndex } =
  StacksManager.GetBookInfoPathByName({
    name: mapBookStructure.mapBookData.elementInfo.commonName,
    arrangementIndex: StacksManager.GetCurrentArrangementIndex(),
  });

const sectionName =
  InstanceManager.vars.fixedArrangementsInfo[arrangementIndex].testaments[
    testamentIndex
  ].sections[sectionIndex].name;

const bookIndexWithinSection = InstanceManager.vars.fixedArrangementsInfo[
  arrangementIndex
].testaments[testamentIndex].sections[sectionIndex].books.findIndex(
  (bookInfo) => {
    return (
      bookInfo.commonName ===
      mapBookStructure.mapBookData.elementInfo.commonName
    );
  }
);

const sectionInfo =
  InstanceManager.vars.fixedArrangementsInfo.slice()[arrangementIndex]
    .testaments[testamentIndex].sections[sectionIndex];
const sectionLevelsColors = GetChildrenLevelColors({
  sectionColorRGB: HexToRgb(sectionInfo.color),
  colorRange: sectionInfo.customColorRange ?? 70,
  levelsLength: sectionInfo.books.length,
});

const color =
  mapBookStructure.mapBookData.highlightColor ??
  mapBookStructure.mapBookData.elementInfo.customColor ??
  sectionLevelsColors[bookIndexWithinSection];

const mapBookMod = {
  [dimension]: true,
  [dimension + "X"]: position ? position.x : null,
  [dimension + "Y"]: position ? position.y : null,
  [dimension + "Z"]: MapElementMeasurements.BookPositionZ,
  scaleX: bookScales.x,
  scaleY: bookScales.y,
  scaleZ: bookScales.z,
  color: color,
  initialColor: color,
  draggable: true,
  apiName: mapBookStructure.mapBookData.elementInfo.commonName,
  bookName: mapBookStructure.mapBookData.elementInfo.commonName,
  sectionName,
  startChapter: mapBookStructure.mapBookData.elementInfo.startingIndex ?? 0,
  chapterCount: mapBookStructure.mapBookData.elementInfo.numberOfChapters,
  index: mapBookStructure.structureIndex,
  system: null,
  formOpacity: 0,
  arrangementIndex,
  testamentIndex,
  sectionIndex,
};
mapBook.OnSpawned({ mod: mapBookMod });
mapBookStructure.mapBookData.element = mapBook;
mapBookStructure.mapBookData.isActive = true;
mapBookStructure.mapBookData.isSelected = false;
if (InstanceManager.masks.isInHistoryMode)
  setTagMask(mapBook, "color", GetHistoryColor({ element: mapBook }));

return mapBook;
