setTagMask(thisBot, "isBibleAnimating", true);
if(thisBot.vars.currentSelectedBookData)
{
    const currentBook = thisBot.vars.currentSelectedBookData.isSectionBook ? thisBot.vars.currentSelectedBookData.section : thisBot.vars.currentSelectedBookData.book;
    thisBot.vars.currentSelectedBookData.isSelected = false;
    setTagMask(currentBook, "pointable", true);
    setTagMask(currentBook, "highlightable", true);
    thisBot.vars.currentSelectedBookData = null;
}
await thisBot.UpdateStacks();
setTagMask(thisBot, "isBibleAnimating", false);