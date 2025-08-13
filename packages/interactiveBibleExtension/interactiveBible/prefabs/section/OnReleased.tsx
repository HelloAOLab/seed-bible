/**
    * Resets the properties of the section's tags when it is released.
    * @example
    * section.OnReleased();
*/

thisBot.tags.typeOfElement = null;
thisBot.tags.arrangementIndex = null;
thisBot.tags.testamentIndex = null;
thisBot.tags.sectionIndex = null;
thisBot.tags.sectionName = null;
thisBot.tags.amountOfChaptersInSection = null;
thisBot.tags.numberOfChapters = null;
thisBot.tags.bookInfo = null;
thisBot.tags.bookName = null;
thisBot.tags.scaleX = 1;
thisBot.tags.scaleY = 1;
thisBot.tags.scaleZ = 1;
thisBot.tags.initialScaleX = null;
thisBot.tags.initialScaleY = null;
thisBot.tags.hoveredScaleX = null;
thisBot.tags.hoveredScaleY = null;
thisBot.tags.initialScaleZ = null;
thisBot.tags.color = null;
thisBot.tags.orginalColor = null;
thisBot.tags.initialColor = null;
thisBot.tags.initialExplodedViewScaleZ = null;
thisBot.tags.desiredExplodedViewScaleZ = null;
thisBot.tags.labelOpacity = null;
thisBot.tags.formOpacity = null;
thisBot.tags.labelTextColor = null;
thisBot.tags.draggable = null;
thisBot.tags.desiredPositionZ = null;
thisBot.tags.desiredScaleZ = null;
thisBot.tags.sectionIndex = null;
thisBot.tags.toErase = false;
if(thisBot.tags.usersNotification)
{
    ObjectPooler.ReleaseObject({obj: links.usersNotification, tag: links.usersNotification.tags.poolTag})
    thisBot.tags.usersNotification = null;
}
