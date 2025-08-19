const {mapBookLabel} = that;
const dimension = os.getCurrentDimension();

if(thisBot.masks.isAnimatingMap) return;

const layoutBookStructure = thisBot.GetBookStructureByChild({mapBookLabel});
const layoutData = thisBot.GetLayoutDataById({layoutId: layoutBookStructure.layoutId});
if(!layoutBookStructure.layoutBookData.element || layoutBookStructure.layoutBookData.isSelected && !layoutData.currentPlaylistShownId)
{
    const activeChaptersData = layoutBookStructure.layoutBookData.childrenData
        .filter((chapterData) => {return chapterData.element})
    if(activeChaptersData.length > 0)
    {
        const activeChapters = activeChaptersData.map((chapterData) => {return chapterData.element})
        ObjectPooler.ReleaseObject({obj: activeChapters, tag: activeChapters[0].tags.poolTag})
        activeChaptersData.forEach((chapterData) => {chapterData.ResetData();})
    }
    const nameLabelPosition = getBotPosition(layoutBookStructure.nameLabel, dimension);

    const book = thisBot.SpawnMapBook({layoutData, layoutBookStructure});
    
    const mapBookPositionMod = {
        [dimension + "X"]: nameLabelPosition.x,
        [dimension + "Y"]: nameLabelPosition.y - (BibleVizUtils.Data.BibleLayoutMeasurements.BookLabelHeight/2) - (book.tags.scaleY/2),
    }
    applyMod(book, mapBookPositionMod);

    animateTag(layoutBookStructure.layoutBookData.element, {
        fromValue: {
            formOpacity: 0
        },
        toValue: {
            formOpacity: 1,
        },
        duration: 0.007
    })
}