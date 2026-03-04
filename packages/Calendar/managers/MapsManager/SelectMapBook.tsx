const {mapBookData, mapData, fromOpenAllButton = false, chaptersMod = {}} = that;

setTagMask(thisBot, "isAnimatingMap", true);

mapBookData.isSelected = true;
let dimension = os.getCurrentDimension()
const mapBookPosition = getBotPosition(mapBookData.element, dimension);
const mapBookScales = GetBotScales(mapBookData.element);
const chaptersOriginPosition = new Vector2(mapBookPosition.x - (mapBookData.element.tags.scaleX/2), mapBookPosition.y + (mapBookData.element.tags.scaleY/2));
var column = 0;
var row = 0;
const chapterShowDuration = 0.03

InstanceManager.TryHideUsersColorOnElement({element: mapBookData.element})
shout("OnBibleElementSelected", {element: mapBookData.element});

if(!fromOpenAllButton)
{
    if(mapData?.isCameraAnimationEnabled)
    {
        os.focusOn({x: mapBookPosition.x, y: mapBookPosition.y, z:0}, {
            rotation: {x:0,y:0,z:0},
            zoom: 18
        })
    }
    await animateTag(mapBookData.element, {
        fromValue: {
            formOpacity: 1,
            scaleX: mapBookScales.x,
            scaleY: mapBookScales.y
        },
        toValue: {
            formOpacity: 0,
            scaleX: mapBookScales.x + 1,
            scaleY: mapBookScales.y + 1
        },
        duration: fromOpenAllButton ? 0.005 : 0.3
    }).finally(() => {
        setTagMask(mapBookData.element, "scaleX", mapBookScales.x);
        setTagMask(mapBookData.element, "scaleY", mapBookScales.y);
    })
}
mapBookData.element.tags[dimension] = false
const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const {relativeDateRange} = StacksManager.tags.booksStaticInfo[mapBookData.elementInfo.commonName]
const historicalDateRange  = `${Math.abs(relativeDateRange.min)}${(relativeDateRange.min != relativeDateRange.max) ? `-${Math.abs(relativeDateRange.max)}` : ``} ${relativeDateRange.min < 0 ? "B.C." : "A.D."}`
const elapsedYearsRange = `${currentYear - relativeDateRange.min}${relativeDateRange.min != relativeDateRange.max ? `-${currentYear - relativeDateRange.max}` : ``} years ago`

for(let mapChapterData of mapBookData.childrenData)
{
    const mapChapter = ObjectPooler.GetObjectFromPool({tag: ObjectPoolTags.MapChapter});
    const mapChapterMod = {
        [dimension]: true,
        [dimension + "X"]: chaptersOriginPosition.x + (MapElementMeasurements.ChapterWidth/2) + MapElementMeasurements.ChapterPadding + (column * (MapElementMeasurements.ChapterWidth + MapElementMeasurements.ChapterGap)),
        [dimension + "Y"]: chaptersOriginPosition.y - (MapElementMeasurements.ChapterHeight/2) - MapElementMeasurements.ChapterPadding - (row * (MapElementMeasurements.ChapterHeight + MapElementMeasurements.ChapterGap)),
        [dimension + "Z"]: MapElementMeasurements.BookPositionZ,
        scale: 0,
        scaleX: MapElementMeasurements.ChapterWidth,
        scaleY: MapElementMeasurements.ChapterHeight,
        scaleZ: MapElementMeasurements.ChapterInitialScaleZ,
        initialScaleX: MapElementMeasurements.ChapterWidth,
        initialScaleY: MapElementMeasurements.ChapterHeight,
        initialScaleZ: MapElementMeasurements.ChapterInitialScaleZ,
        selectedScaleZ: MapElementMeasurements.ChapterSelectedScaleZ,
        desiredLabel: (mapBookData.element.tags.startChapter) + mapChapterData.elementInfo.number ,
        toErase: mapBookData.element.tags.toErase,
        initialColor: "#FFFFFF",
        historicalDateRange,
        elapsedYearsRange,
        labelFontSize: 0.5,
        parentBookName: mapBookData.elementInfo.commonName,
        arrangementIndex: mapBookData.creationInfo.arrangementIndex,
        isYear: mapData?.isDatesEnabled == 2 ? false:true,
        isShowYear: mapData?.isDatesEnabled == 1 ? false :true,
        // layerIndex: mapChapterData.layerIndex,
        structureIndex: mapChapterData.structureIndex,
        chapterNumber: mapChapterData.elementInfo.number,
        ...chaptersMod
    }
    mapChapter.OnSpawned({mod: mapChapterMod});
    mapChapterData.element = mapChapter;
    mapChapterData.isActive = true;
    if(InstanceManager.masks.isInHistoryMode) setTagMask(mapChapter, "color", GetHistoryColor({element: mapChapter}))
    else if(mapChapterData.highlightColor) setTagMask(chapter, "color", mapChapterData.highlightColor);
    column += 1

    if (column >= (MapElementMeasurements.BookMaxAmountOfColumns)) {
        column = 0
        row += 1
    }
}

if(fromOpenAllButton)
{
    mapBookData.childrenData.forEach((mapChapterData) => {
        setTag(mapChapterData.element, "scale", 1);
        setTag(mapChapterData.element, "label", mapChapterData.element.tags.desiredLabel);
    })
    return true;
}
else
{
    return Promise.all(mapBookData.childrenData.map((mapChapterData, index) => {
        return animateTag(mapChapterData.element, "scale", {
            toValue: 1,
            duration: chapterShowDuration,
            startTime: os.localTime + (index * chapterShowDuration * 1000)
        }).then(() => {setTag(mapChapterData.element, "label", mapChapterData.element.tags.desiredLabel)})
    })).then(() => {shout("OnSelectMapBookComplete", {fromOpenAllButton})})
}