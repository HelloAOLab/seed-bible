clearAnimations(thisBot);

for(const bibleData of thisBot.vars.biblesData.slice())
{
    await StacksManager.DeleteElement({elementData: bibleData})
}
for(const testamentData of thisBot.vars.testamentsData.slice())
{
    await StacksManager.DeleteElement({elementData: testamentData})
}
for(const sectionData of thisBot.vars.sectionsData.slice())
{
    await StacksManager.DeleteElement({elementData: sectionData})
}
for(const sectionBookData of thisBot.vars.sectionBooksData.slice())
{
    await StacksManager.DeleteElement({elementData: sectionBookData})
}
for(const bookData of thisBot.vars.booksData.slice())
{
    await StacksManager.DeleteElement({elementData: bookData})
}
for(const chapterData of thisBot.vars.chaptersData.slice())
{
    await StacksManager.DeleteElement({elementData: chapterData})
}
thisBot.vars.unhighlightDelaysInfo.forEach((unhighlightDelayInfo) => {
    clearTimeout(unhighlightDelayInfo.timeoutId);
})

clearTagMasks(thisBot);
thisBot.Initialize();