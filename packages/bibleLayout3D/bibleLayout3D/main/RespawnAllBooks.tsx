setTagMask(thisBot, "isAnimatingBible", true);

const {layoutData} = that;
const dimension = os.getCurrentDimension();
const respawnableBooksStructure = thisBot.vars.layoutBooksStructure.filter((layoutBookStructure) => {
    return !layoutBookStructure.layoutBookData.piece || layoutBookStructure.layoutBookData.isSelected
})
const bookShowDelay = 500;

const openAllBooksButton = layoutData.staticLayoutPieces.settingsButtons.find((button) => {return button.tags.buttonType === BibleVizUtils.Data.tags.LayoutButtonType.OpenAllBooksButton});

openAllBooksButton.links.buttonIcon.tags.formAddress = openAllBooksButton.tags.openIcon;
openAllBooksButton.links.buttonLabel.tags.label = "Open all books"
layoutData.hasSelectAllBooksBeenCalled = false
for(const respawnableBookStructure of respawnableBooksStructure)
{
    const activeChaptersData = respawnableBookStructure.layoutBookData.childrenData
    .filter((chapterData) => {return chapterData.piece})
    if(activeChaptersData.length > 0)
    {
        const activeChapters = activeChaptersData.map((chapterData) => {return chapterData.piece})
        ObjectPooler.ReleaseObject({obj: activeChapters, tag: activeChapters[0].tags.poolTag})
        activeChaptersData.forEach((chapterData) => {chapterData.ResetData();})
    }
    const book = await thisBot.SpawnBook({layoutData, layoutBookStructure: respawnableBookStructure});
    const nameLabelPosition = getBotPosition(respawnableBookStructure.nameLabel, dimension);

    const bookPositionMod = {
        [dimension + "X"]: nameLabelPosition.x,
        [dimension + "Y"]: nameLabelPosition.y - (BibleVizUtils.Data.BibleLayoutMeasurements.BookLabelHeight/2) - (book.tags.scaleY/2),
    }
    applyMod(book, bookPositionMod);
}
await respawnableBooksStructure.sort((structureA, structureB) => structureA.layoutBookData.piece.tags.index - structureB.layoutBookData.piece.tags.index)

await Promise.all(respawnableBooksStructure.map((layoutBookStructure, index) => {
    return animateTag(layoutBookStructure.layoutBookData.piece, {
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

shout("OnRespawnAllBooksOnLayoutComplete")

return;


// cover.ClearCurrentSelectedChapter();