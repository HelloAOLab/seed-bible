const {layoutBookData, layoutData, fromOpenAllButton = false, chaptersMod = {}} = that;

setTagMask(thisBot, "isAnimatingMap", true);

layoutBookData.isSelected = true;
const dimension = os.getCurrentDimension()
const bookPosition = getBotPosition(layoutBookData.element, dimension);
const bookScales = BibleVizUtils.Functions.GetBotScales({bot: layoutBookData.element});
const chaptersOriginPosition = new Vector2(bookPosition.x - (layoutBookData.element.tags.scaleX/2), bookPosition.y + (layoutBookData.element.tags.scaleY/2));
let column = 0;
let row = 0;
const chapterShowDuration = 0.03

BibleVizUtils.Functions.TryHideUsersColorOnElement({element: layoutBookData.element})
shout("OnBibleElementSelected", {element: layoutBookData.element});

if(!fromOpenAllButton)
{
    if(layoutData?.isCameraAnimationEnabled)
    {
        os.focusOn({x: bookPosition.x, y: bookPosition.y, z:0}, {
            rotation: {x:0,y:0,z:0},
            zoom: 18
        })
    }
    await animateTag(layoutBookData.element, {
        fromValue: {
            formOpacity: 1,
            scaleX: bookScales.x,
            scaleY: bookScales.y
        },
        toValue: {
            formOpacity: 0,
            scaleX: bookScales.x + 1,
            scaleY: bookScales.y + 1
        },
        duration: fromOpenAllButton ? 0.005 : 0.3
    }).finally(() => {
        setTagMask(layoutBookData.element, "scaleX", bookScales.x);
        setTagMask(layoutBookData.element, "scaleY", bookScales.y);
    })
}
layoutBookData.element.tags[dimension] = false
const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const {relativeDateRange} = BibleVizUtils.Data.tags.booksStaticInfo[layoutBookData.elementInfo.commonName]
const historicalDateRange  = `${Math.abs(relativeDateRange.min)}${(relativeDateRange.min != relativeDateRange.max) ? `-${Math.abs(relativeDateRange.max)}` : ``} ${relativeDateRange.min < 0 ? "B.C." : "A.D."}`
const elapsedYearsRange = `${currentYear - relativeDateRange.min}${relativeDateRange.min != relativeDateRange.max ? `-${currentYear - relativeDateRange.max}` : ``} years ago`

for(const chapterData of layoutBookData.childrenData)
{
    const chapter = ObjectPooler.GetObjectFromPool({tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutChapter});
    const chapterMod = {
        [dimension]: true,
        [dimension + "X"]: chaptersOriginPosition.x + (BibleVizUtils.Data.BibleLayoutMeasurements.ChapterWidth/2) + BibleVizUtils.Data.BibleLayoutMeasurements.ChapterPadding + (column * (BibleVizUtils.Data.BibleLayoutMeasurements.ChapterWidth + BibleVizUtils.Data.BibleLayoutMeasurements.ChapterGap)),
        [dimension + "Y"]: chaptersOriginPosition.y - (BibleVizUtils.Data.BibleLayoutMeasurements.ChapterHeight/2) - BibleVizUtils.Data.BibleLayoutMeasurements.ChapterPadding - (row * (BibleVizUtils.Data.BibleLayoutMeasurements.ChapterHeight + BibleVizUtils.Data.BibleLayoutMeasurements.ChapterGap)),
        [dimension + "Z"]: BibleVizUtils.Data.BibleLayoutMeasurements.BookPositionZ,
        scale: 0,
        scaleX: BibleVizUtils.Data.BibleLayoutMeasurements.ChapterWidth,
        scaleY: BibleVizUtils.Data.BibleLayoutMeasurements.ChapterHeight,
        scaleZ: BibleVizUtils.Data.BibleLayoutMeasurements.ChapterInitialScaleZ,
        initialScaleX: BibleVizUtils.Data.BibleLayoutMeasurements.ChapterWidth,
        initialScaleY: BibleVizUtils.Data.BibleLayoutMeasurements.ChapterHeight,
        initialScaleZ: BibleVizUtils.Data.BibleLayoutMeasurements.ChapterInitialScaleZ,
        selectedScaleZ: BibleVizUtils.Data.BibleLayoutMeasurements.ChapterSelectedScaleZ,
        desiredLabel: (layoutBookData.element.tags.startChapter) + chapterData.elementInfo.number ,
        toErase: layoutBookData.element.tags.toErase,
        initialColor: "#FFFFFF",
        historicalDateRange,
        elapsedYearsRange,
        labelFontSize: 0.5,
        parentBookName: layoutBookData.elementInfo.commonName,
        arrangementIndex: layoutBookData.creationInfo.arrangementIndex,
        isYear: layoutData?.isDatesEnabled == 2 ? false:true,
        isShowYear: layoutData?.isDatesEnabled == 1 ? false :true,
        // layerIndex: chapterData.layerIndex,
        structureIndex: chapterData.structureIndex,
        chapterNumber: chapterData.elementInfo.number,
        ...chaptersMod
    }
    chapter.OnSpawned({mod: chapterMod});
    chapterData.element = chapter;
    chapterData.isActive = true;
    if(BibleVizUtils.Data.masks.isInHistoryMode) setTagMask(chapter, "color", BibleVizUtils.Functions.GetHistoryColor({element: chapter}))
    else if(chapterData.highlightColor) setTagMask(chapter, "color", chapterData.highlightColor);
    column += 1

    if (column >= (BibleVizUtils.Data.BibleLayoutMeasurements.BookMaxAmountOfColumns)) {
        column = 0
        row += 1
    }
}

if(fromOpenAllButton)
{
    layoutBookData.childrenData.forEach((chapterData) => {
        setTag(chapterData.element, "scale", 1);
        setTag(chapterData.element, "label", chapterData.element.tags.desiredLabel);
    })
    return true;
}
else
{
    return Promise.all(layoutBookData.childrenData.map((chapterData, index) => {
        return animateTag(chapterData.element, "scale", {
            toValue: 1,
            duration: chapterShowDuration,
            startTime: os.localTime + (index * chapterShowDuration * 1000)
        }).then(() => {setTag(chapterData.element, "label", chapterData.element.tags.desiredLabel)})
    })).then(() => {shout("OnSelectLayoutBookComplete", {fromOpenAllButton})})
}