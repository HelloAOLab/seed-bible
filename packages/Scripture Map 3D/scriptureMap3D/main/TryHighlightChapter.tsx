const {chapterData} = that;

console.log(`[Debug] TryHighlightChapter`, {
    piece: JSON.parse(JSON.stringify(chapterData.piece)),
    "chapterData.piece.masks.isOnTheGround": chapterData.piece.masks.isOnTheGround,
    "!chapterData.isSelected": !chapterData.isSelected,
    hiddingActivityNotificatioOnPiece: chapterData.piece.masks.isOnTheGround && !chapterData.isSelected
});

if(chapterData.piece.masks.isSelecting        || 
    chapterData.piece.masks.isDeselecting     ||
    chapterData.piece.masks.isBeingDragged     ||
    (chapterData.piece.masks.isHighlighted && !chapterData.piece.masks.isUnhighlighting)) return false;

// if(chapterData.piece.masks.isOnTheGround && !chapterData.isSelected) 
// {
    BibleVizUtils.Functions.TryHideActivityNotificationOnPiece({piece: chapterData.piece})
// }
chapterData.piece.Highlight({chapterData});