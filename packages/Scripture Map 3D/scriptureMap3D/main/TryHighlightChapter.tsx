const {chapterData} = that;

if(chapterData.piece.masks.isSelecting        || 
    chapterData.piece.masks.isDeselecting     ||
    chapterData.piece.masks.isBeingDragged     ||
    (chapterData.piece.masks.isHighlighted && !chapterData.piece.masks.isUnhighlighting)) return false;

if(chapterData.piece.masks.isOnTheGround && !chapterData.isSelected) 
{
    BibleVizUtis.Functions.TryHideUsersNotificationOnPiece({piece: chapterData.piece})
}
chapterData.piece.Highlight({chapterData});