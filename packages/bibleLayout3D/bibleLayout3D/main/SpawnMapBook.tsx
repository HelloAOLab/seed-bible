const {layoutBookStructure, position} = that;
const dimension = os.getCurrentDimension();
const {chaptersInfo} = BibleVizUtils.Data.tags.booksStaticInfo[layoutBookStructure.layoutBookData.elementInfo.commonName];
const amountOfRows = Math.ceil(chaptersInfo.length / BibleVizUtils.Data.BibleLayoutMeasurements.BookMaxAmountOfColumns)
// Delete? -> const amountOfColumns = Math.min(BibleVizUtils.Data.BibleLayoutMeasurements.BookMaxAmountOfColumns, chaptersInfo.length)
// Integrage -> const bookScaleY = thisBot.GetBookHeightByName({bookName: layoutBookStructure.layoutBookData.elementInfo.commonName})
const bookScales = new Vector3(
    BibleVizUtils.Data.BibleLayoutMeasurements.BookScaleX,
    (amountOfRows * BibleVizUtils.Data.BibleLayoutMeasurements.ChapterHeight) + (BibleVizUtils.Data.BibleLayoutMeasurements.ChapterPadding * 2) + (BibleVizUtils.Data.BibleLayoutMeasurements.ChapterGap * (amountOfRows - 1)), 
    0.175
);

const book = layoutBookStructure.layoutBookData.element ?? ObjectPooler.GetObjectFromPool({tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutBook});

const {arrangementIndex, testamentIndex, sectionIndex} = StacksManager.GetBookInfoPathByName({
    name: layoutBookStructure.layoutBookData.elementInfo.commonName, 
    arrangementIndex: BibleVizUtils.Functions.GetCurrentArrangementIndex()
});

const sectionName = BibleVizUtils.Data.vars.fixedArrangementsInfo[arrangementIndex].testaments[testamentIndex].sections[sectionIndex].name;

const bookIndexWithinSection = BibleVizUtils.Data.vars.fixedArrangementsInfo[arrangementIndex].testaments[testamentIndex].sections[sectionIndex].books.findIndex((bookInfo) => {
    return bookInfo.commonName === layoutBookStructure.layoutBookData.elementInfo.commonName;
})

const sectionInfo = BibleVizUtils.Data.vars.fixedArrangementsInfo.slice()[arrangementIndex].testaments[testamentIndex].sections[sectionIndex]
const sectionLevelsColors = GetChildrenLevelColors({
    sectionColorRGB: HexToRgb(sectionInfo.color), 
    colorRange: sectionInfo.customColorRange ?? 70, 
    levelsLength: sectionInfo.books.length
})

const color = layoutBookStructure.layoutBookData.highlightColor ??
    layoutBookStructure.layoutBookData.elementInfo.customColor ??
        sectionLevelsColors[bookIndexWithinSection];

const mapBookMod = {
    [dimension]: true,
    [dimension + "X"]: position ? position.x : null,
    [dimension + "Y"]: position ? position.y : null,
    [dimension + "Z"]: BibleVizUtils.Data.BibleLayoutMeasurements.BookPositionZ,
    scaleX: bookScales.x,
    scaleY: bookScales.y,
    scaleZ: bookScales.z,
    color: color,
    initialColor: color,
    draggable: true,
    apiName: layoutBookStructure.layoutBookData.elementInfo.commonName,
    bookName: layoutBookStructure.layoutBookData.elementInfo.commonName,
    sectionName,
    startChapter: layoutBookStructure.layoutBookData.elementInfo.startingIndex ?? 0,
    chapterCount: layoutBookStructure.layoutBookData.elementInfo.numberOfChapters,
    index: layoutBookStructure.structureIndex,
    system: null,
    formOpacity: 0,
    arrangementIndex, 
    testamentIndex, 
    sectionIndex
};
book.OnSpawned({mod: mapBookMod});
layoutBookStructure.layoutBookData.element = book;
layoutBookStructure.layoutBookData.isActive = true;
layoutBookStructure.layoutBookData.isSelected = false;
if(InstanceManager.masks.isInHistoryMode) setTagMask(book, "color", GetHistoryColor({element: book}))

return book;