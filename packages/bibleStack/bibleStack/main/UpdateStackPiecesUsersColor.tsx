const availableChaptersData = thisBot.vars.stackChaptersData.filter((chapterData) => {
    return chapterData.piece 
        && chapterData.piece.tags.isInUse
            && chapterData.piece.masks.isExpanded 
                && !chapterData.piece.masks.isDeselecting 
                    && !chapterData.piece.masks.isSelecting
})
const availablePiecesData = [
    ...availableChaptersData
]
const availablePieces = availablePiecesData.map((pieceData) => {return pieceData.piece})
BibleVizUtils.Functions.UpdateUsersColorOnPiece({pieces: availablePieces, manager: thisBot});