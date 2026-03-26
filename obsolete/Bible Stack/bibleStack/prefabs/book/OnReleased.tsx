/**
    * Resets the properties of the book's tags when it is released.
    * @example
    * book.OnReleased();
*/

thisBot.tags.bookIndex = null;
thisBot.tags.bookName = null;
thisBot.tags.sectionName = null;
thisBot.tags.label = null;
thisBot.tags.labelColor = null;
thisBot.tags.labelOpacity = null;
thisBot.tags.numberOfChapters = null;
thisBot.tags.explodedViewPosition = null;
thisBot.tags.explodedViewCustomScale = null;
thisBot.tags.isGroupBook = null;
thisBot.tags.groupId = null;
thisBot.tags.groupBookIndex = null;
thisBot.tags.draggable = null;
thisBot.tags.layoutPositionX = null;
thisBot.tags.layoutPositionY = null;
thisBot.tags.desiredPositionZ = null;
thisBot.tags.scaleX = 1;
thisBot.tags.scaleY = 1;
thisBot.tags.scaleZ = 1;
thisBot.tags.initialScaleX = null;
thisBot.tags.initialScaleY = null;
thisBot.tags.initialScaleZ = null;
thisBot.tags.hoveredScaleX = null;
thisBot.tags.hoveredScaleY = null;
thisBot.tags.desiredScaleZ = null;
thisBot.tags.transformer = null;
thisBot.tags.color = null;
thisBot.tags.strokeColor = null;
thisBot.tags.orginalColor = null;
thisBot.tags.initialColor = null;
thisBot.tags.labelTextColor = null;
thisBot.tags.layoutBookDirectionNormalized = null;
thisBot.tags.bookInfo = null;
thisBot.tags.singleBooksScales = null;
thisBot.tags.toErase = false;
if(thisBot.tags.activityNotification)
{
    ObjectPooler.ReleaseObject({obj: links.activityNotification, tag: links.activityNotification.tags.poolTag})
    thisBot.tags.activityNotification = null;
}
