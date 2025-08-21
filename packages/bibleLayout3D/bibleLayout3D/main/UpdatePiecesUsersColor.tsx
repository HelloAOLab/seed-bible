const availablechaptersData = thisBot.vars.layoutChaptersData.filter((chapterData) => {
    return chapterData.piece 
        && chapterData.piece.tags.isInUse
            && chapterData.piece.masks.isExpanded 
                && !chapterData.piece.masks.isDeselecting 
                    && !chapterData.piece.masks.isSelecting
})
const availableMapBooksData = thisBot.vars.layoutBooksData.filter((layoutBookData) => {
    return layoutBookData.piece 
        && !layoutBookData.isSelected
});
const availablePiecesData = [
    ...availablechaptersData,
    ...availableMapBooksData
]
const availablePieces = availablePiecesData.map((pieceData) => {return pieceData.piece})
BibleVizUtils.Functions.UpdateUsersColorOnPiece({pieces: availablePieces});