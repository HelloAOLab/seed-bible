setTagMask(thisBot, "isAnimatingMap", true);

const {layoutData} = that;
layoutData.hasSelectAllBooksBeenCalled = true

const openAllBooksButton = layoutData.staticLayoutPieces.settingsButtons.find((button) => {return button.tags.buttonType === BibleVizUtils.Data.LayoutButtonType.OpenAllBooksButton});

openAllBooksButton.links.buttonLabel.tags.label = "Close all books"
openAllBooksButton.links.buttonIcon.tags.formAddress = openAllBooksButton.tags.closeIcon;

const unselectedBooksData = thisBot.vars.layoutBooksData.filter((bookData) => {return bookData.piece && !bookData.isSelected})
await unselectedBooksData.sort((bookDataA, bookDataB) => bookDataA.piece.tags.index - bookDataB.piece.tags.index)

for(const bookData of unselectedBooksData)
{
    await thisBot.SelectBook({layoutBookData: bookData, layoutData, fromOpenAllButton: true})
}

shout("OnSelectAllBooksOnLayoutComplete")