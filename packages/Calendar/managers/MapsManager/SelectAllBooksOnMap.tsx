setTagMask(thisBot, "isAnimatingMap", true);

const {mapData} = that;
mapData.hasSelectAllBooksBeenCalled = true

const openAllBooksButton = mapData.staticMapElements.settingsButtons.find((button) => {return button.tags.buttonType === MapButtonType.OpenAllBooksButton});

openAllBooksButton.links.buttonLabel.tags.label = "Close all books"
openAllBooksButton.links.buttonIcon.tags.formAddress = openAllBooksButton.tags.closeIcon;

const unselectedBooksData = thisBot.vars.mapBooksData.filter((bookData) => {return bookData.element && !bookData.isSelected})
await unselectedBooksData.sort((bookDataA, bookDataB) => bookDataA.element.tags.index - bookDataB.element.tags.index)

for(let bookData of unselectedBooksData)
{
    await thisBot.SelectMapBook({mapBookData: bookData, mapData, fromOpenAllButton: true})
}

shout("OnSelectAllBooksOnMapComplete")