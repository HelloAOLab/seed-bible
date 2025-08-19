setTagMask(thisBot, "isAnimatingMap", true);

const {layoutData} = that;
const dimension = os.getCurrentDimension();
const respawnableBooksStructure = thisBot.vars.layoutBooksStructure.filter((layoutBookStructure) => {
    return !layoutBookStructure.layoutBookData.element || layoutBookStructure.layoutBookData.isSelected
})
const bookShowDelay = 500;

const openAllBooksButton = layoutData.staticLayoutElements.settingsButtons.find((button) => {return button.tags.buttonType === BibleVizUtils.Data.LayoutButtonType.OpenAllBooksButton});

openAllBooksButton.links.buttonIcon.tags.formAddress = openAllBooksButton.tags.openIcon;
openAllBooksButton.links.buttonLabel.tags.label = "Open all books"
layoutData.hasSelectAllBooksBeenCalled = false
for(const respawnableBookStructure of respawnableBooksStructure)
{
    const activeChaptersData = respawnableBookStructure.layoutBookData.childrenData
    .filter((chapterData) => {return chapterData.element})
    if(activeChaptersData.length > 0)
    {
        const activeChapters = activeChaptersData.map((chapterData) => {return chapterData.element})
        ObjectPooler.ReleaseObject({obj: activeChapters, tag: activeChapters[0].tags.poolTag})
        activeChaptersData.forEach((chapterData) => {chapterData.ResetData();})
    }
    const book = await thisBot.SpawnMapBook({layoutData, layoutBookStructure: respawnableBookStructure});
    const nameLabelPosition = getBotPosition(respawnableBookStructure.nameLabel, dimension);

    const mapBookPositionMod = {
        [dimension + "X"]: nameLabelPosition.x,
        [dimension + "Y"]: nameLabelPosition.y - (BibleVizUtils.Data.BibleLayoutMeasurements.BookLabelHeight/2) - (book.tags.scaleY/2),
    }
    applyMod(book, mapBookPositionMod);
}
await respawnableBooksStructure.sort((structureA, structureB) => structureA.layoutBookData.element.tags.index - structureB.layoutBookData.element.tags.index)

await Promise.all(respawnableBooksStructure.map((layoutBookStructure, index) => {
    return animateTag(layoutBookStructure.layoutBookData.element, {
        fromValue: {
            formOpacity: 0
        },
        toValue: {
            formOpacity: 1,
        },
        duration: 0.007,
        startTime: os.localTime + bookShowDelay + (index * 20),
    })
}))

shout("OnRespwnAllBooksOnMapComplete")

return;


// cover.ClearCurrentSelectedChapter();