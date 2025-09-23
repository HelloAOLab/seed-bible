/**
    * Resets the properties of the chapter's tags when it is released.
    * @example
    * chapter.OnReleased();
*/

thisBot.tags.toErase = false;
if(thisBot.tags.activityNotification)
{
    ObjectPooler.ReleaseObject({obj: links.activityNotification, tag: links.activityNotification.tags.poolTag})
    thisBot.tags.activityNotification = null;
}
BibleVizUtils.Functions.TryHideUsersColorOnPiece({piece: thisBot})