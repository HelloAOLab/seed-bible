clearAnimations(thisBot);

for(const layoutData of thisBot.vars.layoutsData.slice())
{
    await thisBot.DeletePiece({pieceData: layoutData})
}
for(const bookData of thisBot.vars.layoutBooksData.slice())
{
    await thisBot.DeletePiece({pieceData: bookData})
}
for(const chapterData of thisBot.vars.layoutChaptersData.slice())
{
    await thisBot.DeletePiece({pieceData: chapterData})
}

clearTagMasks(thisBot);