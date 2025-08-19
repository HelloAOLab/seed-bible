const {chapterData} = that;

if(chapterData.element.masks.isSelecting        || 
    chapterData.element.masks.isDeselecting     ||
    chapterData.element.masks.isBeingDragged     ||
    (chapterData.element.masks.isHighlighted && !chapterData.element.masks.isUnhighlighting)) return false;

if(chapterData.element.masks.isOnTheGround && !chapterData.isSelected) 
{
    InstanceManager.TryHideUsersNotificationOnElement({element: chapterData.element})
}
chapterData.element.Highlight({chapterData});