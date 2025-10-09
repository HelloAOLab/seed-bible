const {chapterData} = that;

if (!chapterData.piece.masks.isSelecting && 
    !chapterData.piece.masks.isDeselecting && 
    !chapterData.piece.masks.isBeingDragged)
{
    chapterData.piece.Unhighlight({chapterData}).then(() => {
        if(!chapterData.piece.masks.isExpanded) BibleVizUtils.Functions.TryHideActivityNotificationOnPiece({piecesData: [chapterData], manager: thisBot})
    });
}