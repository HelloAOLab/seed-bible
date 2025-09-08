/**
    * Delete every stack in the canvas and clears every temp data on the stacks manager.
    * @example
    * shout('ClearStacks')
*/

clearAnimations(thisBot);

for(let bibleData of thisBot.vars.biblesData.slice())
{
    await StacksManager.DeleteElement({elementData: bibleData})
}
for(let testamentData of thisBot.vars.testamentsData.slice())
{
    await StacksManager.DeleteElement({elementData: testamentData})
}
for(let sectionData of thisBot.vars.sectionsData.slice())
{
    await StacksManager.DeleteElement({elementData: sectionData})
}
for(let sectionBookData of thisBot.vars.sectionBooksData.slice())
{
    await StacksManager.DeleteElement({elementData: sectionBookData})
}
for(let bookData of thisBot.vars.booksData.slice())
{
    await StacksManager.DeleteElement({elementData: bookData})
}
for(let chapterData of thisBot.vars.chaptersData.slice())
{
    await StacksManager.DeleteElement({elementData: chapterData})
}
thisBot.vars.unhighlightDelaysInfo.forEach((unhighlightDelayInfo) => {
    clearTimeout(unhighlightDelayInfo.timeoutId);
})

thisBot.vars.lastInteractedBookData = null;
thisBot.vars.lastInteractedSectionData = null;
thisBot.vars.lastInteractedTestamentData = null;
thisBot.vars.lastInteractedBibleData = null;

clearTagMasks(thisBot);
thisBot.Initialize();